from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Subtitle(BaseModel):
    id: str
    startTime: float
    endTime: float
    text: str

    def to_dict(self):
        return {
            "id": self.id,
            "startTime": self.startTime,
            "endTime": self.endTime,
            "text": self.text
        }

    @classmethod
    def from_dict(cls, data: dict):
        return cls(**data)

class Video(BaseModel):
    id: str
    title: str
    description: str
    youtubeUrl: str
    thumbnailUrl: str
    uploadDate: datetime
    duration: str
    progress: int
    status: str
    subtitles: Optional[List[Subtitle]] = None
    detected_language: Optional[str] = None

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "youtubeUrl": self.youtubeUrl,
            "thumbnailUrl": self.thumbnailUrl,
            "uploadDate": self.uploadDate.isoformat(),
            "duration": self.duration,
            "progress": self.progress,
            "status": self.status,
            "subtitles": [sub.to_dict() for sub in self.subtitles] if self.subtitles else None,
            "detected_language": self.detected_language
        }

    @classmethod
    def from_dict(cls, data: dict):
        data["uploadDate"] = datetime.fromisoformat(data["uploadDate"])
        if data.get("subtitles"):
            data["subtitles"] = [Subtitle.from_dict(sub) for sub in data["subtitles"]]
        return cls(**data) 