# Script khởi động tự động Hệ thống QLVB (Backend + Frontend)

# 1. Khởi động Backend Django trong cửa sổ mới
Write-Host "Đang khởi động Backend Django..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; & .\venv\Scripts\Activate.ps1; python manage.py runserver"

# 2. Khởi động Frontend React trong cửa sổ mới
Write-Host "Đang khởi động Frontend React..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend-v3; npm start"

Write-Host "`n[Hệ thống] Đang khởi tạo... Vui lòng kiểm tra 2 cửa sổ mới mở!" -ForegroundColor Yellow
Write-Host "Backend: http://127.0.0.1:8000"
Write-Host "Frontend: http://localhost:3000"
