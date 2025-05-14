import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import ReactPlayer from "react-player";
import { Video, Subtitle } from "../types";
import { FaArrowLeft, FaTrash, FaList } from "react-icons/fa";

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
  margin-bottom: 2rem;
`;

const PlayerWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const CurrentSubtitleOverlay = styled.div`
  position: absolute;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 1.2rem;
  text-align: center;
  max-width: 80%;
  z-index: 1000;
`;

const VideoInfo = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #333;
`;

const Description = styled.p<{ $isExpanded: boolean }>`
  color: #666;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: ${(props) => (props.$isExpanded ? "none" : "3")};
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: ${(props) => (props.$isExpanded ? "1rem" : "0")};
`;

const ShowMoreButton = styled.button`
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  padding: 0;
  font-size: 0.875rem;
  &:hover {
    text-decoration: underline;
  }
`;

const SubtitleContainer = styled.div`
  margin-top: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const LanguageSelect = styled.select`
  padding: 8px;
  margin: 10px 0;
  border-radius: 4px;
  border: 1px solid #ddd;
`;

const SubtitleList = styled.div`
  max-height: 300px;
  overflow-y: auto;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
`;

const SubtitleItem = styled.div<{ $isActive: boolean }>`
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
  background: ${(props) => (props.$isActive ? "#e3f2fd" : "transparent")};
  transition: background-color 0.2s;
  cursor: pointer;
  &:hover {
    background: #f0f0f0;
  }
`;

const TimeStamp = styled.span`
  color: #666;
  margin-right: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  &:hover {
    color: #007bff;
    text-decoration: underline;
  }
`;

const SubtitleText = styled.span`
  color: #333;
  cursor: pointer;
  &:hover {
    color: #007bff;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: #666;
  font-size: 1.2rem;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 0.2s;

  &:hover {
    color: #007bff;
  }

  &.delete {
    &:hover {
      color: #dc3545;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const TranslationButton = styled.button`
  background-color: #4caf50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin: 10px 0;

  &:hover {
    background-color: #45a049;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const DetectedLanguage = styled.div`
  padding: 0.5rem;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
`;

const ProgressContainer = styled.div`
  margin: 1rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const ProgressBar = styled.div<{ $progress: number }>`
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;

  &::after {
    content: "";
    display: block;
    width: ${(props) => props.$progress}%;
    height: 100%;
    background: #007bff;
    transition: width 0.3s ease;
  }
`;

const ProgressText = styled.div`
  font-size: 0.875rem;
  color: #666;
  text-align: center;
`;

interface TranslatedSubtitles {
  [key: string]: Subtitle[];
}

const languageOptions = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "영어" },
  { value: "ja", label: "일본어" },
  { value: "zh", label: "중국어" },
];

const VideoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("original");
  const [currentTime, setCurrentTime] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedSubtitles, setTranslatedSubtitles] =
    useState<TranslatedSubtitles>({});
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const playerRef = useRef<ReactPlayer>(null);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // API 키 확인을 위한 디버깅 로그 추가
  useEffect(() => {
    const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    console.log("API Key exists:", !!apiKey);
    console.log("API Key length:", apiKey?.length);
  }, []);

  const translateText = async (
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> => {
    try {
      console.log("번역 시작:", { text, sourceLang, targetLang });

      const response = await fetch(
        `http://127.0.0.1:8081/api/translate-proxy?text=${encodeURIComponent(
          text
        )}&source_lang=${sourceLang}&target_lang=${targetLang}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `번역 요청 실패: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("번역 결과:", data);
      return data.translated_text || text;
    } catch (error) {
      console.error("번역 오류:", error);
      return text;
    }
  };

  const handleTranslate = async (force = false) => {
    if (!video?.subtitles || !video.detected_language) {
      return;
    }
    if (selectedLanguage === "original") {
      setTranslatedSubtitles((prev) => ({
        ...prev,
        [selectedLanguage]: video.subtitles,
      }));
      return;
    }

    setTranslating(true);
    setError(null);
    setTranslationProgress(0);
    setCurrentSubtitleIndex(0);

    try {
      // 1. force가 아니면 저장된 번역 먼저 조회
      if (!force) {
        const saved = await fetch(
          `http://127.0.0.1:8081/api/videos/${video.id}/translations/${selectedLanguage}`
        ).then((res) => res.json());
        if (saved && saved.subtitles && saved.subtitles.length > 0) {
          setTranslatedSubtitles((prev) => ({
            ...prev,
            [selectedLanguage]: saved.subtitles,
          }));
          return;
        }
      }

      // 2. 백엔드에서 한 번에 번역 수행
      const response = await fetch(
        `http://127.0.0.1:8081/api/translate-subtitles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subtitles: video.subtitles,
            target_lang: selectedLanguage,
            source_lang: video.detected_language,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("번역 요청 실패");
      }

      const data = await response.json();

      // 3. 번역 결과 저장
      await fetch(`http://127.0.0.1:8081/api/videos/${video.id}/translations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLanguage,
          subtitles: data.translatedSubtitles,
        }),
      });

      setTranslatedSubtitles((prev) => ({
        ...prev,
        [selectedLanguage]: data.translatedSubtitles,
      }));
    } catch (error) {
      console.error("번역 오류:", error);
      setError("번역 중 오류가 발생했습니다.");
    } finally {
      setTranslating(false);
      setTranslationProgress(0);
      setCurrentSubtitleIndex(0);
    }
  };

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return; // id가 없는 경우 early return

      try {
        const response = await fetch(`http://127.0.0.1:8081/api/videos/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch video");
        }
        const data = await response.json();
        setVideo(data);
        setError(null);
      } catch (error) {
        console.error("Error fetching video:", error);
        setError("비디오 정보를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
    const interval = setInterval(fetchVideo, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleTimeUpdate = (state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);

    // 현재 시간에 해당하는 자막 찾기
    const subtitles =
      selectedLanguage === "original"
        ? video?.subtitles || []
        : translatedSubtitles[selectedLanguage] || [];

    const currentSub = subtitles.find(
      (sub) =>
        state.playedSeconds >= sub.startTime &&
        state.playedSeconds <= sub.endTime
    );

    setCurrentSubtitle(currentSub?.text || "");
  };

  const handleSubtitleClick = (startTime: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(startTime);
      setIsPlaying(true); // 재생 시작
    }
  };

  const handleResultClick = () => {
    navigate("/"); // 메인 페이지로 이동
  };

  const handleDelete = async () => {
    if (!window.confirm("정말로 이 비디오를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8081/api/videos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete video");
      }

      navigate("/");
    } catch (error) {
      console.error("Error deleting video:", error);
      alert("비디오 삭제 중 오류가 발생했습니다.");
    }
  };

  // 언어 선택 핸들러 추가
  const handleLanguageChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLanguage = e.target.value;
    setSelectedLanguage(newLanguage);

    // 원본이 아닌 언어를 선택했을 때만 번역 실행
    if (
      newLanguage !== "original" &&
      video?.subtitles &&
      video?.detected_language
    ) {
      await handleTranslate();
    }
  };

  if (loading) {
    return <Container>Loading...</Container>;
  }

  if (error) {
    return <Container>Error: {error}</Container>;
  }

  if (!video) {
    return <Container>Video not found</Container>;
  }

  return (
    <Container>
      <Header>
        <Title>{video.title}</Title>
        <ButtonGroup>
          <IconButton onClick={handleResultClick} title="목록으로">
            <FaList />
          </IconButton>
          <IconButton onClick={() => navigate(-1)} title="뒤로가기">
            <FaArrowLeft />
          </IconButton>
          <IconButton onClick={handleDelete} className="delete" title="삭제">
            <FaTrash />
          </IconButton>
        </ButtonGroup>
      </Header>

      <VideoContainer>
        <PlayerWrapper>
          <ReactPlayer
            ref={playerRef}
            url={video.youtubeUrl}
            width="100%"
            height="100%"
            controls
            playing={isPlaying}
            onProgress={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {currentSubtitle && (
            <CurrentSubtitleOverlay>{currentSubtitle}</CurrentSubtitleOverlay>
          )}
        </PlayerWrapper>
      </VideoContainer>

      <VideoInfo>
        <Description $isExpanded={isDescriptionExpanded}>
          {video.description}
        </Description>
        <ShowMoreButton
          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
        >
          {isDescriptionExpanded ? "접기" : "더보기"}
        </ShowMoreButton>
      </VideoInfo>

      <SubtitleContainer>
        {video.detected_language && (
          <DetectedLanguage>
            감지된 언어: {video.detected_language}
          </DetectedLanguage>
        )}

        <LanguageSelect
          value={selectedLanguage}
          onChange={handleLanguageChange}
        >
          <option value="original">원본 자막</option>
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </LanguageSelect>

        {translating && (
          <ProgressContainer>
            <ProgressBar $progress={translationProgress} />
            <ProgressText>
              번역 중... ({currentSubtitleIndex + 1}/
              {video?.subtitles?.length || 0})
            </ProgressText>
          </ProgressContainer>
        )}

        <SubtitleList>
          {(selectedLanguage === "original"
            ? video.subtitles || []
            : translatedSubtitles[selectedLanguage] || []
          ).map((subtitle: Subtitle) => (
            <SubtitleItem
              key={subtitle.id}
              $isActive={
                currentTime >= subtitle.startTime &&
                currentTime <= subtitle.endTime
              }
              onClick={() => handleSubtitleClick(subtitle.startTime)}
            >
              <TimeStamp
                onClick={() => handleSubtitleClick(subtitle.startTime)}
              >
                {Math.floor(subtitle.startTime / 60)}:
                {String(Math.floor(subtitle.startTime % 60)).padStart(2, "0")}
              </TimeStamp>
              <SubtitleText
                onClick={() => handleSubtitleClick(subtitle.startTime)}
              >
                {subtitle.text}
              </SubtitleText>
            </SubtitleItem>
          ))}
        </SubtitleList>

        {/* 번역 버튼 조건부 렌더링 */}
        {selectedLanguage !== "original" &&
          (!translatedSubtitles[selectedLanguage] ||
            translatedSubtitles[selectedLanguage].length === 0) && (
            <TranslationButton
              onClick={() => handleTranslate()}
              disabled={translating}
            >
              번역하기
            </TranslationButton>
          )}

        {selectedLanguage !== "original" &&
          translatedSubtitles[selectedLanguage] &&
          translatedSubtitles[selectedLanguage].length > 0 && (
            <TranslationButton
              onClick={() => handleTranslate(true)}
              disabled={translating}
              style={{ backgroundColor: "#ff9800" }}
            >
              다시 번역하기
            </TranslationButton>
          )}
      </SubtitleContainer>
    </Container>
  );
};

export default VideoDetail;
