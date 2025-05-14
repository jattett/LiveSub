import logging
import whisper
import numpy as np
from typing import List, Optional
from models.video import Subtitle
import webrtcvad

logger = logging.getLogger(__name__)

# Whisper 모델 로드
try:
    model = whisper.load_model("medium", download_root="/Users/gyuminkang/.cache/whisper")
    logger.info("Whisper 모델 로드 성공 (medium)")
except Exception as e:
    logger.error(f"Whisper 모델 로드 실패: {str(e)}")
    raise

def apply_vad(audio_array, sample_rate, frame_duration_ms=30):
    vad = webrtcvad.Vad(2)  # 0~3 (3이 가장 민감)
    # 16bit PCM 변환
    audio_pcm = (audio_array * 32767).astype(np.int16).tobytes()
    frame_size = int(sample_rate * frame_duration_ms / 1000) * 2  # 2 bytes per sample
    voiced_audio = bytearray()
    for i in range(0, len(audio_pcm), frame_size):
        frame = audio_pcm[i:i+frame_size]
        if len(frame) < frame_size:
            break
        if vad.is_speech(frame, sample_rate):
            voiced_audio.extend(frame)
    # 다시 float32로 변환
    voiced_np = np.frombuffer(voiced_audio, dtype=np.int16).astype(np.float32) / 32767
    return voiced_np

def apply_vad_with_offsets(audio_array, sample_rate, frame_duration_ms=30):
    vad = webrtcvad.Vad(3)  # 더 민감하게
    audio_pcm = (audio_array * 32767).astype(np.int16).tobytes()
    frame_size = int(sample_rate * frame_duration_ms / 1000) * 2
    voiced_audio = bytearray()
    voiced_offsets = []  # (start_sample, end_sample)
    in_voiced = False
    voiced_start = 0
    for i in range(0, len(audio_pcm), frame_size):
        frame = audio_pcm[i:i+frame_size]
        if len(frame) < frame_size:
            break
        is_speech = vad.is_speech(frame, sample_rate)
        if is_speech and not in_voiced:
            voiced_start = i // 2  # byte to sample
            in_voiced = True
        if not is_speech and in_voiced:
            voiced_end = i // 2
            voiced_offsets.append((voiced_start, voiced_end))
            in_voiced = False
        if is_speech:
            voiced_audio.extend(frame)
    if in_voiced:
        voiced_end = len(audio_pcm) // 2
        voiced_offsets.append((voiced_start, voiced_end))
    # float32 변환
    voiced_np = np.frombuffer(voiced_audio, dtype=np.int16).astype(np.float32) / 32767
    return voiced_np, voiced_offsets

def get_vad_segments(audio_array, sample_rate, frame_duration_ms=30):
    vad = webrtcvad.Vad(3)
    audio_pcm = (audio_array * 32767).astype(np.int16).tobytes()
    frame_size = int(sample_rate * frame_duration_ms / 1000) * 2
    segments = []
    in_voiced = False
    voiced_start = 0
    for i in range(0, len(audio_pcm), frame_size):
        frame = audio_pcm[i:i+frame_size]
        if len(frame) < frame_size:
            break
        is_speech = vad.is_speech(frame, sample_rate)
        if is_speech and not in_voiced:
            voiced_start = i // 2
            in_voiced = True
        if not is_speech and in_voiced:
            voiced_end = i // 2
            segments.append((voiced_start, voiced_end))
            in_voiced = False
    if in_voiced:
        voiced_end = len(audio_pcm) // 2
        segments.append((voiced_start, voiced_end))
    return segments

async def transcribe_audio(audio_array: np.ndarray, sample_rate: int) -> Optional[List[Subtitle]]:
    try:
        logger.info(f"Input audio shape: {audio_array.shape}, dtype: {audio_array.dtype}")
        logger.info(f"Sample rate: {sample_rate}")
        logger.info(f"Audio duration: {len(audio_array)/sample_rate:.2f} seconds")
        if np.max(np.abs(audio_array)) > 1.0:
            logger.warning("Audio values outside [-1, 1] range, normalizing...")
            audio_array = audio_array / np.max(np.abs(audio_array))
        if sample_rate != 16000:
            logger.info(f"Resampling audio from {sample_rate}Hz to 16000Hz")
            import librosa
            audio_array = librosa.resample(
                audio_array, 
                orig_sr=sample_rate, 
                target_sr=16000,
                res_type='kaiser_best'
            )
            sample_rate = 16000
        import scipy.signal as signal
        audio_array = audio_array - np.mean(audio_array)
        threshold = 0.01
        audio_array[np.abs(audio_array) < threshold] = 0

        CHUNK_SIZE = 16000 * 10  # 10초 단위
        all_segments = []
        for chunk_idx, start in enumerate(range(0, len(audio_array), CHUNK_SIZE)):
            chunk = audio_array[start:start+CHUNK_SIZE]
            chunk = np.asarray(chunk, dtype=np.float32).flatten()
            duration_sec = chunk.shape[0] / sample_rate
            min_val = np.min(chunk) if chunk.size > 0 else 0
            max_val = np.max(chunk) if chunk.size > 0 else 0
            logger.info(f"Chunk {chunk_idx} shape: {chunk.shape}, duration: {duration_sec:.2f}s, min: {min_val}, max: {max_val}")
            if duration_sec < 1.0:
                logger.warning(f"Chunk {chunk_idx} is too short or silent. Skipping.")
                continue
            if np.max(np.abs(chunk)) < 0.01:
                logger.warning(f"Chunk {chunk_idx} is almost silent. Skipping.")
                continue
            logger.info(f"Processing chunk {chunk_idx}: samples {start}~{start+len(chunk)}, duration: {duration_sec:.2f} seconds")
            try:
                mel = whisper.log_mel_spectrogram(chunk).to(model.device)
                _, probs = model.detect_language(mel)
                sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)
                detected_language = sorted_probs[0][0]
                confidence = sorted_probs[0][1]
                logger.info(f"Selected language: {detected_language} (confidence: {confidence:.3f})")
                if confidence < 0.6:
                    logger.warning(f"Low language detection confidence ({confidence:.3f})")
                logger.info(f"Transcribing chunk {chunk_idx} with Whisper...")
                result = model.transcribe(
                    chunk,
                    language=detected_language,
                    beam_size=7,
                    temperature=0.1,
                    condition_on_previous_text=True
                )
                if not result["segments"]:
                    logger.warning(f"No segments generated in chunk {chunk_idx}")
                    continue
                for segment in result["segments"]:
                    segment["start"] += start / sample_rate
                    segment["end"] += start / sample_rate
                    all_segments.append(segment)
                    logger.info(f"[Whisper] chunk {chunk_idx} subtitle: {segment['text'].strip()} ({segment['start']:.2f}~{segment['end']:.2f}s)")
            except Exception as e:
                logger.error(f"Whisper transcription error in chunk {chunk_idx}: {e}")
                continue
        if not all_segments:
            logger.warning("No segments generated in any chunk.")
            return None
        subtitles = [
            Subtitle(
                id=str(i),
                startTime=seg["start"],
                endTime=seg["end"],
                text=seg["text"].strip()
            )
            for i, seg in enumerate(all_segments)
        ]
        for i, subtitle in enumerate(subtitles):
            logger.info(f"Generated subtitle {i}: {subtitle.text}")
        return subtitles
    except Exception as e:
        logger.error(f"자막 생성 중 오류 발생: {str(e)}")
        return None 