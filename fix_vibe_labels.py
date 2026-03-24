import os

f_path = 'frontend/src/pages/VibeReports.jsx'
with open(f_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update Card 1 (mau10)
content = content.replace(
    '<span className="font-black text-sm text-slate-800">Mẫu số 10</span>',
    '<span className="font-black text-sm text-slate-800">Mẫu số 10 (Ngang)</span>'
)
content = content.replace(
    'Xuất theo mẫu văn bản hành chính Word chuẩn với tiêu đề, quốc hiệu, chữ ký.',
    'Xuất theo mẫu văn bản hành chính <b>Xoay Ngang</b> chuẩn với tiêu đề, quốc hiệu, chữ ký.'
)

# Update Card 2 (custom)
content = content.replace(
    '<span className="font-black text-sm text-slate-800">Báo cáo Tuỳ chỉnh</span>',
    '<span className="font-black text-sm text-slate-800">Báo cáo Tuỳ chỉnh (Dọc)</span>'
)
content = content.replace(
    'bg-violet-100 text-violet-600 rounded-full">Cài đặt DB</span>',
    'bg-violet-100 text-violet-600 rounded-full">Cột tuỳ biến</span>'
)
content = content.replace(
    'Xuất theo cấu hình cột tùy biến đã thiết lập trong tab <b>Mẫu chuẩn</b>.',
    'Xuất theo bảng <b>Xoay Dọc</b> với các cột tuỳ biến đã thiết lập trong tab <b>Mẫu chuẩn</b>.'
)

with open(f_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('VibeReports.jsx labels updated OK')
