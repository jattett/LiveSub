from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from utils.whisper_transcribe import transcribe_audio
import os

app = FastAPI()

# CORS 허용 (React와 연동 시 필요)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    print(f"[📥] 업로드 파일 이름: {file.filename}")
    print(f"[📝] 저장 경로: {file_path}")

    with open(file_path, "wb") as f:
        contents = await file.read()
        print(f"[🔍] 파일 크기: {len(contents)} bytes")
        f.write(contents)

    transcript = transcribe_audio(file_path)
    return {"text": transcript}