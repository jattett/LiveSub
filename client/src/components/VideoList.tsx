import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
  margin: 0;
`;

const UploadButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover {
    background-color: #0056b3;
  }
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
`;

const VideoCard = styled.div`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  position: relative;
  cursor: pointer;
  &:hover {
    transform: translateY(-4px);
  }
`;

const VideoThumbnail = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
  background-color: #f0f0f0;
`;

const VideoInfo = styled.div`
  padding: 1rem;
`;

const VideoTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const VideoDuration = styled.p`
  margin: 0;
  color: #666;
  font-size: 0.9rem;
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  ${VideoCard}:hover & {
    opacity: 1;
  }
  &:hover {
    background-color: #dc3545;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #e9ecef;
  margin-top: 0.5rem;
  border-radius: 2px;
  overflow: hidden;
`;

const Progress = styled.div<{ width: number }>`
  width: ${(props) => props.width}%;
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
`;

const StatusText = styled.div`
  color: #666;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: ${(props) => {
    switch (props.$status) {
      case "completed":
        return "#28a745";
      case "processing":
        return "#007bff";
      case "failed":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  }};
  color: white;
  margin-left: 0.5rem;
`;

const TranslationBadge = styled.span<{ lang: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: ${({ lang }) => {
    switch (lang) {
      case "ko":
        return "#2196F3";
      case "en":
        return "#4CAF50";
      case "ja":
        return "#FF9800";
      case "zh":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  }};
  color: white;
  margin-left: 0.5rem;
`;

const BadgeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.5rem;
`;

interface VideoData {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: string;
  progress: number;
  status: string;
  subtitles: Array<{
    id: string;
    startTime: number;
    endTime: number;
    text: string;
  }>;
  detected_language?: string;
  targetLangs?: string[];
  translations?: {
    [key: string]: Array<{
      id: string;
      startTime: number;
      endTime: number;
      text: string;
    }>;
  };
}

const VideoList: React.FC = () => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const heartbeatIntervalRef = useRef<number | null>(null);

  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, 15000); // 15초마다 heartbeat 전송
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const connectWebSocket = async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnecting) {
      console.log("WebSocket is already connected or connecting");
      return;
    }

    try {
      setIsConnecting(true);
      console.log("Connecting to WebSocket: ws://127.0.0.1:8081/ws/progress");
      wsRef.current = new WebSocket("ws://127.0.0.1:8081/ws/progress");

      // 연결 타임아웃 설정
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          console.error("WebSocket connection timeout");
          wsRef.current?.close();
          wsRef.current = null;
          setIsConnecting(false);
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1;
            setTimeout(connectWebSocket, 3000);
          }
        }
      }, 5000);

      wsRef.current.onopen = () => {
        console.log("WebSocket connection established");
        clearTimeout(connectionTimeout);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        if (reconnectTimeoutRef.current) {
          window.clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        startHeartbeat();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "initial") {
            console.log("Initial connection message received:", data.message);
            return;
          }
          if (data.type === "progress") {
            setVideos((prevVideos) =>
              prevVideos.map((video) =>
                video.id === data.videoId
                  ? { ...video, progress: data.progress, status: data.status }
                  : video
              )
            );
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        clearTimeout(connectionTimeout);
        setIsConnecting(false);
        stopHeartbeat();
        if (wsRef.current?.readyState !== WebSocket.CLOSED) {
          try {
            wsRef.current?.close();
          } catch (e) {
            console.error("Error closing WebSocket on error:", e);
          }
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        clearTimeout(connectionTimeout);
        setIsConnecting(false);
        stopHeartbeat();
        wsRef.current = null;

        // 정상적인 종료가 아닌 경우에만 재연결 시도
        if (
          event.code !== 1000 &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          console.log(
            `Attempting to reconnect in ${delay}ms... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          );

          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connectWebSocket();
            }, delay);
          }
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error("Max reconnection attempts reached");
          setError("서버와의 연결이 불안정합니다. 페이지를 새로고침해주세요.");
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      setIsConnecting(false);
      stopHeartbeat();

      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        console.log(
          `Attempting to reconnect in ${delay}ms... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
        );

        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, delay);
        }
      } else {
        console.error("Max reconnection attempts reached");
        setError("서버와의 연결이 불안정합니다. 페이지를 새로고침해주세요.");
      }
    }
  };

  const fetchVideos = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8081/api/videos");
      if (!response.ok) {
        throw new Error("Failed to fetch videos");
      }
      const data = await response.json();
      console.log("Fetched video data:", data); // 데이터 확인용 로그
      const processedVideos = data.map((video: VideoData) => ({
        ...video,
        status: video.status || "pending",
        progress: video.progress || 0,
        subtitles: video.subtitles || [],
        title: video.title || "Untitled Video",
        duration: video.duration || "Unknown",
        thumbnailUrl:
          video.thumbnailUrl ||
          "https://via.placeholder.com/300x180?text=No+Thumbnail",
        targetLangs: video.targetLangs || [], // targetLangs 기본값 설정
      }));
      console.log("Processed videos:", processedVideos); // 처리된 데이터 확인용 로그
      setVideos(processedVideos);
      setError(null);
    } catch (error) {
      console.error("Error fetching videos:", error);
      setError("비디오 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeConnection = async () => {
      if (mounted) {
        await fetchVideos();
        connectWebSocket();
      }
    };

    initializeConnection();

    const interval = setInterval(fetchVideos, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          console.error("Error closing WebSocket on cleanup:", e);
        }
        wsRef.current = null;
      }
    };
  }, []);

  const handleDelete = async (videoId: string) => {
    if (!window.confirm("정말로 이 비디오를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8081/api/videos/${videoId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete video");
      }

      // 삭제 후 비디오 목록 새로고침
      fetchVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      alert("비디오 삭제 중 오류가 발생했습니다.");
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "대기중";
      case "processing":
        return "처리중";
      case "completed":
        return "완료";
      case "failed":
        return "실패";
      default:
        return status;
    }
  };

  const getTranslationBadges = (video: VideoData) => {
    const badges: Array<{ lang: string; label: string }> = [];

    // translations 객체가 있고 비어있지 않은 경우에만 처리
    if (video.translations && Object.keys(video.translations).length > 0) {
      Object.entries(video.translations).forEach(([lang, subtitles]) => {
        // 번역된 자막이 있는 경우에만 뱃지 추가
        if (subtitles && subtitles.length > 0) {
          switch (lang) {
            case "ko":
              badges.push({ lang: "ko", label: "한국어" });
              break;
            case "en":
              badges.push({ lang: "en", label: "영어" });
              break;
            case "ja":
              badges.push({ lang: "ja", label: "일본어" });
              break;
            case "zh":
              badges.push({ lang: "zh", label: "중국어" });
              break;
          }
        }
      });
    }

    return badges;
  };

  const calculateProgress = (video: VideoData) => {
    if (video.status === "completed") return 100;
    if (video.status === "failed") return 0;
    if (video.status === "pending") return 0;

    // 처리 중인 경우, 현재 처리된 시간을 기반으로 진행률 계산
    const totalDuration = parseInt(video.duration) || 0;
    if (totalDuration === 0) return video.progress; // 기존 진행률 사용

    // 현재 처리된 시간을 초 단위로 계산
    const processedTime = Math.floor((video.progress / 100) * totalDuration);
    const progress = Math.min(
      Math.floor((processedTime / totalDuration) * 100),
      99
    );

    return progress;
  };

  return (
    <Container>
      <Header>
        <Title>Video List</Title>
        <UploadButton onClick={() => navigate("/upload")}>
          Upload Video
        </UploadButton>
      </Header>

      {loading && <div>Loading...</div>}
      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>
      )}

      {!loading && !error && videos.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          등록된 비디오가 없습니다.
        </div>
      )}

      <VideoGrid>
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            onClick={() => navigate(`/videos/${video.id}`)}
          >
            <VideoThumbnail src={video.thumbnailUrl} alt={video.title} />
            <VideoInfo>
              <VideoTitle>{video.title}</VideoTitle>
              <VideoDuration>Duration: {video.duration}</VideoDuration>
              <ProgressBar>
                <Progress width={calculateProgress(video)} />
              </ProgressBar>
              <StatusText>
                <StatusRow>
                  <span>Status: {getStatusText(video.status)}</span>
                  <StatusBadge $status={video.status}>
                    {calculateProgress(video)}%
                  </StatusBadge>
                </StatusRow>
                <BadgeContainer>
                  {getTranslationBadges(video).map((badge) => (
                    <TranslationBadge key={badge.lang} lang={badge.lang}>
                      {badge.label}
                    </TranslationBadge>
                  ))}
                </BadgeContainer>
              </StatusText>
            </VideoInfo>
            <DeleteButton
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(video.id);
              }}
            >
              Delete
            </DeleteButton>
          </VideoCard>
        ))}
      </VideoGrid>
    </Container>
  );
};

export default VideoList;
