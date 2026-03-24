#!/bin/bash

# ==============================================================================
# SCRIPT TRIỂN KHAI HỆ THỐNG QLVB TRÊN DEBIAN/UBUNTU
# Cập nhật: Chuẩn hóa thư mục (/home/qlvb) & Đồng nhất tên Service & Thêm Update UI
# Yêu cầu: Chạy bằng quyền root (sudo)
# ==============================================================================

# 1. Cấu hình biến môi trường
PROJECT_DIR="/home/qlvb"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend/dist"
USER_NAME="qlvb"

# Cập nhật IP DB của bạn
DB_HOST="192.168.0.218"
DB_PORT="5432"
DB_NAME="qlvb_db"
DB_USER="qlvb_db_user"
DB_PASS="Qa061088"

SERVER_DOMAIN="localhost" # Đổi thành IP/Domain thực tế của server

echo "==================================================="
echo "BẮT ĐẦU TRIỂN KHAI HỆ THỐNG QLVB (CẤU TRÚC MỚI)"
echo "==================================================="

# 0. Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Vui lòng chạy script này dưới quyền root (sudo ./deploy_debian_v2.sh)"
  exit
fi

# 1. Cập nhật hệ thống & Cài đặt gói cần thiết
echo "[1/7] Cập nhật hệ thống và cài đặt môi trường..."
apt update && apt upgrade -y
apt install -y python3 python3-pip python3-venv postgresql-client nginx curl git tzdata libpq-dev build-essential redis-server npm

# 2. Tạo User chuyên dụng để chạy app
echo "[2/7] Tạo user system: $USER_NAME..."
id -u $USER_NAME &>/dev/null || useradd -m -s /bin/bash $USER_NAME

# 3. Phân quyền thư mục dự án
echo "[3/7] Chuyển đổi quyền sở hữu thư mục chứa code ($PROJECT_DIR)..."
# Đảm bảo source đã có ở /home/qlvb, nếu chưa hãy clone:
# git clone https://github.com/quocanh83/QLVB.git /home/qlvb
chown -R $USER_NAME:$USER_NAME $PROJECT_DIR

# -------------------------------------------------------------
# PHẦN BACKEND (DJANGO)
# -------------------------------------------------------------
echo "[4/7] Thiết lập môi trường Backend..."
cd $BACKEND_DIR

# Tạo môi trường ảo & cài đặt
sudo -u $USER_NAME python3 -m venv venv
sudo -u $USER_NAME ./venv/bin/pip install --upgrade pip
sudo -u $USER_NAME ./venv/bin/pip install -r requirements.txt
sudo -u $USER_NAME ./venv/bin/pip install gunicorn psycopg2-binary python-dotenv

# Tạo file .env cho backend
cat <<EOF > .env
DEBUG=False
SECRET_KEY=qlvb-random-secret-key-$(openssl rand -hex 16)
ALLOWED_HOSTS=*
DATABASE_URL=postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME
CELERY_BROKER_URL=redis://localhost:6379/0
EOF
chown $USER_NAME:$USER_NAME .env

# Migrate database & Collectstatic
sudo -u $USER_NAME ./venv/bin/python manage.py migrate
sudo -u $USER_NAME ./venv/bin/python manage.py collectstatic --noinput

# -------------------------------------------------------------
# PHẦN SYSTEMD (GUNICORN + CELERY)
# -------------------------------------------------------------
echo "[5/7] Thiết lập Background Services (Gunicorn & Celery)..."

# Service Gunicorn (API)
cat <<EOF > /etc/systemd/system/gunicorn_qlvb.service
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

# Service Celery (Task)
cat <<EOF > /etc/systemd/system/celery_qlvb.service
[Unit]
Description=Celery Worker for QLVB
After=network.target

[Service]
User=$USER_NAME
Group=www-data
WorkingDirectory=$BACKEND_DIR
ExecStart=$BACKEND_DIR/venv/bin/celery -A config worker -l info

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gunicorn_qlvb celery_qlvb
systemctl start gunicorn_qlvb celery_qlvb

# -------------------------------------------------------------
# PHẦN FRONTEND & NGINX
# -------------------------------------------------------------
echo "[6/7] Thiết lập Nginx & Kịch bản Tương lai..."

cat <<EOF > /etc/nginx/sites-available/qlvb
server {
    listen 80;
    server_name $SERVER_DOMAIN;

    # Trỏ thẳng đến thư mục dist đã build (nếu bạn tự build trên server hoặc push thẳng nhánh dist)
    root $FRONTEND_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        include proxy_params;
        proxy_pass http://unix:$BACKEND_DIR/gunicorn.sock;
    }
    
    location /static/ {
        alias $BACKEND_DIR/static/;
    }
    
    location /media/ {
        alias $BACKEND_DIR/media/;
    }
}
EOF

ln -sf /etc/nginx/sites-available/qlvb /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Chỉnh quyền Upload (Media)
mkdir -p $BACKEND_DIR/media
chmod -R 755 $PROJECT_DIR
chown -R $USER_NAME:www-data $BACKEND_DIR/media

# Khởi động Nginx
systemctl restart nginx

# -------------------------------------------------------------
# PHẦN BỔ SUNG (CHO CHỨC NĂNG "CẬP NHẬT TỪ GIAO DIỆN WEB")
# -------------------------------------------------------------
echo "[7/7] Trao quyền đặc biệt cho chức năng Cập nhật qua Web..."
cat <<EOF > /etc/sudoers.d/qlvb_restart
$USER_NAME ALL=(ALL) NOPASSWD: /bin/systemctl restart gunicorn_qlvb
$USER_NAME ALL=(ALL) NOPASSWD: /bin/systemctl restart celery_qlvb
$USER_NAME ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx
EOF
chmod 440 /etc/sudoers.d/qlvb_restart

echo "==================================================="
echo "✨ TRIỂN KHAI HOÀN TẤT!"
echo "- Địa chỉ truy cập: http://$SERVER_DOMAIN"
echo "- Chức năng Cập nhật qua Web đã được kích hoạt Sẵn Sàng!"
echo "==================================================="
