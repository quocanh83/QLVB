$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   QLVB V3.0 - DEPLOY TO GITHUB (Velzon Edition)" 
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Tang so hieu phien ban frontend-v3 & Build..." -ForegroundColor Yellow
Set-Location -Path "frontend-v3"
npm version patch --no-git-tag-version
Write-Host "=> Dang build ban Production tai máy Local (Toc do cao)..." -ForegroundColor Gray
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
$env:GENERATE_SOURCEMAP="false"
$env:REACT_APP_API_URL=""
npm run build
Set-Location -Path ".."

Write-Host "`n[2/4] Doc phien ban moi nhat..." -ForegroundColor Yellow
$NEW_VERSION = node -p "require('./frontend-v3/package.json').version"
Write-Host "- Phien ban moi: v$NEW_VERSION" -ForegroundColor Green

Write-Host "`n[3/4] Dang commit toan bo thay doi..." -ForegroundColor Yellow
git add .
git commit -m "release(v3): phat hanh ban v$NEW_VERSION - Velzon Migration"

Write-Host "`n[4/4] Day len GitHub (master)..." -ForegroundColor Yellow
git push origin master

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "HOAN TAT! QLVB V$NEW_VERSION DA LEN GITHUB." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Buoc tiep theo:"
Write-Host "  1. SSH vao server va chay: git pull origin master"
Write-Host "  2. Hoac vao /settings tren web va bam 'Cap nhat He thong'"
Write-Host ""
