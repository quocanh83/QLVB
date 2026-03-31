#!/bin/bash

# ==========================================================
# SCRIPT CẬP NHẬT QLVB V3 (ĐỒNG NHẤT & HIỆU NĂNG)
# Dùng cho: Máy chủ Bare-metal (Ubuntu/Debian)
# ==========================================================

set -e

PROJECT_DIR="/home/qlvb"
USER_NAME="qlvb"

echo "----------------------------------------------------------"
echo "🚀 BẮT ĐẦU QUÁ TRÌNH CẬP NHẬT HỆ THỐNG V3.0 ($(date))"
echo "----------------------------------------------------------"

# 1. Chuyển đến thư mục dự án
cd $PROJECT_DIR

# 2. Cập nhật mã nguồn từ GitHub
echo "=> 📥 Đang kéo mã nguồn mới nhất..."
git fetch --all
git reset --hard origin/master

# 3. Bảo vệ file keys.json (Nếu đổi tên từ google_keys.json)
if [ -f "$PROJECT_DIR/backend/google_keys.json" ] && [ ! -f "$PROJECT_DIR/backend/keys.json" ]; then
    echo "=> 🔑 Tự động đổi tên google_keys.json thành keys.json..."
    mv "$PROJECT_DIR/backend/google_keys.json" "$PROJECT_DIR/backend/keys.json"
fi

# 4. Sử dụng Frontend V3 đã Build sẵn (Được đẩy lên từ máy cá nhân)
echo "=> 🚧 Đang cập nhật quyền cho thư mục Frontend Build..."
cd $PROJECT_DIR/frontend-v3
# Không chạy build trên server để tránh lỗi RAM (Out of Memory)
# sudo -u $USER_NAME npm install --legacy-peer-deps
# sudo -u $USER_NAME GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=1536" npm run build
sudo chmod -R 755 build

# 5. Cập nhật Backend
echo "=> 🐍 Đang cập nhật Python Packages & Database..."
cd $PROJECT_DIR/backend
sudo -u $USER_NAME ./venv/bin/pip install -r requirements.txt
sudo -u $USER_NAME ./venv/bin/python manage.py migrate
sudo -u $USER_NAME ./venv/bin/python manage.py collectstatic --noinput

# 6. Khởi động lại toàn bộ dịch vụ (Theo chuẩn chuẩn hóa ở reset_services.sh)
echo "=> ♻️ Đang khởi động lại dịch vụ (Gunicorn, Celery, Nginx)..."
sudo systemctl restart gunicorn_qlvb celery_qlvb nginx

echo "----------------------------------------------------------"
echo "✅ HỆ THỐNG ĐÃ ĐƯỢC CẬP NHẬT VÀ ĐỒNG NHẤT THÀNH CÔNG!"
echo "📍 Kiểm tra trạng thái: sudo systemctl status gunicorn_qlvb"
echo "=========================================================="
