param(
  [string]$RemoteUrl = 'https://github.com/<your-username>/<repo-name>.git',
  [string]$Branch = 'main',
  [switch]$CreateGhPages
)

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error 'Git is not installed. Install Git for Windows first: https://git-scm.com/download/win'
  exit 1
}

Set-Location $PSScriptRoot

if (-not (Test-Path '.git')) {
  git init
  git branch -M $Branch
}

git add .
try {
  git commit -m 'Initial Nanded branch inventory site with GitHub Pages support' -q
} catch {
  Write-Host 'No changes to commit or commit already exists.'
}

git remote remove origin 2>$null
if ($RemoteUrl -eq 'https://github.com/<your-username>/<repo-name>.git') {
  Write-Host 'Please update the RemoteUrl parameter with your GitHub repository URL.'
  exit 1
}
git remote add origin $RemoteUrl
git push -u origin $Branch

if ($CreateGhPages) {
  git checkout -b gh-pages
  git push -u origin gh-pages
  git checkout $Branch
}

Write-Host 'Deployment script complete. Enable GitHub Pages in your repository settings.'
