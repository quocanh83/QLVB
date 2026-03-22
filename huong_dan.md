# HƯỚNG DẪN TỪNG BƯỚC CÓ BÁO CÁO VÀ CHỐT VẤN ĐỀ (DÙNG TRAE/CURSOR AI)

## QUY TẮC PHẢN HỒI (DÀNH CHO BẠN)
Sau khi bạn dán một câu lệnh, AI sẽ trả lời và dừng lại. Bạn hãy dùng 1 trong 2 câu sau để phản hồi AI:
- **Nếu chạy ngon lành:** *"OK, tôi chốt kết quả này. Hãy chuyển sang bước tiếp theo."*
- **Nếu có lỗi hoặc chưa ưng ý:** *"Chưa được, tôi gặp lỗi này: [Copy nguyên dòng lỗi dán vào đây] / Giao diện đang bị [mô tả lỗi]. Hãy sửa lại và báo cáo lại."*

---

## GIAI ĐOẠN 0: KHỞI TẠO DỰ ÁN
**Copy câu lệnh sau dán vào khung chat AI:**

Chào AI, tôi là người mới chưa có kinh nghiệm lập trình. Hãy đọc kỹ file `@PROJECT_RULES.md` để hiểu toàn bộ kiến trúc dự án. 
Nhiệm vụ đầu tiên: Khởi tạo dự án Django (Backend) và ReactJS bằng Vite (Frontend) trong thư mục này. 
Yêu cầu: Hãy liệt kê các lệnh Terminal cần chạy. Tuyệt đối KHÔNG tự ý tạo file hay viết code vội.
=> SAU KHI LIỆT KÊ XONG, HÃY DỪNG LẠI. Báo cáo cho tôi cấu trúc thư mục bạn dự định tạo ra và ĐỢI TÔI XÁC NHẬN (chốt) thì bạn mới được đi tiếp.

---

## GIAI ĐOẠN 1: XÂY MÓNG CƠ SỞ DỮ LIỆU (DATABASE)
**Copy câu lệnh sau dán vào khung chat AI:**

Bây giờ chúng ta làm Database. Dựa vào phần 3 của file `@PROJECT_RULES.md`, hãy viết code cho file `models.py` trong ứng dụng Django. 
Yêu cầu: Bảng `Document_Nodes` bắt buộc phải có `parent_id` để tạo cấu trúc cây (Điều -> Khoản -> Điểm). Thêm trường `created_at` cho các bảng tương tác.
=> SAU KHI VIẾT CODE XONG, HÃY DỪNG LẠI. Bạn phải báo cáo (liệt kê) lại danh sách các Bảng và các Trường dữ liệu bạn vừa tạo ra, giải thích ngắn gọn logic quan hệ giữa chúng. ĐỢI TÔI KIỂM TRA VÀ CHỐT thì mới chuyển sang tạo API.

---

## GIAI ĐOẠN 2: BÓC TÁCH FILE WORD (MODULE CỐT LÕI)
**Copy câu lệnh sau dán vào khung chat AI:**

Bây giờ làm phần khó nhất: bóc tách file Word. Tôi đã cung cấp file `@mau_du_thao.docx`. 
Hãy viết một service bằng Python sử dụng `python-docx` và Regex để nhận diện Điều, Khoản, Điểm và lưu vào `Document_Nodes` theo cấu trúc cha-con.
=> SAU KHI VIẾT HÀM XONG, HÃY DỪNG LẠI. Bạn BẮT BUỘC phải chạy thử hàm đó với file `@mau_du_thao.docx` và in kết quả ra console. Hãy báo cáo cho tôi biết bạn đã bóc tách được bao nhiêu Điều, Khoản, Điểm. Nếu có đoạn văn bản nào không nhận diện được, hãy báo cáo rõ. ĐỢI TÔI CHỐT KẾT QUẢ BÓC TÁCH này rồi mới đi tiếp.

---

## GIAI ĐOẠN 3: XÂY DỰNG GIAO DIỆN GÓP Ý (SPLIT-SCREEN)
**Copy câu lệnh sau dán vào khung chat AI:**

Chuyển sang Frontend (ReactJS + Ant Design). Hãy dựng layout cho trang 'Chi tiết Dự thảo'.
Yêu cầu: Màn hình chia đôi (Split-screen). Bên trái là `Tree` hiển thị cấu trúc văn bản. Bên phải là Form nhập góp ý.
=> Hãy dựng Layout giao diện tĩnh trước (chưa cần gọi API thực tế). SAU KHI DỰNG XONG LAYOUT, HÃY DỪNG LẠI. Báo cáo cấu trúc component bạn vừa tạo và hướng dẫn tôi cách mở trình duyệt để xem thử. ĐỢI TÔI CHỐT GIAO DIỆN HIỂN THỊ ĐẸP, ĐÚNG CHIA ĐÔI MÀN HÌNH thì mới bắt đầu viết code kết nối API Backend.

---

## GIAI ĐOẠN 4: XUẤT BÁO CÁO GIẢI TRÌNH
**Copy câu lệnh sau dán vào khung chat AI:**

Làm tính năng xuất báo cáo từ file mẫu `@template_bao_cao.docx`.
Hãy viết API bằng Django, sử dụng `docxtpl`. Gom toàn bộ dữ liệu (Điều -> Khoản -> Điểm -> Góp ý -> Giải trình) thành một cấu trúc JSON phân cấp để đẩy vào file Word.
=> SAU KHI VIẾT XONG LOGIC TRUY VẤN, HÃY DỪNG LẠI. Hãy báo cáo cho tôi mẫu cấu trúc dữ liệu JSON (dạng mock data) mà bạn dự định sẽ đẩy vào template. ĐỢI TÔI KIỂM TRA XEM cấu trúc đó có khớp với các thẻ trong file Word chưa, tôi chốt thì mới chạy lệnh render ra file `.docx`.

---

## GIAI ĐOẠN 5: DEPLOY LÊN MÁY CHỦ UBUNTU
**Copy câu lệnh sau dán vào khung chat AI:**

Dự án đã chạy tốt ở máy cá nhân. Bây giờ viết script đưa lên máy chủ Ubuntu 24.04 (Bare-metal). KHÔNG DÙNG DOCKER.
=> HÃY DỪNG LẠI Ở ĐÂY. Hãy viết ra giấy nháp (báo cáo) lộ trình 5 bước cấu hình máy chủ (Cài đặt, Cấu hình Nginx, Cấu hình Gunicorn, Systemd, v.v.). Giải thích ngắn gọn mục đích của từng bước. ĐỢI TÔI ĐỌC HIỂU VÀ CHỐT LỘ TRÌNH, sau đó bạn mới được viết toàn bộ script `deploy.sh` chi tiết.