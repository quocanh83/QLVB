#!/bin/bash

# ==========================================================
# SCRIPT CỨU CÁNH: TỰ ĐỘNG TẠO SWAP VÀ BUILD QLVB V3.0
# DÀNH CHO SERVER RAM THẤP (1GB - 2GB)
# ==========================================================

set -e

PROJECT_DIR="/home/qlvb"
FRONTEND_V3_DIR="$PROJECT_DIR/frontend-v3"
SWAP_FILE="/swapfile_qlvb"

echo "🛠️ ĐANG KIỂM TRA VÀ TỐI ƯU BỘ NHỚ HỆ THỐNG..."

# 1. Tạo Swap nếu chưa có hoặc quá nhỏ
if [ ! -f "$SWAP_FILE" ]; then
    echo "=> [1/3] Đang tạo 4GB Swap (Bộ nhớ ảo)... Việc này mất khoảng 30s..."
    sudo fallocate -l 4G $SWAP_FILE || sudo dd if=/dev/zero of=$SWAP_FILE bs=1M count=4096
    sudo chmod 600 $SWAP_FILE
    sudo mkswap $SWAP_FILE
    sudo swapon $SWAP_FILE
    echo "✅ Đã kích hoạt 4GB Swap."
else
    echo "ℹ️ Đã có bộ nhớ ảo Swap."
fi

# 2. Cập nhật mã nguồn
echo "=> [2/3] Cập nhật mã nguồn mới nhất..."
cd $PROJECT_DIR
git pull origin master

# 3. Tiến hành Build với cấu hình siêu tiết kiệm
echo "=> [3/3] Đang tiến hành Build Frontend V3 (SIÊU TIẾT KIỆM RAM)..."
cd $FRONTEND_V3_DIR

# Xoá cache cũ để giải phóng dung lượng
rm -rf node_modules/.cache

# Cài đặt dependencies
npm install --legacy-peer-deps

# Lệnh build quan trọng nhất: Tắt SourceMap và giới hạn Heap thấp để System không Kill
echo "=> Đang biên dịch... vui lòng đợi (có Swap nên sẽ chậm nhưng chắc chắn xong)..."
export GENERATE_SOURCEMAP=false
export NODE_OPTIONS="--max-old-space-size=1024"
npm run build

echo "=========================================================="
echo "🎉 CHÚC MỪNG! QUY TRÌNH BIÊN DỊCH ĐÃ HOÀN TẤT THÀNH CÔNG."
echo "📍 Bây giờ bạn hãy chạy tiếp lệnh: sudo ./migrator_v3.sh"
echo "   (Để script migrator thực hiện nốt việc cấu hình Nginx & Restart Service)"
echo "=========================================================="
