#!/bin/bash

# ==========================================================
# SCRIPT NÂNG CẤP TỰ ĐỘNG QLVB V1.0 -> V3.0 (VELZON)
# CHỈ DÀNH CHO MÁY CHỦ ĐÃ CÀI ĐẶT BẢN CŨ
# ==========================================================

set -e

PROJECT_DIR="/home/qlvb"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_V3_DIR="$PROJECT_DIR/frontend-v3"
NGINX_CONF="/etc/nginx/sites-available/qlvb"

echo "🚀 BẮT ĐẦU QUÁ TRÌNH NÂNG CẤP LÊN PHIÊN BẢN V3.0..."

# 1. Kéo mã nguồn mới nhất từ GitHub
echo "=> [1/5] Đang cập nhật mã nguồn từ GitHub..."
cd $PROJECT_DIR
git fetch origin master
git reset --hard origin/master

# 2. Cập nhật Backend
echo "=> [2/5] Đang cập nhật Backend Django..."
cd $BACKEND_DIR
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
deactivate

# 3. Build Frontend V3 mới
echo "=> [3/5] Đang tiến hành Build Frontend V3 (Velzon)..."
cd $FRONTEND_V3_DIR
# Xoá node_modules cũ nếu có để tránh xung đột
# rm -rf node_modules 
npm install --legacy-peer-deps
NODE_OPTIONS="--max-old-space-size=4096" npm run build
echo "✅ Build Frontend V3 hoàn tất tại $FRONTEND_V3_DIR/build"

# 4. Cập nhật cấu hình Nginx (Đổi root sang frontend-v3)
echo "=> [4/5] Đang cập nhật cấu hình Nginx..."
if [ -f "$NGINX_CONF" ]; then
    # Thay thế đường dẫn root cũ /frontend/dist thành /frontend-v3/build
    sudo sed -i 's|frontend/dist|frontend-v3/build|g' $NGINX_CONF
    # Đảm bảo index là index.html (Velzon build ra index.html)
    sudo sed -i 's/index index.html index.htm;/index index.html;/g' $NGINX_CONF
    
    sudo nginx -t && sudo systemctl restart nginx
    echo "✅ Đã cập nhật Nginx trỏ vào thư mục V3."
else
    echo "❌ Không tìm thấy file cấu hình Nginx tại $NGINX_CONF. Vui lòng kiểm tra thủ công."
fi

# 5. Khởi động lại các Service
echo "=> [5/5] Đang khởi động lại Gunicorn & Celery..."
sudo systemctl restart qlvb_gunicorn qlvb_celery

echo "=========================================================="
echo "🎉 CHÚC MỪNG! HỆ THỐNG ĐÃ ĐƯỢC NÂNG CẤP LÊN V3.0 THÀNH CÔNG."
echo "📍 Hãy truy cập địa chỉ Web của bạn và bấm Ctrl+F5 để thấy giao diện mới."
echo "=========================================================="
