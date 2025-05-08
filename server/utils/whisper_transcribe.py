from faster_whisper import WhisperModel
import subprocess
import os

# 모델 로드 (float 오류 방지 위해 int8으로 지정)
model = WhisperModel("medium", compute_type="int8")

def transcribe_audio(audio_path: str) -> str:
    print(f"[🧠] Whisper 분석 시작: {audio_path}")

    # 변환 경로 설정 (같은 이름으로 .wav 파일 만들기)
    base, _ = os.path.splitext(audio_path)
    wav_path = f"{base}.wav"

    try:
        # ffmpeg로 .webm → .wav 변환
        subprocess.run([
            "ffmpeg", "-y", "-i", audio_path,
            "-ar", "16000", "-ac", "1", wav_path
        ], check=True)

        print(f"[🎧] WAV 변환 완료: {wav_path}")

        # Whisper로 자막 추출
        segments, _ = model.transcribe(wav_path)
        texts = [segment.text for segment in segments]
        print(f"[📄] Segment 수: {len(texts)}")

        return " ".join(texts)
    except Exception as e:
        print(f"[❌] Whisper 오류:", e)
        return ""
