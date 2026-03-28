#!/bin/bash

# ==========================================================
# SCRIPT CẬP NHẬT HỆ THỐNG QLVB (Git-based Build)
# Server chỉ kéo code và bản build sẵn từ repository
# ==========================================================

# Ngắt script nếu có bất kỳ lệnh nào thất bại
set -e

# Cấu hình đường dẫn thư mục dự án
PROJECT_DIR="/home/qlvb"
LOG_FILE="$PROJECT_DIR/deploy_history.log"

echo "----------------------------------------------------------"
echo "🚀 BẮT ĐẦU CẬP NHẬT TỪ BẢN BUILD GIT ($(date))"
echo "----------------------------------------------------------" | tee -a $LOG_FILE

# 1. Chuyển đến thư mục dự án
cd $PROJECT_DIR

# 2. Cập nhật mã nguồn từ GitHub (Bao gồm cả thư mục frontend-v3/build)
echo "=> 📥 Đang tải code và bản build mới nhất từ GitHub..."
# Đảm bảo git không bị lỗi quyền sở hữu (Dubious ownership)
git config --global --add safe.directory $PROJECT_DIR || true
sudo git config --global --add safe.directory $PROJECT_DIR || true

git clean -fd
git fetch --all
git checkout master
git reset --hard origin/master
git pull origin master

# 3. Cấp quyền sở hữu thư mục
echo "=> 🔑 Đang kiểm tra quyền thư mục..."
sudo chown -R qlvb:qlvb $PROJECT_DIR

# Đảm bảo Nginx có thể đi qua thư mục home của user qlvb
sudo chmod 755 /home/qlvb

# 4. Đảm bảo quyền truy cập cho thư mục build (Để Nginx có thể đọc)
echo "=> 📂 Cấp quyền cho thư mục Frontend Build..."
sudo chmod -R 755 $PROJECT_DIR/frontend-v3/build

# 5. Cập nhật Backend (Django)
echo "=> 🐍 Đang cập nhật Backend và Migrate Database..."
cd $PROJECT_DIR/backend
# Cập nhật Python dependencies
sudo -u qlvb ./venv/bin/pip install -r requirements.txt
# Gom các file tĩnh (Django Admin)
sudo -u qlvb ./venv/bin/python manage.py collectstatic --noinput
# Đồng bộ hóa Cơ sở dữ liệu
sudo -u qlvb ./venv/bin/python manage.py migrate

# 6. Khởi động lại các dịch vụ
echo "=> ♻️ Đang khởi động lại Gunicorn, Celery và Nginx..."
sudo systemctl restart gunicorn_qlvb celery_qlvb nginx

echo "----------------------------------------------------------"
echo "✅ CẬP NHẬT HOÀN TẤT! ($(date))" | tee -a $LOG_FILE
echo "📍 Website: http://duthao.giadinhvit.com"
echo "----------------------------------------------------------"
