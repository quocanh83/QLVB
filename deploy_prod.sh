#!/bin/bash

# ==========================================================
# SCRIPT CẬP NHẬT HỆ THỐNG QLVB (Velzon V3)
# Dành cho môi trường Server Production (Gunicorn + Nginx)
# ==========================================================

# Ngắt script nếu có bất kỳ lệnh nào thất bại
set -e

# Cấu hình đường dẫn thư mục dự án
PROJECT_DIR="/home/qlvb"
LOG_FILE="$PROJECT_DIR/deploy_history.log"

echo "----------------------------------------------------------"
echo "🚀 BẮT ĐẦU QUÁ TRÌNH CẬP NHẬT HỆ THỐNG ($(date))"
echo "----------------------------------------------------------" | tee -a $LOG_FILE

# 1. Chuyển đến thư mục dự án
cd $PROJECT_DIR

# 2. Cập nhật mã nguồn từ GitHub
echo "=> 📥 Đang tải code mới nhất từ GitHub..."
git fetch origin
git reset --hard origin/master

# 3. Cấp quyền sở hữu thư mục (đảm bảo user qlvb có quyền ghi)
echo "=> 🔑 Đang kiểm tra quyền thư mục..."
sudo chown -R qlvb:qlvb $PROJECT_DIR

# 4. Cập nhật và Build Frontend V3 (Velzon React)
echo "=> 🚧 Đang xây dựng lại Frontend V3 (React)..."
cd $PROJECT_DIR/frontend-v3
# Cài đặt các thư viện mới (nếu có)
sudo -u qlvb npm install --legacy-peer-deps
# Build với giới hạn RAM để tránh treo server
sudo -u qlvb GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=1536" npm run build

# 5. Cập nhật Backend (Django)
echo "=> 🐍 Đang cập nhật Backend và Migrate Database..."
cd $PROJECT_DIR/backend
# Cập nhật Python dependencies (cho Avatar, Notifications, etc.)
sudo -u qlvb ./venv/bin/pip install -r requirements.txt
# Gom các file tĩnh (CSS/JS cho Django Admin)
sudo -u qlvb ./venv/bin/python manage.py collectstatic --noinput
# Đồng bộ hóa Cơ sở dữ liệu (Migrations)
sudo -u qlvb ./venv/bin/python manage.py migrate

# 6. Khởi động lại các dịch vụ (Restart Services)
echo "=> ♻️ Đang khởi động lại các dịch vụ hệ thống..."
sudo systemctl restart gunicorn_qlvb celery_qlvb nginx

echo "----------------------------------------------------------"
echo "✅ CẬP NHẬT HỆ THỐNG THÀNH CÔNG! ($(date))" | tee -a $LOG_FILE
echo "📍 Địa chỉ máy chủ: http://$(curl -s ifconfig.me)"
echo "----------------------------------------------------------"
