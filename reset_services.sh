#!/bin/bash
# ==========================================================
# SCRIPT DỌN DẸP & ĐỒNG NHẤT SYSTEMD SERVICES CHO QLVB
# Dành cho Máy chủ (Server). 
# Yêu cầu: Chạy bằng quyền Root (sudo)
# ==========================================================

if [ "$EUID" -ne 0 ]; then
  echo "❌ Vui lòng chạy file này bằng quyền root: sudo ./reset_services.sh"
  exit
fi

echo "1. Đang quét và dọn dẹp các Service Gunicorn/Celery rác..."
# Tìm và stop tất cả các service liên quan tới qlvb và gunicorn/celery
SERVICES_TO_REMOVE=$(ls /etc/systemd/system/ | grep -iE 'qlvb.*gunicorn|gunicorn.*qlvb|qlvb.*celery|celery.*qlvb')

if [ -n "$SERVICES_TO_REMOVE" ]; then
    for svc in $SERVICES_TO_REMOVE; do
        echo "  - Đang dừng và xoá service rác: $svc"
        systemctl stop $svc 2>/dev/null
        systemctl disable $svc 2>/dev/null
        rm -f /etc/systemd/system/$svc
    done
    systemctl daemon-reload
    echo "=> Đã dọn dẹp sạch sẽ!"
else
    echo "=> Không có service rác nào."
fi

echo "--------------------------------------------------------"
echo "2. Khởi tạo lại Dịch vụ Gunicorn Chuẩn (gunicorn_qlvb)..."
cat <<EOF > /etc/systemd/system/gunicorn_qlvb.service
[Unit]
Description=Gunicorn daemon for QLVB Backend
After=network.target

[Service]
User=qlvb
Group=www-data
WorkingDirectory=/home/qlvb/backend
ExecStart=/home/qlvb/backend/venv/bin/gunicorn --access-logfile - --workers 3 --bind unix:/home/qlvb/backend/gunicorn.sock config.wsgi:application

[Install]
WantedBy=multi-user.target
EOF

echo "--------------------------------------------------------"
echo "3. Khởi tạo lại Dịch vụ Celery Chuẩn (celery_qlvb)..."
cat <<EOF > /etc/systemd/system/celery_qlvb.service
[Unit]
Description=Celery Worker for QLVB
After=network.target

[Service]
User=qlvb
Group=www-data
WorkingDirectory=/home/qlvb/backend
ExecStart=/home/qlvb/backend/venv/bin/celery -A config worker -l info

[Install]
WantedBy=multi-user.target
EOF

echo "--------------------------------------------------------"
echo "4. Đăng ký & Khởi động lại toàn bộ dịch vụ..."
systemctl daemon-reload

systemctl enable gunicorn_qlvb
systemctl start gunicorn_qlvb

systemctl enable celery_qlvb
systemctl start celery_qlvb

systemctl restart nginx

echo "=========================================================="
echo "✨ ĐỒNG NHẤT SERVICE THÀNH CÔNG!"
echo "Từ nay về sau, tên Service chuẩn xác là:"
echo "1. gunicorn_qlvb (Backend API)"
echo "2. celery_qlvb   (Background Worker)"
echo "----------------------------------------------------------"
echo "Cách xem trạng thái: sudo systemctl status gunicorn_qlvb"
echo "=========================================================="
