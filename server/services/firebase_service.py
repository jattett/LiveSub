import logging
import time
from datetime import datetime
from typing import List, Dict, Optional
import firebase_admin
from firebase_admin import credentials, firestore
from pydantic import BaseModel
from models.video import Video, Subtitle
import os

logger = logging.getLogger(__name__)

# Firebase 초기화
try:
    # 이미 초기화된 앱이 있는지 확인
    if not firebase_admin._apps:
        cred_path = os.path.join(os.path.dirname(__file__), "..", "firebase-credentials.json")
        logger.info(f"Loading Firebase credentials from: {cred_path}")
        if not os.path.exists(cred_path):
            raise FileNotFoundError(f"Firebase credentials file not found at: {cred_path}")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    logger.info("Firebase 초기화 성공")
except Exception as e:
    logger.error(f"Firebase 초기화 실패: {str(e)}")
    raise

async def get_video_from_firebase(video_id: str) -> Optional[Video]:
    """Firebase에서 비디오 정보를 가져옵니다."""
    try:
        logger.info(f"Fetching video from Firebase: {video_id}")
        doc = db.collection('videos').document(video_id).get()
        if doc.exists:
            data = doc.to_dict()
            logger.info(f"Video data retrieved: {data}")
            return Video.from_dict(data)
        logger.warning(f"Video not found in Firebase: {video_id}")
        return None
    except Exception as e:
        logger.error(f"Firebase에서 비디오 가져오기 실패: {str(e)}")
        return None

async def save_video_to_firebase(video: Video) -> bool:
    """비디오 정보를 Firebase에 저장합니다."""
    try:
        logger.info(f"Saving video to Firebase: {video.id}")
        db.collection('videos').document(video.id).set(video.to_dict())
        return True
    except Exception as e:
        logger.error(f"Firebase에 비디오 저장 실패: {str(e)}")
        return False

async def save_translation(video_id: str, language: str, subtitles: List[Subtitle]) -> bool:
    """번역된 자막을 Firebase에 저장합니다."""
    try:
        logger.info(f"Saving translation to Firebase: {video_id} - {language}")
        translation_data = {
            "language": language,
            "subtitles": [sub.to_dict() for sub in subtitles],
            "updated_at": datetime.now().isoformat()
        }
        db.collection('translations').document(f"{video_id}_{language}").set(translation_data)
        return True
    except Exception as e:
        logger.error(f"Firebase에 번역 저장 실패: {str(e)}")
        return False

async def get_translation(video_id: str, language: str) -> Optional[List[Subtitle]]:
    """Firebase에서 번역된 자막을 가져옵니다."""
    try:
        logger.info(f"Fetching translation from Firebase: {video_id} - {language}")
        doc = db.collection('translations').document(f"{video_id}_{language}").get()
        if doc.exists:
            data = doc.to_dict()
            return [Subtitle.from_dict(sub) for sub in data.get("subtitles", [])]
        logger.warning(f"Translation not found in Firebase: {video_id} - {language}")
        return None
    except Exception as e:
        logger.error(f"Firebase에서 번역 가져오기 실패: {str(e)}")
        return None

async def delete_video_from_firebase(video_id: str) -> bool:
    """Firebase에서 비디오 정보를 삭제합니다."""
    try:
        logger.info(f"Deleting video from Firebase: {video_id}")
        db.collection('videos').document(video_id).delete()
        return True
    except Exception as e:
        logger.error(f"Firebase에서 비디오 삭제 실패: {str(e)}")
        return False

async def get_cached_videos() -> List[Video]:
    """Firebase에서 캐시된 비디오 목록을 가져옵니다."""
    try:
        logger.info("Fetching cached videos from Firebase")
        videos = []
        docs = db.collection('videos').stream()
        for doc in docs:
            data = doc.to_dict()
            # id 필드가 없으면 doc.id로 보완
            if "id" not in data:
                data["id"] = doc.id
            videos.append(Video.from_dict(data))
        logger.info(f"Retrieved {len(videos)} videos from Firebase")
        return videos
    except Exception as e:
        logger.error(f"Firebase에서 캐시된 비디오 가져오기 실패: {str(e)}")
        return []

async def update_video_cache(video: Video) -> bool:
    """비디오 캐시를 업데이트합니다."""
    try:
        logger.info(f"Updating video cache in Firebase: {video.id}")
        db.collection('videos').document(video.id).set(video.to_dict())
        return True
    except Exception as e:
        logger.error(f"Firebase 비디오 캐시 업데이트 실패: {str(e)}")
        return False 