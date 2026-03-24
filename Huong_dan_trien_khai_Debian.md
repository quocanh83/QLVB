# Hướng dẫn Triển khai Hệ thống QLVB trên Máy chủ Debian/Ubuntu (Không dùng Docker)

Tài liệu này hướng dẫn chi tiết các bước để tự triển khai toàn bộ hệ thống (gồm Backend Django, Frontend React, Nginx và PostgreSQL) lên một máy chủ chạy hệ điều hành Debian 11/12 hoặc Ubuntu 20.04/22.04.

---

## 1. Yêu cầu hệ thống (Prerequisites)
- Một máy chủ (VPS/Server) cài đặt sạch hệ điều hành **Debian 11/12** hoặc **Ubuntu 20.04/22.04**.
- RAM tối thiểu: 2GB (Khuyến nghị 4GB).
- Quyền truy cập **root** hoặc tài khoản có quyền `sudo`.
- Đã trỏ tên miền (Domain) về địa chỉ IP của máy chủ (nếu chạy qua IP thì bỏ qua).

---

## 2. Các file/thư mục cần tải lên Server

Bạn không cần (và KHÔNG NÊN) tải lên máy chủ thư mục `node_modules` hay môi trường ảo `venv` từ máy cá nhân. Hãy làm theo 2 bước biên dịch và đóng gói sau:

### 2.1 Chuẩn bị thư mục Frontend
1. Trên máy cá nhân thư mục `frontend/`, chạy lệnh:
   ```bash
   npm run build
   ```
2. Lệnh này sẽ sinh ra một thư mục tên là `dist/` chứa toàn bộ code tĩnh (HTML, CSS, JS). Bạn chỉ cần upload **duy nhất** thư mục `dist/` này.

### 2.2 Chuẩn bị thư mục Backend
Zip/Nén toàn bộ thư mục `backend/` ngoại trừ:
- Thư mục `venv/` hoặc `.env` cũ của máy trạm.
- Thư mục `__pycache__/`.
- File cơ sở dữ liệu `db.sqlite3`.

### 2.3 Upload lên Server
Tạo thư mục `/home/qlvb/qlvb` trên máy chủ và upload các file lên theo cấu trúc sau:

```text
/home/qlvb/qlvb/
├── backend/                  <-- Chứa manage.py, requirements.txt, cấu hình Django...
└── frontend/
    └── dist/                 <-- Thư mục sinh ra từ lệnh "npm run build"
```

Cuối cùng, tải file `deploy_debian.sh` lên máy chủ và đặt ở đâu cũng được (Ví dụ `/root/deploy_debian.sh`).

---

## 3. Chạy lệnh cài đặt tự động

Sau khi đã tải đầy đủ mã nguồn lên máy chủ theo đúng đường dẫn yêu cầu, hãy kết nối SSH vào máy chủ và chạy lần lượt các lệnh sau:

### Bước 1: Cấp quyền thực thi cho file script
```bash
sudo chmod +x deploy_debian.sh
```

### Bước 2: (Tuỳ chọn) Đổi lại tên miền trong script
Bạn có thể mở file `deploy_debian.sh` bằng lệnh `nano deploy_debian.sh` để sửa biến `SERVER_DOMAIN="localhost"` thành tên miền thực tế (ví dụ: `qlvb.tailieu.vn`).

### Bước 3: Chạy Script cài đặt
Lưu ý: Script này phải chạy dưới quyền Root!
```bash
sudo ./deploy_debian.sh
```

Script sẽ hoàn toàn chạy tự động trong khoảng 5-10 phút để thực hiện các nhiệm vụ:
- Cài đặt Python, PostgreSQL Client, Nginx, Gunicorn.
- Tạo User hệ thống riêng (`qlvb`) để bảo mật.
- Kết nối tới Cơ sở dữ liệu Postgres bên ngoài (192.168.0.218).
- Cài đặt thư viện `requirements.txt`.
- Migrate Database sang Postgres.
- Gom file tĩnh `collectstatic`.
- Thiết lập dịch vụ chạy nền Systemd (`gunicorn_qlvb.service`).
- Cấu hình Nginx làm Web Server và Reverse Proxy.

---

## 4. Kiểm tra và Hoàn tất

Sau khi màn hình chạy xong sẽ hiện dòng `[7/7] Triển khai hoàn tất!` kèm theo thông tin kết nối Database.

Lúc này, bạn hãy mở trình duyệt và truy cập vào **http://dia-chi-ip-may-chu** hoặc **http://ten-mien-cua-ban** để kiểm tra thành quả!

### Một số lệnh hữu ích để bảo trì:

- **Xem log hệ thống (Backend hỏng/lỗi):**
  ```bash
  sudo journalctl -u gunicorn_qlvb -f
  ```
- **Khởi động lại Backend (Khi bạn cập nhật code Python):**
  ```bash
  sudo systemctl restart gunicorn_qlvb
  ```
- **Khởi động lại Frontend/Nginx (Khi bạn đổi proxy):**
  ```bash
  sudo systemctl restart nginx
  ```
