import os
import psycopg2
from urllib.parse import urlparse

url = urlparse("postgres://qlvb_db_user:Qa061088@sql.giadinhvit.com:5432/qlvb_db")

print("Đang thử kết nối trực tiếp đến PostgreSQL...")
try:
    conn = psycopg2.connect(
        dbname=url.path[1:],
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port,
        connect_timeout=5
    )
    print("KẾT NỐI THÀNH CÔNG! DB trực tuyến hoạt động tốt.")
    conn.close()
except Exception as e:
    print("LỖI KẾT NỐI DB:", e)
