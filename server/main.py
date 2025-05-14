import os
from fastapi import FastAPI, WebSocket, UploadFile, File, WebSocketDisconnect, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.websockets import WebSocketState
import whisper
import tempfile
import wave
import numpy as np
import subprocess
import logging
import json
import asyncio
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import yt_dlp
import uuid
import torch
from concurrent.futures import ThreadPoolExecutor
import httpx
import time

from models.video import Video, Subtitle
from services.firebase_service import (
    get_video_from_firebase,
    save_video_to_firebase,
    save_translation,
    get_translation,
    delete_video_from_firebase,
    get_cached_videos,
    update_video_cache,
    db
)
from services.video_service import process_video
from services.websocket_service import (
    websocket_endpoint,
    broadcast_progress,
    connected_clients,
    send_heartbeat
)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket 엔드포인트
app.websocket("/ws")(websocket_endpoint)
app.websocket("/ws/progress")(websocket_endpoint)

# 하트비트 태스크 시작
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(send_heartbeat())

class VideoUploadRequest(BaseModel):
    youtubeUrl: str
    targetLangs: list[str]

# 비디오 업로드 엔드포인트
@app.post("/api/videos")
async def upload_video(
    req: VideoUploadRequest,
    background_tasks: BackgroundTasks
):
    try:
        video_id = str(uuid.uuid4())
        background_tasks.add_task(process_video, video_id, req.youtubeUrl, req.targetLangs)
        return {"videoId": video_id, "message": "Video processing started"}
    except Exception as e:
        logger.error(f"비디오 업로드 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 비디오 정보 가져오기 엔드포인트
@app.get("/api/videos/{video_id}")
async def get_video(video_id: str):
    try:
        video = await get_video_from_firebase(video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        return video.to_dict()
    except Exception as e:
        logger.error(f"비디오 정보 가져오기 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 캐시된 비디오 목록 가져오기 엔드포인트
@app.get("/api/videos")
async def get_videos():
    try:
        videos = await get_cached_videos()
        return [video.to_dict() for video in videos]
    except Exception as e:
        logger.error(f"비디오 목록 가져오기 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 비디오 삭제 엔드포인트
@app.delete("/api/videos/{video_id}")
async def delete_video(video_id: str):
    try:
        success = await delete_video_from_firebase(video_id)
        if not success:
            raise HTTPException(status_code=404, detail="Video not found")
        return {"message": "Video deleted successfully"}
    except Exception as e:
        logger.error(f"비디오 삭제 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 번역 가져오기 엔드포인트
@app.get("/api/videos/{video_id}/translations/{language}")
async def get_video_translation(video_id: str, language: str):
    try:
        translation = await get_translation(video_id, language)
        if not translation:
            raise HTTPException(status_code=404, detail="Translation not found")
        return [sub.to_dict() for sub in translation]
    except Exception as e:
        logger.error(f"번역 가져오기 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8081) 