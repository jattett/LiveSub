import logging
import yt_dlp
import os
import wave
import numpy as np
from typing import Dict, Any, Optional, List
from datetime import datetime
from models.video import Video, Subtitle
from services.firebase_service import save_video_to_firebase, update_video_cache
from services.websocket_service import broadcast_progress
from services.transcription_service import transcribe_audio
from services.translation_service import translate_subtitles

logger = logging.getLogger(__name__)

async def process_video(video_id: str, youtube_url: str, target_langs: List[str]) -> Optional[Video]:
    video = None
    try:
        logger.info(f"Start processing video: {video_id} {youtube_url}")
        # 1. 유튜브 오디오 다운로드
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
            }],
            'outtmpl': f'temp/{video_id}.%(ext)s',
            'noplaylist': True,
            'quiet': False,
            'nocheckcertificate': True,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            video = Video(
                id=video_id,
                title=info['title'],
                description=info.get('description', ''),
                youtubeUrl=youtube_url,
                thumbnailUrl=info.get('thumbnail', ''),
                uploadDate=datetime.now(),
                duration=str(info.get('duration', 0)),
                progress=0,
                status='processing'
            )
            await save_video_to_firebase(video)
            audio_path = f'temp/{video_id}.wav'
            if not os.path.exists(audio_path):
                raise Exception("Audio file not found")
            with wave.open(audio_path, 'rb') as wf:
                n_channels = wf.getnchannels()
                frame_rate = wf.getframerate()
                n_frames = wf.getnframes()
                audio_data = wf.readframes(n_frames)
                audio_array = np.frombuffer(audio_data, dtype=np.int16)
                if n_channels == 2:
                    audio_array = audio_array.reshape((-1, 2)).mean(axis=1)
                # float32 변환 및 정규화
                audio_array = audio_array.astype(np.float32) / 32768.0
                logger.info(f"audio_array shape: {audio_array.shape}, dtype: {audio_array.dtype}, min: {audio_array.min()}, max: {audio_array.max()}")
                logger.info(f"frame_rate: {frame_rate}")
            video.progress = 50
            await update_video_cache(video)
            await broadcast_progress(video_id, 50)
            # 2. Whisper로 자막 생성
            logger.info("Transcribing audio with Whisper...")
            subtitles = await transcribe_audio(audio_array, frame_rate)
            logger.info(f"Whisper result: {subtitles}")
            if subtitles:
                video.subtitles = subtitles
                video.progress = 100
                video.status = 'completed'
            else:
                video.status = 'error'
                logger.error("Whisper failed to generate subtitles.")
            # 3. Firestore에 자막 저장
            await update_video_cache(video)
            await broadcast_progress(video_id, 100)
            os.remove(audio_path)
            return video
    except Exception as e:
        logger.error(f"비디오 처리 중 오류 발생: {str(e)}")
        if video:
            video.status = 'error'
            await update_video_cache(video)
        return None 