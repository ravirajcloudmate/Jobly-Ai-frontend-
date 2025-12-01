# Simple script to remove OpenAI API keys from git history
# This uses git filter-branch which is built into git

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Remove Secrets from Git History" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will rewrite ALL git history!" -ForegroundColor Yellow
Write-Host "⚠️  Make sure you have a backup!" -ForegroundColor Yellow
Write-Host "⚠️  Coordinate with your team before force pushing!" -ForegroundColor Yellow
Write-Host ""
Write-Host "This will:" -ForegroundColor White
Write-Host "  1. Remove any hardcoded OpenAI API keys from history" -ForegroundColor White
Write-Host "  2. Replace them with process.env.OPENAI_API_KEY" -ForegroundColor White
Write-Host "  3. Rewrite all commits" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Type 'YES' to continue (must be uppercase)"

if ($confirm -ne 'YES') {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Creating backup branch..." -ForegroundColor Green
git branch backup-before-cleanup
Write-Host "✅ Backup created: backup-before-cleanup" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Removing secrets from history..." -ForegroundColor Green
Write-Host "This may take a few minutes..." -ForegroundColor Yellow

# Use git filter-branch to replace secrets
# This replaces any OpenAI API key pattern with the env variable
git filter-branch --force --index-filter @"
git ls-files -s | sed 's/\t/&/' | 
while read mode hash stage path; do
    if [ `"`$path`"` = `"`app/api/analyze-resume/route.ts`"` ] || 
       [ `"`$path`"` = `"`app/api/generate-summary/route.ts`"` ] || 
       [ `"`$path`"` = `"`app/components/InterviewManagement.tsx`"` ]; then
        echo `"`Processing `$path`"`"
        git show `$hash`:`$path` | 
        sed -e `"`s/apiKey: ['\`"][^'\`"]*['\`"]/apiKey: process.env.OPENAI_API_KEY/g`"` \
            -e `"`s/OPENAI_API_KEY.*=.*['\`"][^'\`"]*['\`"]/OPENAI_API_KEY = process.env.OPENAI_API_KEY/g`"` \
            -e `"`s/sk-[a-zA-Z0-9]\{32,\}/process.env.OPENAI_API_KEY/g`"` | 
        git hash-object -w --stdin | 
        xargs -I {} git update-index --add --cacheinfo `$mode` {} `$path`
    fi
done
"@ --prune-empty --tag-name-filter cat -- --all

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ History cleaned successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 3: Cleaning up..." -ForegroundColor Green
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Next Steps:" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Verify the changes:" -ForegroundColor White
    Write-Host "   git log --all -- app/api/analyze-resume/route.ts" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. If everything looks good, force push:" -ForegroundColor White
    Write-Host "   git push origin --force --all" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. If something went wrong, restore from backup:" -ForegroundColor White
    Write-Host "   git reset --hard backup-before-cleanup" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Error occurred. Restoring from backup..." -ForegroundColor Red
    git reset --hard backup-before-cleanup
    Write-Host "✅ Restored from backup" -ForegroundColor Green
}

