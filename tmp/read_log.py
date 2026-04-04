
import os
import sys

log_path = r'c:\Users\Quoc Anh\Desktop\QLVB\backend\backend_error.log'
if os.path.exists(log_path):
    # Try reading with utf-16-le
    try:
        with open(log_path, 'r', encoding='utf-16-le') as f:
            lines = f.readlines()
            print("Last 20 lines of log (UTF-16LE):")
            for line in lines[-20:]:
                print(line.strip())
    except Exception as e1:
        print(f"Failed to read as UTF-16LE: {e1}")
        try:
             with open(log_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                print("Last 20 lines of log (UTF-8):")
                for line in lines[-20:]:
                    print(line.strip())
        except Exception as e2:
             print(f"Failed to read as UTF-8: {e2}")
             # Binary read
             with open(log_path, 'rb') as f:
                 tail = f.read()[-1000:]
                 print(f"Last 1000 bytes: {tail}")
else:
    print("Log file not found.")
