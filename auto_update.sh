#!/bin/bash
# ==============================================================================
# SCRIPT TỰ ĐỘNG CẬP NHẬT MÃ NGUỒN VÀ KHỞI ĐỘNG LẠI QLVB
# Dùng cho tính năng Cập nhật qua Web
# ==============================================================================

PROJECT_DIR="/home/qlvb"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend-v3"
LOG_FILE="$PROJECT_DIR/update_system.log"

echo "===================================================" > $LOG_FILE
echo "BẮT ĐẦU CẬP NHẬT LÚC: $(date)" >> $LOG_FILE
echo "===================================================" >> $LOG_FILE

cd $PROJECT_DIR

echo "[1/4] Kéo mã nguồn mới từ Git..." >> $LOG_FILE
git pull origin master >> $LOG_FILE 2>&1

echo "[2/4] Cập nhật Backend (Python & DB)..." >> $LOG_FILE
cd $BACKEND_DIR
./venv/bin/pip install -r requirements.txt >> $LOG_FILE 2>&1
./venv/bin/python manage.py migrate >> $LOG_FILE 2>&1
./venv/bin/python manage.py collectstatic --noinput >> $LOG_FILE 2>&1

echo "[3/4] Cập nhật Frontend (Node JS)..." >> $LOG_FILE
cd $FRONTEND_DIR
# Yêu cầu Node >= 18 trên máy chủ để build Vite 5
npm install >> $LOG_FILE 2>&1
npm run build >> $LOG_FILE 2>&1

echo "[4/4] Khởi động lại dịch vụ..." >> $LOG_FILE
sudo systemctl restart gunicorn_qlvb >> $LOG_FILE 2>&1

echo "===================================================" >> $LOG_FILE
echo "HOÀN TẤT CẬP NHẬT LÚC: $(date)" >> $LOG_FILE
