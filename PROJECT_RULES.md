# THÔNG TIN DỰ ÁN: HỆ THỐNG QUẢN LÝ, GÓP Ý VÀ GIẢI TRÌNH DỰ THẢO VĂN BẢN PHÁP LUẬT

## 1. TỔNG QUAN (OVERVIEW)
Hệ thống web app dùng để số hóa quy trình lấy ý kiến và giải trình dự thảo văn bản quy phạm pháp luật. Hệ thống tự động bóc tách cấu trúc file Word (Điều, Khoản, Điểm), cho phép người dùng góp ý vào từng phần tử, tự động map file góp ý, và xuất báo cáo giải trình theo biểu mẫu.

## 2. CÔNG NGHỆ YÊU CẦU (TECH STACK) - BẮT BUỘC
- **Backend:** Python (FastAPI hoặc Django).
- **Frontend:** ReactJS hoặc Vue 3. 
- **UI Framework:** Ant Design hoặc MUI (Tạo Theme chung thống nhất cho Admin Dashboard).
- **Database:** PostgreSQL (Hỗ trợ truy vấn phân cấp - Recursive Queries cho Tree Structure).
- **Background Jobs:** Redis + Celery (Để xử lý file Word nặng).
- **Deployment:** Chạy trực tiếp (Bare-metal) trên Ubuntu/Debian với systemd, Nginx reverse proxy.
- **TUYỆT ĐỐI KHÔNG:** Không sử dụng Docker, Không dùng docker-compose.

## 3. KIẾN TRÚC CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)
Các mô hình dữ liệu (Models) bắt buộc phải có cấu trúc sau:

### 3.1. Nhóm Phân quyền (RBAC)
- **Users:** id, username, password_hash, full_name, email, role_id, group_id, is_active.
- **Roles:** id, role_name (Admin, Contributor, Explainer), permissions.
- **Groups:** id, group_name (VD: Ban Pháp chế, Tổ Soạn thảo).

### 3.2. Nhóm Văn bản (Documents)
- **Documents:** id, title, description, uploaded_by, created_at, status (Draft, Reviewing, Completed), attached_file_path.
- **Document_Nodes (Cấu trúc cây - Rất quan trọng):**
  - `id`: Primary Key
  - `document_id`: FK -> Documents
  - `parent_id`: FK -> Document_Nodes.id (Self-referencing để tạo cây: Điều -> Khoản -> Điểm). Nếu là Điều thì parent_id = null.
  - `node_type`: Enum ('Điều', 'Khoản', 'Điểm')
  - `node_label`: String (VD: "Điều 1", "Khoản 2", "Điểm a")
  - `content`: Text (Nội dung chi tiết của Node đó)
  - `order_index`: Integer (Thứ tự để sắp xếp lúc hiển thị)

### 3.3. Nhóm Tương tác (Feedbacks & Explanations)
- **Feedbacks:** - `id`, `document_id` (FK)
  - `node_id` (FK -> Document_Nodes): Bắt buộc, trỏ đến phần tử bị góp ý.
  - `user_id` (FK), `content` (Text), `attached_file_path` (File đính kèm), `created_at`.
- **Explanations:**
  - `id`
  - `target_type`: Enum ('Feedback', 'Node') - Giải trình cho 1 góp ý cụ thể hay giải trình chung cho cả Điều/Khoản.
  - `target_id`: FK (trỏ đến feedbacks.id hoặc document_nodes.id tùy theo target_type).
  - `content`: Text, `user_id` (FK), `created_at`.

### 3.4. Nhóm Báo cáo (Templates)
- **Report_Templates:** id, name, file_path (đường dẫn đến file .docx chứa Jinja2 tags), uploaded_by.

## 4. LUỒNG NGHIỆP VỤ & THUẬT TOÁN (BUSINESS LOGIC)
AI cần chú ý các thư viện và logic sau khi sinh code:

- **Parsing Document (Bóc tách văn bản):** Dùng thư viện `python-docx`. Viết logic đọc từng paragraph. Sử dụng Regex tiếng Việt:
  - Cấp 1 (Điều): Bắt đầu bằng chữ "Điều" + Dấu cách + Số + Dấu chấm/phẩy (VD: "Điều 1.", "Điều 2").
  - Cấp 2 (Khoản): Bắt đầu bằng Số + Dấu chấm + Dấu cách (VD: "1. ", "2. ").
  - Cấp 3 (Điểm): Bắt đầu bằng Chữ cái thường + Dấu đóng ngoặc (VD: "a) ", "b) ").
  *Lưu ý: Quá trình bóc tách phải dùng Database Transaction (Commit/Rollback) để tránh lưu dữ liệu rác nếu lỗi.*

- **Auto-Mapping Feedback (Ghép góp ý tự động):** - Đọc file Word tải lên.
  - Dùng Regex tìm ngữ cảnh: "Tại [node_label]". VD: "Tại khoản 2 Điều 3...".
  - Match với `node_label` trong bảng `Document_Nodes` có cùng `document_id`.

- **Export Report (Xuất báo cáo):**
  - Dùng thư viện `docxtpl`.
  - Viết logic gom nhóm (Group by): Lấy Điều -> Lấy các Khoản/Điểm con -> Lấy danh sách Feedbacks -> Lấy Explanations tương ứng. 
  - Build thành một nested dictionary/JSON và truyền vào `docxtpl` để render file Word.

## 5. TIÊU CHUẨN GIAO DIỆN (UI STANDARDS)
- Sử dụng UI Framework được chỉ định. Thiết lập một Theme dùng chung (Shared Layout) chứa: Sidebar (cố định trái), Header (trên), Content area.
- Trang "Chi tiết văn bản" và "Giải trình" BẮT BUỘC dùng Layout Split-screen (chia đôi màn hình): Bên trái là Tree-view hiển thị cấu trúc văn bản, bên phải là Form nhập liệu tương ứng với Node đang được click.
- Thiết kế Responsive cơ bản.

## 6. QUY TẮC DÀNH CHO AI (AI ASSISTANT RULES)
1. Hãy đọc kỹ SCHEMA trước khi tạo models/entities.
2. KHÔNG tự ý tạo file Docker, docker-compose. Nếu cần hướng dẫn deploy, hãy tạo file bash script `.sh` để cài đặt thẳng trên Ubuntu bằng apt và systemctl.
3. Chia nhỏ quá trình code. Luôn bắt đầu bằng việc tạo Models/Database, sau đó là Service xử lý Regex, rồi đến API, và cuối cùng là UI.
4. Với các đoạn Regex phân tích văn bản, BẮT BUỘC phải comment giải thích từng block regex hoạt động như thế nào.
5. Khi viết API trả về cây thư mục (Tree structure), hãy sử dụng thuật toán đệ quy (recursion) hoặc sắp xếp tuyến tính hiệu quả để tránh query N+1 vào database.