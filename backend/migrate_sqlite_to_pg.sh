#!/bin/bash

# =================================================================
# SCRIPT CHUYỂN ĐỔI DỮ LIỆU TỪ SQLITE SANG POSTGRESQL (CHO DJANGO)
# Hướng dẫn sử dụng:
# 1. Đặt file này trong thư mục `backend/`
# 2. Đảm bảo file .env hiện tại đang KHÔNG CÓ `DATABASE_URL` (để Django đọc sqlite3)
# 3. Chạy lệnh: bash migrate_sqlite_to_pg.sh
# =================================================================

echo "================================================================="
echo "BẮT ĐẦU CHUYỂN ĐỔI DỮ LIỆU TỪ SQLITE SANG POSTGRESQL"
echo "================================================================="

# Kích hoạt môi trường ảo nếu có
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# 1. Xuất dữ liệu từ bản SQLite hiện tại
echo "=> [1/4] Đang trích xuất dữ liệu từ SQLite (db.sqlite3) ra file datadump.json..."
# Sử dụng --exclude contenttypes và auth.Permission để tránh xung đột id khi import vào DB mới
python manage.py dumpdata --natural-foreign --natural-primary -e contenttypes -e auth.Permission --indent 4 > datadump.json

if [ $? -ne 0 ]; then
    echo "❌ LỖI: Trích xuất dữ liệu thất bại. Quá trình dừng lại."
    exit 1
fi
echo "✅ Trích xuất thành công!"
echo ""

# 2. Đổi kết nối sang PostgreSQL
echo "=> [2/4] CHÚ Ý: Môi trường cần chuyển sang đọc Database PostgreSQL."
echo "Bạn hãy mở file '.env' ở một tab khác (hoặc dùng nano), sau đó đảm bảo bạn đã cấu hình DATABASE_URL trỏ tới PostgreSQL."
echo "Ví dụ: DATABASE_URL=postgres://qlvb_db_user:Qa061088@192.168.0.138:5432/qlvb_db"
read -p "👉 Hãy gõ [Enter] sau khi bạn ĐÃ SỬA VÀ LƯU cấu hình PostgreSQL trong .env để tiếp tục... "

# Ép hệ thống đọc trực tiếp file .env vào biến môi trường của Terminal để chắc chắn Django nhận được:
if [ -f ".env" ]; then
    echo "Đang áp dụng cấu hình từ file .env..."
    set -a
    source .env
    set +a
fi

# 3. Tạo lại cấu trúc bảng trong PostgreSQL (Trắng)
echo ""
echo "=> [3/4] Đang tạo kiến trúc bảng (Migrate) trên PostgreSQL mới..."
python manage.py migrate

if [ $? -ne 0 ]; then
    echo "❌ LỖI: Migrate vào PostgreSQL thất bại. Vui lòng kiểm tra lại thông số kết nối Database."
    exit 1
fi

# Xóa các dòng ContentTypes mà Django vừa tự động sinh ra trong quá trình Migrate để tránh trùng lặp ID khi import dữ liệu cũ
echo "Dọn dẹp contenttypes tự sinh để chống xung đột..."
python manage.py shell -c "from django.contrib.contenttypes.models import ContentType; ContentType.objects.all().delete()"

# 4. Import dữ liệu từ file JSON vào PostgreSQL
echo ""
echo "=> [4/4] Đang đẩy dữ liệu từ file datadump.json vào PostgreSQL..."
python manage.py loaddata datadump.json

if [ $? -eq 0 ]; then
    echo "🎉 HOÀN TẤT TỐT ĐẸP! Toàn bộ dữ liệu SQLite đã được Import thành công lên PostgreSQL."
else
    echo "❌ LỖI: Đẩy dữ liệu (LoadData) thất bại. Vui lòng đọc thông báo trên màn hình."
fi

# Tắt môi trường ảo
if [ -d "venv" ]; then
    deactivate
fi
