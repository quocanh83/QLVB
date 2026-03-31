$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   QLVB V3.0 - DEPLOY TO GITHUB (Velzon Edition)" 
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# [1/4] Tăng số hiệu phiên bản & Build
Write-Host "[1/4] Tang so hieu phien ban frontend-v3 & Build..." -ForegroundColor Yellow
Set-Location -Path "frontend-v3"

# Tăng version
Write-Host "=> Dang cap nhat version..." -ForegroundColor Gray
npm version patch --no-git-tag-version

# Xóa build cũ
if (Test-Path "build") { 
    Write-Host "=> Dang xoa thu muc build cu..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "build" 
}

# Thiết lập môi trường build tối ưu
$env:GENERATE_SOURCEMAP="false"
# REACT_APP_API_URL is now managed automatically by .env.production
# Tăng memory cho node nếu cần
$env:NODE_OPTIONS="--max-old-space-size=4096"

Write-Host "=> Dang build ban Production (Vui long cho)..." -ForegroundColor Gray
npm run build

Set-Location -Path ".."

# [2/4] Đọc phiên bản mới
Write-Host "`n[2/4] Doc phien ban moi nhat..." -ForegroundColor Yellow
$PACKAGE_JSON = Get-Content -Raw -Path "frontend-v3/package.json" | ConvertFrom-Json
$NEW_VERSION = $PACKAGE_JSON.version
Write-Host "- Phien ban moi: v$NEW_VERSION" -ForegroundColor Green

# [3/4] Commit thay đổi
Write-Host "`n[3/4] Dang chuan bi commit..." -ForegroundColor Yellow

# Add toàn bộ thay đổi
git add .

# BẢO MẬT: Loại bỏ các file keys.json khỏi staging nếu lỡ bị add (dù đã có .gitignore)
Write-Host "=> Kiem tra bao mat: Loai bo file credentials..." -ForegroundColor Gray
git reset -- *keys.json 2>$null
git reset -- test_import.xlsx 2>$null

# Force add thư mục build (vì thường bị gitignore)
Write-Host "=> Dong bo thu muc build..." -ForegroundColor Gray
git add -f frontend-v3/build

# Commit
git commit -m "release(v3): phat hanh ban v$NEW_VERSION - Velzon Migration"

# [4/4] Push lên GitHub
Write-Host "`n[4/4] Day len GitHub (master)..." -ForegroundColor Yellow
git push origin master

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "HOAN TAT! QLVB V$NEW_VERSION DA LEN GITHUB." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Buoc tiep theo tren Server:"
Write-Host "  1. SSH vao server tài khoản qlvb"
Write-Host "  2. cd /home/qlvb"
Write-Host "  3. git pull origin master"
Write-Host "  4. Chay: sudo ./update_v3.sh"
Write-Host ""
