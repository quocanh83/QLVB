import os
import sys

# Add backend to path if needed
sys.path.append('.')

def warmup():
    print("--- [OCR WARMUP] Starting model download/initialization... ---")
    print("--- This may take 1-5 minutes depending on your internet connection. ---")
    
    # Environment flags
    os.environ['FLAGS_use_mkldnn'] = '0'
    os.environ['FLAGS_enable_pir_in_executor'] = '0'
    
    try:
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(
            use_angle_cls=False, 
            lang='vi', 
            enable_mkldnn=False,
            det_db_thresh=0.3,
            det_db_box_thresh=0.5,
            rec_batch_num=16
        )
        print("--- [OCR WARMUP] Models are ready! ---")
    except Exception as e:
        print(f"--- [OCR WARMUP] ERROR: {e} ---")

if __name__ == "__main__":
    warmup()
