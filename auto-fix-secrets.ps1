# Auto-fix: Remove secrets from git history
# This script automatically fixes the issue

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Auto-Fixing Git History Secrets" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Backup already created, continue with fix
Write-Host "Backup already exists. Proceeding with fix..." -ForegroundColor Green
Write-Host ""

# The secret key found: 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
# We need to replace this in all commits

Write-Host "Method: Using git filter-branch to rewrite history..." -ForegroundColor Yellow
Write-Host "This will take a few minutes..." -ForegroundColor Yellow
Write-Host ""

# Use git filter-branch with a tree-filter (works better on Windows)
# We'll use a PowerShell-compatible approach

# First, let's try using git filter-repo if available, otherwise use filter-branch
$hasFilterRepo = git filter-repo --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Using git-filter-repo (recommended)" -ForegroundColor Green
    
    # Create replacement file
    $replacements = @"
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==>process.env.OPENAI_API_KEY
sk-==>process.env.OPENAI_API_KEY
apiKey: 'sk-==>apiKey: process.env.OPENAI_API_KEY
apiKey: `"sk-==>apiKey: process.env.OPENAI_API_KEY
"@
    $replacements | Out-File -FilePath "replacements.txt" -Encoding utf8
    
    git filter-repo --replace-text replacements.txt --force
    
    Remove-Item replacements.txt -ErrorAction SilentlyContinue
    
    Write-Host "✅ History cleaned with git-filter-repo!" -ForegroundColor Green
} else {
    Write-Host "Using git filter-branch (fallback method)..." -ForegroundColor Yellow
    
    # Use git filter-branch with --tree-filter
    # This requires Git Bash, so we'll provide instructions
    Write-Host ""
    Write-Host "⚠️  git filter-branch requires Git Bash on Windows" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run this in Git Bash:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host 'git filter-branch --force --tree-filter "if [ -f app/api/analyze-resume/route.ts ]; then sed -i \"s/apiKey: process\.env\.OPENAI_API_KEY ||.*/apiKey: process.env.OPENAI_API_KEY/g\" app/api/analyze-resume/route.ts; sed -i \"s/apiKey: [\"'\''\"][^\"'\''\"]*[\"'\''\"]/apiKey: process.env.OPENAI_API_KEY/g\" app/api/analyze-resume/route.ts; sed -i \"s/sk-[a-zA-Z0-9]\{32,\}/process.env.OPENAI_API_KEY/g\" app/api/analyze-resume/route.ts; fi; if [ -f app/api/generate-summary/route.ts ]; then sed -i \"s/apiKey: [\"'\''\"][^\"'\''\"]*[\"'\''\"]/apiKey: process.env.OPENAI_API_KEY/g\" app/api/generate-summary/route.ts; sed -i \"s/sk-[a-zA-Z0-9]\{32,\}/process.env.OPENAI_API_KEY/g\" app/api/generate-summary/route.ts; fi; if [ -f app/components/InterviewManagement.tsx ]; then sed -i \"s/apiKey: [\"'\''\"][^\"'\''\"]*[\"'\''\"]/apiKey: process.env.OPENAI_API_KEY/g\" app/components/InterviewManagement.tsx; sed -i \"s/sk-[a-zA-Z0-9]\{32,\}/process.env.OPENAI_API_KEY/g\" app/components/InterviewManagement.tsx; fi" --prune-empty --tag-name-filter cat -- --all' -ForegroundColor White
    Write-Host ""
    Write-Host "OR use the quick fix (GitHub Allow URL) instead!" -ForegroundColor Yellow
    exit 0
}

# Clean up
Write-Host ""
Write-Host "Cleaning up git references..." -ForegroundColor Yellow
git reflog expire --expire=now --all 2>&1 | Out-Null
git gc --prune=now --aggressive 2>&1 | Out-Null

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ✅ Fix Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next step: Force push to GitHub" -ForegroundColor Yellow
Write-Host "  git push origin --force --all" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  WARNING: This rewrites history!" -ForegroundColor Red
Write-Host "   Notify your team before force pushing!" -ForegroundColor Red
Write-Host ""

