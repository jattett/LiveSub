import logging
import json
from typing import Dict, Set
from fastapi import WebSocket
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

# 연결된 클라이언트 관리
connected_clients: Set[WebSocket] = set()

async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 연결을 처리합니다."""
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "heartbeat":
                    await websocket.send_json({"type": "heartbeat", "timestamp": datetime.now().isoformat()})
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        connected_clients.remove(websocket)

async def broadcast_progress(video_id: str, progress: int):
    """모든 연결된 클라이언트에게 진행 상황을 브로드캐스트합니다."""
    message = {
        "type": "progress",
        "videoId": video_id,
        "progress": progress,
        "timestamp": datetime.now().isoformat()
    }
    for client in connected_clients.copy():
        try:
            if client.client_state.value == 1:  # WebSocketState.CONNECTED
                await client.send_json(message)
        except Exception as e:
            logger.error(f"Error broadcasting to client: {str(e)}")
            connected_clients.remove(client)

async def send_heartbeat():
    """주기적으로 하트비트를 전송합니다."""
    while True:
        try:
            message = {
                "type": "heartbeat",
                "timestamp": datetime.now().isoformat()
            }
            for client in connected_clients.copy():
                try:
                    if client.client_state.value == 1:  # WebSocketState.CONNECTED
                        await client.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending heartbeat to client: {str(e)}")
                    connected_clients.remove(client)
        except Exception as e:
            logger.error(f"Error in heartbeat loop: {str(e)}")
        await asyncio.sleep(30)  # 30초마다 하트비트 전송 