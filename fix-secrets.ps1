# Fix GitHub Secret Scanning Error
# This script removes hardcoded OpenAI API keys from git history

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Removing Secrets from Git History" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repo
if (-not (Test-Path .git)) {
    Write-Host "❌ Not a git repository!" -ForegroundColor Red
    exit 1
}

# Create backup
Write-Host "Creating backup branch..." -ForegroundColor Green
$backupBranch = "backup-before-secret-cleanup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
git branch $backupBranch
Write-Host "✅ Backup created: $backupBranch" -ForegroundColor Green
Write-Host ""

# Method 1: Use git filter-branch to rewrite history
Write-Host "Removing secrets from git history..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

# Create a filter script that will run for each commit
$filterScript = @'
#!/bin/sh
git ls-files | while read file; do
    if [ "$file" = "app/api/analyze-resume/route.ts" ] || 
       [ "$file" = "app/api/generate-summary/route.ts" ] || 
       [ "$file" = "app/components/InterviewManagement.tsx" ]; then
        # Get the file content
        git show :"$file" | \
        sed -e "s/apiKey: process\.env\.OPENAI_API_KEY ||.*$/apiKey: process.env.OPENAI_API_KEY/g" \
            -e "s/apiKey: ['\"][^'\"]*['\"]/apiKey: process.env.OPENAI_API_KEY/g" \
            -e "s/sk-[a-zA-Z0-9]\{32,\}/process.env.OPENAI_API_KEY/g" \
            -e "s/OPENAI_API_KEY.*=.*['\"][^'\"]*['\"]/OPENAI_API_KEY = process.env.OPENAI_API_KEY/g" | \
        git hash-object -w --stdin | \
        xargs -I {} git update-index --cacheinfo $(git ls-tree "$GIT_COMMIT" "$file" | cut -d" " -f1 | cut -f1),$(git ls-tree "$GIT_COMMIT" "$file" | cut -d" " -f3),{} "$file"
    fi
done
'@

# Save filter script
$filterScript | Out-File -FilePath "filter-script.sh" -Encoding utf8 -NoNewline

Write-Host "Using git filter-branch to rewrite history..." -ForegroundColor Green

# Use git filter-branch with a simpler approach
# We'll use --tree-filter which is easier on Windows
git filter-branch --force --tree-filter @"
if [ -f app/api/analyze-resume/route.ts ]; then
    sed -i 's/apiKey: process\.env\.OPENAI_API_KEY ||.*$/apiKey: process.env.OPENAI_API_KEY/g' app/api/analyze-resume/route.ts
    sed -i 's/apiKey: ['\`"'][^'\`"]*['\`"]/apiKey: process.env.OPENAI_API_KEY/g' app/api/analyze-resume/route.ts
    sed -i 's/sk-[a-zA-Z0-9]\{32,\}/process.env.OPENAI_API_KEY/g' app/api/analyze-resume/route.ts
fi
if [ -f app/api/generate-summary/route.ts ]; then
    sed -i 's/apiKey: ['\`"'][^'\`"]*['\`"]/apiKey: process.env.OPENAI_API_KEY/g' app/api/generate-summary/route.ts
    sed -i 's/sk-[a-zA-Z0-9]\{32,\}/process.env.OPENAI_API_KEY/g' app/api/generate-summary/route.ts
fi
if [ -f app/components/InterviewManagement.tsx ]; then
    sed -i 's/apiKey: ['\`"'][^'\`"]*['\`"]/apiKey: process.env.OPENAI_API_KEY/g' app/components/InterviewManagement.tsx
    sed -i 's/sk-[a-zA-Z0-9]\{32,\}/process.env.OPENAI_API_KEY/g' app/components/InterviewManagement.tsx
fi
"@ --prune-empty --tag-name-filter cat -- --all

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ History rewritten successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Cleaning up..." -ForegroundColor Yellow
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Next Steps:" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Verify the fix:" -ForegroundColor White
    Write-Host "   git show HEAD:app/api/analyze-resume/route.ts | Select-String 'apiKey'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. Force push to GitHub:" -ForegroundColor White
    Write-Host "   git push origin --force --all" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  WARNING: Force push rewrites history!" -ForegroundColor Red
    Write-Host "   Make sure your team knows about this!" -ForegroundColor Red
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Error occurred. Restoring from backup..." -ForegroundColor Red
    git reset --hard $backupBranch
    Write-Host "✅ Restored from backup" -ForegroundColor Green
    Write-Host ""
    Write-Host "Alternative: Use the GitHub allow URL:" -ForegroundColor Yellow
    Write-Host "https://github.com/ravirajcloudmate/Jobly-Ai-frontend-/security/secret-scanning/unblock-secret/36EPcjewXttTYLOAodhZ8m8OK61" -ForegroundColor Cyan
}

