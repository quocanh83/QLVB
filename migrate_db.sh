#!/bin/bash

# Hiển thị thông báo màu xanh cho dễ nhìn
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}Bắt đầu tiến trình cập nhật lại cơ sở dữ liệu...${NC}"

# Đường dẫn cài đặt dự án của bạn (thay đổi giá trị này thành đường dẫn thật trên server)
PROJECT_DIR="/home/qlvb"  # Sửa dòng này, ví dụ: /var/www/QLVB
BACKEND_DIR="$PROJECT_DIR/backend"
VENV_ACTIVATE="$BACKEND_DIR/venv/bin/activate"

# 1. Di chuyển vào thư mục backend
if [ -d "$BACKEND_DIR" ]; then
    echo -e "${GREEN}> Đã tìm thấy thư mục backend: $BACKEND_DIR${NC}"
    cd "$BACKEND_DIR" || exit
else
    echo "Lỗi: Không tìm thấy thư mục backend ở $BACKEND_DIR"
    exit 1
fi

# 2. Kích hoạt môi trường ảo
if [ -f "$VENV_ACTIVATE" ]; then
    echo -e "${GREEN}> Đang kích hoạt môi trường ảo (Python Virtual Environment)...${NC}"
    source "$VENV_ACTIVATE"
else
    echo "Lỗi: Không tìm thấy file kích hoạt môi trường ảo tại $VENV_ACTIVATE"
    exit 1
fi

# 3. Chạy lệnh migrate Database cho nhánh 'accounts'
echo -e "${GREEN}> Thực thi: python3 manage.py makemigrations accounts${NC}"
python3 manage.py makemigrations accounts

echo -e "${GREEN}> Thực thi: python3 manage.py migrate accounts${NC}"
python3 manage.py migrate accounts

# 4. (Tùy chọn) Chạy lệnh migrate tổng thêm một lần nữa cho chắc
echo -e "${GREEN}> Thực thi: python3 manage.py migrate${NC}"
python3 manage.py migrate

# 5. Khởi động lại dịch vụ backend (Bạn nhớ thay qlvb.service thành service thật của bạn, ví dụ gunicorn)
# echo -e "${GREEN}> Khởi động lại dịch vụ backend...${NC}"
# sudo systemctl restart qlvb.service

echo -e "${GREEN}Cập nhật Database thành công!${NC}"
