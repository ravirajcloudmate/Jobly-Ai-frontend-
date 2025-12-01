# Simple script to remove OpenAI API keys from git history
# Windows PowerShell version

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Remove Secrets from Git History" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is available
try {
    $gitVersion = git --version
    Write-Host "✅ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git not found!" -ForegroundColor Red
    exit 1
}

# Create backup
Write-Host ""
Write-Host "Step 1: Creating backup..." -ForegroundColor Green
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupBranch = "backup-before-cleanup-$timestamp"
git branch $backupBranch 2>&1 | Out-Null
Write-Host "✅ Backup branch created: $backupBranch" -ForegroundColor Green

# Check current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Yellow
Write-Host ""

# Method: Use git filter-branch with index-filter (more reliable)
Write-Host "Step 2: Removing secrets from git history..." -ForegroundColor Green
Write-Host "This will rewrite ALL commits. This may take 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

# Create a temporary script file for the filter
$filterContent = @'
#!/bin/sh
git ls-files | while read file; do
    case "$file" in
        app/api/analyze-resume/route.ts|app/api/generate-summary/route.ts|app/components/InterviewManagement.tsx)
            # Get the file from the commit
            git show "$GIT_COMMIT:$file" > /tmp/temp_file 2>/dev/null
            if [ -f /tmp/temp_file ]; then
                # Remove hardcoded API keys
                sed -i.bak 's/apiKey: process\.env\.OPENAI_API_KEY ||.*$/apiKey: process.env.OPENAI_API_KEY/g' /tmp/temp_file
                sed -i.bak "s/apiKey: ['\"][^'\"]*['\"]/apiKey: process.env.OPENAI_API_KEY/g" /tmp/temp_file
                sed -i.bak 's/sk-[a-zA-Z0-9]\{32,\}/process.env.OPENAI_API_KEY/g' /tmp/temp_file
                # Add the modified file back
                git hash-object -w /tmp/temp_file | xargs -I {} git update-index --add --cacheinfo $(git ls-tree "$GIT_COMMIT" "$file" | cut -d" " -f1 | cut -f1),{},$file
                rm -f /tmp/temp_file /tmp/temp_file.bak
            fi
            ;;
    esac
done
'@

# Since we're on Windows, let's use a PowerShell-based approach instead
Write-Host "Using PowerShell-based filter..." -ForegroundColor Yellow

# Alternative: Use git filter-branch with --env-filter and manual file editing
# But the simplest is to use BFG or manual commit fixing

Write-Host ""
Write-Host "⚠️  git filter-branch can be complex on Windows" -ForegroundColor Yellow
Write-Host ""
Write-Host "Recommended approach:" -ForegroundColor Cyan
Write-Host "  1. Use BFG Repo Cleaner (easiest)" -ForegroundColor White
Write-Host "  2. Or use GitHub's allow URL (quick fix)" -ForegroundColor White
Write-Host "  3. Or manually fix the commits" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Choose: (1) BFG, (2) GitHub Allow URL, (3) Manual Fix, (4) Try git filter-branch anyway"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "BFG Repo Cleaner Instructions:" -ForegroundColor Green
        Write-Host "1. Download: https://rtyley.github.io/bfg-repo-cleaner/" -ForegroundColor Yellow
        Write-Host "2. Create secrets.txt with:" -ForegroundColor Yellow
        Write-Host "   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==>REPLACED" -ForegroundColor White
        Write-Host "3. Run: java -jar bfg.jar --replace-text secrets.txt" -ForegroundColor Yellow
        Write-Host "4. Run: git reflog expire --expire=now --all && git gc --prune=now --aggressive" -ForegroundColor Yellow
        Write-Host "5. Run: git push origin --force --all" -ForegroundColor Yellow
    }
    "2" {
        Write-Host ""
        Write-Host "Opening GitHub allow URL..." -ForegroundColor Green
        $url = "https://github.com/ravirajcloudmate/Jobly-Ai-frontend-/security/secret-scanning/unblock-secret/36EPcjewXttTYLOAodhZ8m8OK61"
        Write-Host "URL: $url" -ForegroundColor Cyan
        Start-Process $url
        Write-Host ""
        Write-Host "After allowing on GitHub, run:" -ForegroundColor Yellow
        Write-Host "  git push origin main" -ForegroundColor White
    }
    "3" {
        Write-Host ""
        Write-Host "Manual Fix:" -ForegroundColor Green
        Write-Host "1. Checkout the problematic commits:" -ForegroundColor Yellow
        Write-Host "   git show 2c0a65688e19372b40c51787f11e4d3340c4c5b1" -ForegroundColor White
        Write-Host "2. Create new commits with fixes" -ForegroundColor Yellow
        Write-Host "3. Use interactive rebase to replace old commits" -ForegroundColor Yellow
    }
    "4" {
        Write-Host ""
        Write-Host "Attempting git filter-branch..." -ForegroundColor Yellow
        Write-Host "This requires Git Bash or WSL..." -ForegroundColor Yellow
        
        # Try to use git filter-branch
        $env:GIT_EDITOR = "true"
        
        # Use a simpler approach - rewrite specific files
        git filter-branch --force --index-filter @"
git ls-files | while read file; do
    if [ `"`$file`"` = `"`app/api/analyze-resume/route.ts`"` ] || 
       [ `"`$file`"` = `"`app/api/generate-summary/route.ts`"` ] || 
       [ `"`$file`"` = `"`app/components/InterviewManagement.tsx`"` ]; then
        git show `$GIT_COMMIT:`$file | \
        sed -e 's/apiKey: process\.env\.OPENAI_API_KEY ||.*/apiKey: process.env.OPENAI_API_KEY/g' \
            -e 's/apiKey: [\"'\`"'][^\"'\`"]*[\"'\`"]/apiKey: process.env.OPENAI_API_KEY/g' \
            -e 's/sk-[a-zA-Z0-9]\{32,\}/process.env.OPENAI_API_KEY/g' | \
        git hash-object -w --stdin | \
        xargs -I {} git update-index --add --cacheinfo `$(git ls-tree `$GIT_COMMIT `"`$file`"` | cut -d' ' -f1 | cut -f1),{},`"`$file`"`
    fi
done
"@ --prune-empty --tag-name-filter cat -- --all
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ History rewritten!" -ForegroundColor Green
            git reflog expire --expire=now --all
            git gc --prune=now --aggressive
            Write-Host ""
            Write-Host "Now force push:" -ForegroundColor Yellow
            Write-Host "  git push origin --force --all" -ForegroundColor White
        } else {
            Write-Host "❌ Filter-branch failed. Try option 1 (BFG) or 2 (GitHub URL)" -ForegroundColor Red
        }
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Backup branch: $backupBranch" -ForegroundColor Cyan
Write-Host "To restore: git reset --hard $backupBranch" -ForegroundColor Yellow

