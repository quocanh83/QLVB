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

# 3. Xử lý Frontend V3
echo "=> [3/5] Đang kiểm tra Frontend V3..."
cd $FRONTEND_V3_DIR

if [ -d "build" ] && [ "$(ls -A build)" ]; then
    echo "✅ Đã tìm thấy bản build sẵn từ Git. Bỏ qua bước build trên server để tiết kiệm thời gian."
else
    echo "⚠️ Không tìm thấy bản build sẵn. Tiến hành Build trên server (Sẽ chậm)..."
    npm install --legacy-peer-deps
    GENERATE_SOURCEMAP=false NODE_OPTIONS="--max-old-space-size=1536" npm run build
fi
echo "✅ Frontend V3 đã sẵn sàng tại $FRONTEND_V3_DIR/build"

# 4. Cấu hình Nginx (Ép root sang frontend-v3/build)
echo "=> [4/5] Đang cập nhật cấu hình Nginx..."
if [ -f "$NGINX_CONF" ]; then
    # 1. Chắc chắn đường dẫn Root chính xác
    sudo sed -i "s|root .*|root /home/qlvb/frontend-v3/build;|g" $NGINX_CONF
    # 2. Xóa các block cũ gây xung đột static nếu có
    sudo sed -i '/location \/static\/ {/,/}/d' $NGINX_CONF
    # Cấm cache index.html để sửa dứt điểm lỗi 404
    if ! grep -q "location = /index.html" "$NGINX_CONF"; then
        sudo sed -i '/location \/ {/i \    location = /index.html {\n        add_header Cache-Control "no-cache, no-store, must-revalidate";\n        add_header Pragma "no-cache";\n        add_header Expires 0;\n        try_files $uri /index.html;\n    }\n' $NGINX_CONF
    fi
    # 3. Đảm bảo index là index.html
    sudo sed -i 's/index index.html index.htm;/index index.html;/g' $NGINX_CONF
    
    sudo nginx -t && sudo systemctl restart nginx
    echo "✅ Nginx đã được cập nhật và khởi động lại."
else
    echo "❌ Không tìm thấy file cấu hình Nginx tại $NGINX_CONF."
fi

# 5. Khởi động lại các Service
echo "=> [5/5] Đang khởi động lại Gunicorn & Celery..."
sudo systemctl restart gunicorn_qlvb celery_qlvb

echo "=========================================================="
echo "🎉 CHÚC MỪNG! HỆ THỐNG ĐÃ ĐƯỢC NÂNG CẤP LÊN V3.0 THÀNH CÔNG."
echo "📍 Hãy truy cập địa chỉ Web của bạn và bấm Ctrl+F5 để thấy giao diện mới."
echo "=========================================================="
