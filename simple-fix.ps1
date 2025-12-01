# Simple Fix for GitHub Secret Scanning
# This script helps you remove secrets from git history

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  GitHub Secret Scanning Fix" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check current status
Write-Host "Checking current code..." -ForegroundColor Green
$analyzeResume = Get-Content "app/api/analyze-resume/route.ts" -Raw
$generateSummary = Get-Content "app/api/generate-summary/route.ts" -Raw

if ($analyzeResume -match "process\.env\.OPENAI_API_KEY" -and $generateSummary -match "process\.env\.OPENAI_API_KEY") {
    Write-Host "✅ Current code is safe - using environment variables" -ForegroundColor Green
} else {
    Write-Host "❌ Found hardcoded keys in current code!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "The issue: Secrets are in git history from old commits" -ForegroundColor Yellow
Write-Host ""
Write-Host "Choose an option:" -ForegroundColor White
Write-Host "  1. Quick fix - Use GitHub's allow URL (fastest)" -ForegroundColor Cyan
Write-Host "  2. Clean history - Remove secrets from all commits (recommended)" -ForegroundColor Cyan
Write-Host "  3. Exit" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Enter choice (1, 2, or 3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Opening GitHub allow URL..." -ForegroundColor Green
        Write-Host "URL: https://github.com/ravirajcloudmate/Jobly-Ai-frontend-/security/secret-scanning/unblock-secret/36EPcjewXttTYLOAodhZ8m8OK61" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "After allowing, run: git push origin main" -ForegroundColor Yellow
        Start-Process "https://github.com/ravirajcloudmate/Jobly-Ai-frontend-/security/secret-scanning/unblock-secret/36EPcjewXttTYLOAodhZ8m8OK61"
    }
    "2" {
        Write-Host ""
        Write-Host "⚠️  This will rewrite git history!" -ForegroundColor Yellow
        Write-Host "⚠️  Make sure you have a backup!" -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Type 'yes' to continue"
        
        if ($confirm -eq 'yes') {
            Write-Host ""
            Write-Host "Creating backup branch..." -ForegroundColor Green
            git branch backup-before-cleanup-$(Get-Date -Format "yyyyMMdd-HHmmss")
            
            Write-Host ""
            Write-Host "Recommended: Use BFG Repo Cleaner for best results" -ForegroundColor Yellow
            Write-Host "Download: https://rtyley.github.io/bfg-repo-cleaner/" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Or use git filter-branch (see QUICK_FIX.md for instructions)" -ForegroundColor Yellow
        }
    }
    "3" {
        Write-Host "Exiting..." -ForegroundColor Green
        exit 0
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
        exit 1
    }
}

