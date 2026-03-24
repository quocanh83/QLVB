import os
import subprocess
import sys

def run_cmd(cmd_list, env_vars=None):
    env = os.environ.copy()
    if env_vars:
        env.update(env_vars)
    
    # Đối với hệ điều hành windows/linux, sử dụng subprocess để đảm bảo không bị dính biến rác
    result = subprocess.run(cmd_list, env=env, text=True, capture_output=True)
    if result.returncode != 0:
        print(f"❌ Có lỗi xảy ra khi chạy lệnh: {' '.join(cmd_list)}")
        print(f"Chi tiết lỗi: {result.stderr}")
        return False
    return True

def main():
    print("==========================================================================")
    print("🚀 SCRIPT TỰ ĐỘNG CHUYỂN ĐỔI DATABASE TỪ SQLITE SANG POSTGRESQL (1-CLICK)")
    print("==========================================================================\n")

    # BƯỚC 1: XUẤT DATABASE
    print("⏳ [1/4] Đang trích xuất dữ liệu cũ từ hệ thống SQLite của bạn...")
    dump_file = "datadump_final.json"
    
    # Đảm bảo lệnh này chạy với biến DATABASE_URL rỗng để trỏ thẳng tới SQLite
    env_sqlite = {"DATABASE_URL": "sqlite:////home/qlvb/qlvb/backend/db.sqlite3"}
    
    cmd_dump = [sys.executable, "manage.py", "dumpdata", "--natural-foreign", "--natural-primary", "-e", "contenttypes", "-e", "auth.Permission", "--indent", "4"]
    
    # Chạy lệnh xuất file, redirect output vào file
    with open(dump_file, "w", encoding="utf-8") as f:
        env = os.environ.copy()
        env["DATABASE_URL"] = "sqlite:////home/qlvb/qlvb/backend/db.sqlite3"
        result = subprocess.run(cmd_dump, env=env, text=True, stdout=f, stderr=subprocess.PIPE)
    
    if result.returncode != 0:
        print(f"❌ Lỗi khi xuất dữ liệu: {result.stderr}")
        sys.exit(1)
        
    print(f"✅ Đã xuất thông tin thành công ra file: {dump_file}\n")


    # BƯỚC 2: HỎI THÔNG TIN KẾT NỐI POSTGRE
    print("⏳ [2/4] Bắt đầu kết nối sang PostgreSQL Server thực tế.")
    default_url = "postgres://qlvb_db_user:Qa061088@192.168.0.138:5432/qlvb_db"
    pg_url = input(f"👉 Hãy nhập địa chỉ Database PostgreSQL của bạn :\n(Mặc định là: {default_url})\n>> ")
    
    if not pg_url.strip():
        pg_url = default_url

    env_pg = {"DATABASE_URL": pg_url.strip()}


    # BƯỚC 3: TẠO BẢNG TRÊN POSTGRE
    print("\n⏳ [3/4] Đang tạo cấu trúc khung xương trên PostgreSQL (Migrate)...")
    if not run_cmd([sys.executable, "manage.py", "migrate"], env_vars=env_pg):
        sys.exit(1)
        
    print("✅ Cấu trúc bảng đã khởi tạo xong. Đang chuẩn bị nạp dữ liệu...")


    # BƯỚC 4: IMPORT DATA TRỞ LẠI VÀO POSTGRE
    print("\n⏳ [4/4] Đang bơm toàn bộ dữ liệu máy chủ cũ vào PostgreSQL mới...")
    if not run_cmd([sys.executable, "manage.py", "loaddata", dump_file], env_vars=env_pg):
        sys.exit(1)

    print("\n🎉 CHÚC MỪNG BẠN! HỆ THỐNG ĐÃ ĐƯỢC CHUYỂN DỮ LIỆU THÀNH CÔNG RỰC RỠ 100% SANG POSTGRESQL!")
    print("💡 Ghi chú: Bây giờ bạn đừng quên copy dán lại cái chuỗi DATABASE_URL kia vào file .env trên Server nhé.")

if __name__ == "__main__":
    main()
