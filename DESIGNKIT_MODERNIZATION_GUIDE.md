# 🎨 DesignKit UI/UX Modernization Guide

Tài liệu này tổng hợp các quy chuẩn thiết kế và kỹ thuật đã được áp dụng để hiện đại hóa hệ thống QLVB sang phong cách **Glassmorphism Dark Mode**. Sử dụng tài liệu này để đồng bộ hóa cho các trang và tính năng mới.

---

## 💎 1. Visual Identity (Bản sắc Thị giác)

### Bảng màu Hệ thống (Color Palette)
Chúng ta đồng bộ màu sắc dựa trên các mức độ quan trọng và thuộc tính của văn bản:
- **Luật / Cấp cao**: `var(--kit-success)` (Xanh lá - Emerald) - Đại diện cho Quốc hội.
- **Nghị định / Chính phủ**: `var(--kit-warning)` (Vàng Gold/Cam) - Đại diện cho Chính phủ.
- **Thông tư / Bộ / Ngành**: `var(--kit-info)` (Xanh Cyan/Blue) - Đại diện cho các Bộ.
- **Chủ trì / Điều hành**: `var(--kit-primary)` (Xanh tím - Indigo).

### Font & Hiệu ứng
- **Typography**: Sử dụng font 'Inter' với trọng số `700` cho tiêu đề và `500/600` cho nội dung.
- **Glassmorphism**: 
  - Nền: `rgba(255, 255, 255, 0.03)`
  - Độ nhòe: `backdrop-filter: blur(12px)`
  - Viền: `1px solid rgba(255, 255, 255, 0.08)`

---

## 🪟 2. Chuẩn hóa Modal (Popup)

Các Popup phải tuân thủ cấu trúc gọn gàng:
- **Tiêu đề (Header)**: Sử dụng **nền màu đơn sắc (Solid)** tương ứng với chức năng.
  - Phân công: Indigo.
  - Chỉnh sửa: Warning.
  - Thành công/Lưu: Success.
- **Kích thước**: Không đặt `min-height: 100vh`. Modal phải tự co giãn theo nội dung (`height: auto`).
- **Nút bấm**: Luôn dùng `<ModernButton>` với các biến thể `primary`, `ghost`, hoặc `danger`.

**Code Pattern:**
```jsx
<Modal contentClassName="designkit-wrapper">
    <ModalHeader className="modal-header-warning">Tiêu đề</ModalHeader>
    <ModalBody>...</ModalBody>
    <ModalFooter><ModernButton .../></ModalFooter>
</Modal>
```

---

## 📱 3. Chuẩn hóa Mobile Card (Bảng trên di động)

Dưới đây là các quy tắc "Vàng" để tối ưu hóa bảng dữ liệu trên điện thoại:

1. **Ẩn chi tiết thừa**: Ẩn cột STT và tất cả các nhãn (labels) thừa thãi của bảng.
2. **Cấu trúc 3 tầng**:
   - **Tầng 1 (Top Bar)**: [Badge Loại văn bản] bên trái --- [% Tiến độ bằng số] bên phải.
   - **Tầng 2 (Title)**: [Tên chính] viết Đậm, to (font-size: 1.1rem).
   - **Tầng 3 (Meta)**: [Thông tin phụ] như Cơ quan, Số phụ lục... (font-size: 0.75rem, màu nhạt).
3. **Nút Hành động (Kebab)**:
   - Đặt ở góc trên cùng bên phải của thẻ (Absolute position).
   - **QUAN TRỌNG**: Luôn sử dụng `<DropdownMenu container="body">` để Menu không bị cắt cụt do thẻ quá nhỏ.

**CSS Pattern cho Menu:**
```css
.modern-table-container, .table-responsive, tr {
    overflow: visible !important; /* Đảm bảo menu có thể hiển thị ra ngoài */
}
```

---

## 🛠️ 4. Lưu ý Kỹ thuật cho Lập trình viên

1. **Nhận diện không phân biệt hoa thường**:
   Khi kiểm tra loại văn bản để gán màu, luôn dùng `.toLowerCase()` và `.includes()` để tránh lỗi không nhận diện được chữ viết hoa (vd: "NGHỊ ĐỊNH").
2. **Layout Root**:
   Sử dụng `<div className="designkit-wrapper designkit-layout-root">` cho các trang chính để đảm bảo nền tối phủ kín toàn bộ màn hình (100vh).
3. **React-Select**:
   Sử dụng thư viện `react-select` kèm các styles đã được ghi đè trong `designkit-tokens.scss` để có các ô chọn màu tối chuẩn.

---

*Tài liệu này được tạo ra bởi Antigravity dựa trên feedback thực tế của người dùng.*
