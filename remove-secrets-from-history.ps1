# Script to remove OpenAI API keys from git history
# WARNING: This rewrites git history. Make sure to backup first!

Write-Host "⚠️  WARNING: This will rewrite git history!" -ForegroundColor Yellow
Write-Host "Make sure you have a backup and coordinate with your team." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Type 'yes' to continue"

if ($confirm -ne 'yes') {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

# Check if git-filter-repo is available (better tool)
$hasFilterRepo = git filter-repo --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Using git-filter-repo (recommended)" -ForegroundColor Green
    
    # Remove secrets from specific files in history
    git filter-repo --path app/api/analyze-resume/route.ts --invert-paths --force
    git filter-repo --path app/api/generate-summary/route.ts --invert-paths --force
    git filter-repo --path app/components/InterviewManagement.tsx --invert-paths --force
    
    # Then restore files with correct content
    git checkout HEAD -- app/api/analyze-resume/route.ts
    git checkout HEAD -- app/api/generate-summary/route.ts
    git checkout HEAD -- app/components/InterviewManagement.tsx
    
    Write-Host "✅ History cleaned. Now you need to force push:" -ForegroundColor Green
    Write-Host "   git push origin --force --all" -ForegroundColor Yellow
} else {
    Write-Host "Using git filter-branch (fallback)" -ForegroundColor Yellow
    
    # Create a script to replace secrets with env variable
    $script = @'
#!/bin/sh
git ls-files | while read file; do
    if [ "$file" = "app/api/analyze-resume/route.ts" ] || 
       [ "$file" = "app/api/generate-summary/route.ts" ] || 
       [ "$file" = "app/components/InterviewManagement.tsx" ]; then
        sed -i "s/apiKey: ['\"][^'\"]*['\"]/apiKey: process.env.OPENAI_API_KEY/g" "$file"
        sed -i "s/OPENAI_API_KEY.*=.*['\"][^'\"]*['\"]/OPENAI_API_KEY = process.env.OPENAI_API_KEY/g" "$file"
    fi
done
'@
    
    $script | Out-File -FilePath "filter-script.sh" -Encoding utf8
    
    Write-Host "⚠️  git filter-branch is complex on Windows." -ForegroundColor Yellow
    Write-Host "Recommended: Install git-filter-repo or use BFG Repo Cleaner" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Use GitHub's secret scanning allow URL (temporary fix)" -ForegroundColor Cyan
    Write-Host "URL: https://github.com/ravirajcloudmate/Jobly-Ai-frontend-/security/secret-scanning/unblock-secret/36EPcjewXttTYLOAodhZ8m8OK61" -ForegroundColor Cyan
}

