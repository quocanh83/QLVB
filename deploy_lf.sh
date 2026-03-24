#!/bin/bash

# ==========================================================
# BASH SCRIPT DEPLOY: BARE-METAL UBUNTU 24.04 CHO HỆ THỐNG QLVB
# KHÔNG DÙNG DOCKER - THUẦN SYSTEMD + NGINX + GUNICORN
# ==========================================================

# Dừng cờ lỗi nếu có bất kỳ lệnh nào fail
set -e

# Đặt biến môi trường
PROJECT_DIR="/var/www/html/qlvb"
USER_NAME=$USER # Tên user hiện tại đang chạy lệnh Ubuntu
DOMAIN_OR_IP="_" # Thay bằng tên miền nếu có

echo "🚀 BẮT ĐẦU QUÁ TRÌNH DEPLOY HỆ THỐNG QLVB LÊN BARE-METAL..."

# 1. CÀI ĐẶT CÁC DEPENDENCIES HỆ THỐNG
echo "=> Cập nhật Mirror và Cài đặt Nginx, PostgreSQL, Python, Redis..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx postgresql postgresql-contrib python3-venv python3-dev libpq-dev build-essential redis-server

# Cài đặt Node.js V20
echo "=> Cài đặt Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. KHỞI TẠO THƯ MỤC DỰ ÁN (Giả sử bạn đã Git Clone vào đây)
echo "=> Tạo phân vùng thư mục Dự án tại $PROJECT_DIR..."
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER_NAME:$USER_NAME $PROJECT_DIR

echo "⚠️ LƯU Ý: Vui lòng đảm bảo Source Code đã được Copy/Clone vào $PROJECT_DIR trước khi chạy tiếp."
echo "Đang đợi 5 giây tiếp theo..."
sleep 5

# 3. BUILD FRONTEND (React / Vite)
echo "=> 🚧 Tiến hành quét NPM và Build Frontend..."
cd $PROJECT_DIR/frontend
npm install
npm run build

echo "✅ Frontend đã build xong. Khối tĩnh nằm tại $PROJECT_DIR/frontend/dist"

# 4. CHUẨN BỊ MÔI TRƯỜNG BACKEND (Django)
echo "=> 🐍 Thiết lập Virtual Environment và cài Gói Python..."
cd $PROJECT_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn # Cài Gunicorn làm WSGI Server

echo "=> Dọn dẹp File Tĩnh và Migrate Database..."
if [ ! -f .env ]; then
    echo "=> 📝 Khởi tạo file .env từ .env.example..."
    cp .env.example .env
    echo "⚠️ LƯU Ý: Đã tạo file .env mặc định. Hãy chỉnh sửa file này sau nếu cần cấu hình PostgreSQL hoặc AI Keys."
fi
python manage.py collectstatic --noinput
python manage.py makemigrations
python manage.py migrate

# Giải phóng RAM cho tiến trình sau
deactivate

# 5. CẤU HÌNH SYSTEMD SERVICES
echo "=> ⚙️ Thiết lập Services tự khởi động cùng OS cho Gunicorn & Celery..."

# TẠO SERVICE: GUNICORN
sudo bash -c "cat > /etc/systemd/system/qlvb_gunicorn.service <<EOF
[Unit]
Description=Gunicorn daemon for QLVB Django Application
Requires=qlvb_gunicorn.socket
After=network.target

[Service]
User=$USER_NAME
Group=www-data
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=$PROJECT_DIR/backend/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind 127.0.0.1:8000 \
          config.wsgi:application

[Install]
WantedBy=multi-user.target
EOF"

# TẠO SERVICE: CELERY (Background NLP/AI Worker)
sudo bash -c "cat > /etc/systemd/system/qlvb_celery.service <<EOF
[Unit]
Description=Celery Worker Service for QLVB
After=network.target redis-server.service

[Service]
Type=simple
User=$USER_NAME
Group=www-data
WorkingDirectory=$PROJECT_DIR/backend
Environment=\"PATH=$PROJECT_DIR/backend/venv/bin\"
ExecStart=$PROJECT_DIR/backend/venv/bin/celery -A config worker -l info

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF"

echo "Kích hoạt Daemons..."
sudo systemctl daemon-reload
sudo systemctl enable qlvb_gunicorn qlvb_celery
sudo systemctl restart qlvb_gunicorn qlvb_celery


# 6. CẤU HÌNH NGINX LÀM REVERSE PROXY VÀ TĨNH HOÁ ASSET
echo "=> 🌐 Ghi đè Server Block của Nginx..."

sudo bash -c "cat > /etc/nginx/sites-available/qlvb <<EOF
server {
    listen 80;
    server_name $DOMAIN_OR_IP;

    client_max_body_size 50M;

    root $PROJECT_DIR/frontend/dist;
    index index.html index.htm;

    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }

    location ~ ^/(api|admin) {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }

    location /static/ {
        alias $PROJECT_DIR/backend/staticfiles/;
    }

    location /media/ {
        alias $PROJECT_DIR/backend/media/;
    }
}
EOF"

# Kích hoạt Nginx Site
sudo ln -sf /etc/nginx/sites-available/qlvb /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Kiểm tra cú pháp Nginx và Restart
sudo nginx -t
sudo systemctl restart nginx

echo "=========================================================="
echo "🎉 DEPLOY THÀNH CÔNG RỰC RỠ TRÊN UBUNTU 24.04!"
echo "📍 Trang chính: http://localhost hoặc Domain/IP Public của Host"
echo "🛠 Giám sát log ASGI: sudo journalctl -u qlvb_gunicorn"
echo "🛠 Giám sát log AI: sudo journalctl -u qlvb_celery"
echo "=========================================================="