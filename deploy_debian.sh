#!/bin/bash

# ==============================================================================
# SCRIPT TRIỂN KHAI HỆ THỐNG QLVB TRÊN DEBIAN (KHÔNG DÙNG DOCKER)
# Tương thích: Debian 11/12 (hoặc Ubuntu 20.04/22.04)
# Yêu cầu: Chạy bằng quyền root (sudo)
# ==============================================================================

# Cấu hình biến
PROJECT_NAME="qlvb"
PROJECT_DIR="/home/qlvb/$PROJECT_NAME"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend/dist"
USER_NAME="qlvb"
# Cấu hình PostgreSQL (Máy chủ ngoài)
DB_HOST="192.168.0.138"
DB_PORT="5432"
DB_NAME="qlvb_db"
DB_USER="qlvb_db_user"
DB_PASS="Qa061088" # Sửa lại thành mật khẩu thực tế trên DB Server 192.168.0.218

SERVER_DOMAIN="localhost" # Đổi thành Domain hoặc IP thực tế của bạn

echo "==================================================="
echo "BẮT ĐẦU TRIỂN KHAI HỆ THỐNG QLVB"
echo "==================================================="

# 0. Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then
  echo "Vui lòng chạy script này dưới quyền root (sudo ./deploy_debian.sh)"
  exit
fi

# 1. Cập nhật hệ thống & Cài đặt gói cần thiết
echo "[1/7] Cập nhật hệ thống và cài đặt môi trường..."
apt update && apt upgrade -y
apt install -y python3 python3-pip python3-venv \
    postgresql-client \
    nginx curl git tzdata \
    libpq-dev build-essential \
    certbot python3-certbot-nginx

# 2. Tạo User chuyên dụng để chạy app (bảo mật)
echo "[2/7] Tạo user system: $USER_NAME..."
id -u $USER_NAME &>/dev/null || useradd -m -s /bin/bash $USER_NAME

# 3. Cấu hình PostgreSQL Database (Lưu ý: Tạo sẵn Database trên 192.168.0.218 trước)
echo "[3/7] Bỏ qua cài đặt Local DB. Sẽ kết nối trực tiếp tới postgresql://$DB_USER:***@$DB_HOST:$DB_PORT/$DB_NAME"

# 4. Chuẩn bị thư mục mã nguồn
echo "[4/7] Chuẩn bị thư mục mã nguồn tại $PROJECT_DIR..."
mkdir -p $PROJECT_DIR
chown -R $USER_NAME:$USER_NAME $PROJECT_DIR

# -------------------------------------------------------------
# PHẦN BACKEND (DJANGO)
# -------------------------------------------------------------
echo "[5/7] Thiết lập môi trường Backend..."
# Di chuyển vào backend 
cd $BACKEND_DIR

# Tạo môi trường ảo (Virtualenv)
sudo -u $USER_NAME python3 -m venv venv

# Cài đặt thư viện Python
sudo -u $USER_NAME ./venv/bin/pip install --upgrade pip
sudo -u $USER_NAME ./venv/bin/pip install -r requirements.txt
sudo -u $USER_NAME ./venv/bin/pip install gunicorn psycopg2-binary python-dotenv

# Tạo file .env cho backend
cat <<EOF > .env
DEBUG=False
SECRET_KEY=long-random-secret-key-replace-me-$(openssl rand -hex 16)
ALLOWED_HOSTS=*
DATABASE_URL=postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME
EOF
chown $USER_NAME:$USER_NAME .env

# Migrate database (Sẽ tự động kết nối TCP tới 192.168.0.218 và tạo/cập nhật bảng) & Thu thập static files
sudo -u $USER_NAME ./venv/bin/python manage.py migrate
sudo -u $USER_NAME ./venv/bin/python manage.py collectstatic --noinput

# Tạo systemd service cho Gunicorn (Backend)
echo "Thiết lập Gunicorn Service..."
cat <<EOF > /etc/systemd/system/gunicorn_${PROJECT_NAME}.service
[Unit]
Description=Gunicorn daemon for QLVB Backend
After=network.target

[Service]
User=$USER_NAME
Group=www-data
WorkingDirectory=$BACKEND_DIR
ExecStart=$BACKEND_DIR/venv/bin/gunicorn --access-logfile - --workers 3 --bind unix:$BACKEND_DIR/gunicorn.sock config.wsgi:application

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl start gunicorn_${PROJECT_NAME}
systemctl enable gunicorn_${PROJECT_NAME}

# -------------------------------------------------------------
# PHẦN FRONTEND & NGINX
# -------------------------------------------------------------
echo "[6/7] Thiết lập Frontend & Nginx..."

# Cấu hình Nginx
cat <<EOF > /etc/nginx/sites-available/$PROJECT_NAME
server {
    listen 80;
    server_name $SERVER_DOMAIN;

    # Giao diện Frontend (React)
    root $FRONTEND_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API Backend (Django)
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:$BACKEND_DIR/gunicorn.sock;
    }
    
    # Static files của Django admin/rest_framework
    location /static/ {
        alias $BACKEND_DIR/static/;
    }
    
    # Media files (File upload)
    location /media/ {
        alias $BACKEND_DIR/media/;
    }
}
EOF

# Kích hoạt Nginx site
ln -sf /etc/nginx/sites-available/$PROJECT_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Chỉnh quyền cho Nginx đọc thư mục upload (media)
mkdir -p $BACKEND_DIR/media
chmod -R 755 $PROJECT_DIR
chown -R $USER_NAME:www-data $BACKEND_DIR/media

# Khởi động lại Nginx
systemctl restart nginx

echo "[7/7] Triển khai hoàn tất!"
echo "==================================================="
echo "THÔNG TIN HỆ THỐNG:"
echo "- Địa chỉ truy cập: http://$SERVER_DOMAIN"
echo "- Database Host: $DB_HOST:$DB_PORT"
echo "- Database Name: $DB_NAME"
echo "- Database User: $DB_USER"
echo "- Database Pass: (Đã được bạn nhập trong script)"
echo "==================================================="
echo "Lưu ý: Hãy đảm bảo bạn đã upload mã nguồn Frontend (thư mục dist) vào $FRONTEND_DIR và Backend vào $BACKEND_DIR trước khi chạy lại script nếu bị lỗi."
