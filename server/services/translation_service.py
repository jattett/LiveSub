import logging
import httpx
from typing import List, Optional
from models.video import Subtitle
import os

logger = logging.getLogger(__name__)

async def translate_subtitles(subtitles: List[Subtitle], target_language: str) -> Optional[List[Subtitle]]:
    """자막을 대상 언어로 번역합니다."""
    try:
        # Google Cloud Translation API 엔드포인트
        url = "https://translation.googleapis.com/language/translate/v2"
        
        # API 키는 환경 변수에서 가져옴
        api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY")
        if not api_key:
            raise ValueError("Google Translate API key not found")
        
        # 번역할 텍스트 추출
        texts = [sub.text for sub in subtitles]
        
        # API 요청
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                params={
                    "key": api_key,
                    "q": texts,
                    "target": target_language
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Translation API error: {response.text}")
            
            # 응답 파싱
            result = response.json()
            translations = result["data"]["translations"]
            
            # 번역된 자막 생성
            translated_subtitles = []
            for i, (subtitle, translation) in enumerate(zip(subtitles, translations)):
                translated_subtitle = Subtitle(
                    id=f"{subtitle.id}_translated",
                    startTime=subtitle.startTime,
                    endTime=subtitle.endTime,
                    text=translation["translatedText"]
                )
                translated_subtitles.append(translated_subtitle)
            
            return translated_subtitles
            
    except Exception as e:
        logger.error(f"자막 번역 중 오류 발생: {str(e)}")
        return None 