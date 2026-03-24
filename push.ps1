$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   TOOL TỰ ĐỘNG ĐẨY MÃ NGUỒN VÀ TĂNG VERSION QLVB" 
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Đang tự động tăng phiên bản..." -ForegroundColor Yellow
Set-Location -Path "frontend"
npm version patch
Set-Location -Path ".."

Write-Host "`n[2/3] Đang đọc phiên bản mới nhất..." -ForegroundColor Yellow
$NEW_VERSION = node -p "require('./frontend/package.json').version"
Write-Host "- Phiên bản mới của dự án là: v$NEW_VERSION" -ForegroundColor Green

Write-Host "`n[3/3] Đang đẩy mã nguồn lên GitHub..." -ForegroundColor Yellow
git add .
git commit -m "chore: phát hành bản v$NEW_VERSION tự động từ local"
git push origin master

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "HOÀN TẤT! MÃ NGUỒN V$NEW_VERSION ĐÃ NẰM TRÊN GITHUB." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Bây giờ bạn hãy vào phần Cài đặt trên Web (với tư cách Admin)"
Write-Host "Và bấm nút 'Bắt đầu Cập nhật' để server thực thi việc tải code."
Write-Host ""
