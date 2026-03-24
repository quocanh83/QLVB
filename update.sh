#!/bin/bash

# ==========================================================
# BASH SCRIPT UPDATE: CẬP NHẬT HỆ THỐNG QLVB TỪ GITHUB
# DÀNH CHO BARE-METAL (NGINX + GUNICORN + SYSTEMD)
# ==========================================================

set -e

PROJECT_DIR="/home/qlvb"

echo "🚀 BẮT ĐẦU QUÁ TRÌNH CẬP NHẬT HỆ THỐNG..."

# Chuyển đến thư mục dự án
cd $PROJECT_DIR

# 1. Pull code mới nhất
echo "=> 📥 Đang tải code mới nhất từ GitHub..."
git pull origin master

echo "=> 🔑 Cấp quyền sở hữu thư mục cho qlvb..."
sudo chown -R qlvb:qlvb $PROJECT_DIR

# 2. Cập nhật và Build Frontend
echo "=> 🚧 Đang xây dựng lại Frontend..."
cd $PROJECT_DIR/frontend
npm install
npm run build

# 3. Cập nhật Backend
echo "=> 🐍 Đang cập nhật Backend và Migrate Database..."
cd $PROJECT_DIR/backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
deactivate

# 4. Khởi động lại các dịch vụ
echo "=> ♻️ Đang khởi động lại các dịch vụ (Gunicorn, Celery, Nginx)..."
sudo systemctl restart gunicorn_qlvb celery_qlvb nginx

echo "=========================================================="
echo "✨ CẬP NHẬT HỆ THỐNG THÀNH CÔNG!"
echo "📍 Truy cập tại: http://$(curl -s ifconfig.me) hoặc Domain của bạn"
echo "=========================================================="
