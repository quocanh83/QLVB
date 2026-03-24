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

# 1. Tải code mới nhất (Bỏ qua mọi lỗi từ file nháp)
echo "=> 📥 Đang tải code mới nhất từ GitHub..."
git fetch origin
git reset --hard origin/master

echo "=> 🔑 Cấp quyền sở hữu thư mục cho qlvb..."
sudo chown -R qlvb:qlvb $PROJECT_DIR

# 2. Cập nhật và Build Frontend (Chạy dưới tư cách user qlvb)
echo "=> 🚧 Đang xây dựng lại Frontend..."
cd $PROJECT_DIR/frontend
sudo -u qlvb npm install
sudo -u qlvb npm run build

# 3. Cập nhật Backend (Chạy dưới tư cách user qlvb)
echo "=> 🐍 Đang cập nhật Backend và Migrate Database..."
cd $PROJECT_DIR/backend
sudo -u qlvb ./venv/bin/pip install -r requirements.txt
sudo -u qlvb ./venv/bin/python manage.py collectstatic --noinput
sudo -u qlvb ./venv/bin/python manage.py migrate

# 4. Khởi động lại các dịch vụ
echo "=> ♻️ Đang khởi động lại các dịch vụ (Gunicorn, Celery, Nginx)..."
sudo systemctl restart gunicorn_qlvb celery_qlvb nginx

echo "=========================================================="
echo "✨ CẬP NHẬT HỆ THỐNG THÀNH CÔNG!"
echo "📍 Truy cập tại: http://$(curl -s ifconfig.me) hoặc Domain của bạn"
echo "=========================================================="
