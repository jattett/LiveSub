import React, { useRef, useState } from "react";
import { useSubtitles } from "../hooks/useSubtitles";
import SubtitlesProgress from "./SubtitlesProgress";

interface Props {
  onSubtitleUpdate?: (subtitle: string) => void;
}

const VideoPlayer: React.FC<Props> = ({ onSubtitleUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const { progress, status, processAudio } = useSubtitles(onSubtitleUpdate);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.warn("[📁] 파일이 없습니다.");
      return;
    }

    if (videoUrl) URL.revokeObjectURL(videoUrl);

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    console.log("[🎬] 영상 URL 생성됨:", url);

    // 🎯 렌더링 완료 기다리기
    setTimeout(async () => {
      const video = videoRef.current;
      if (!video) {
        console.error("[❌] videoRef 여전히 없음");
        return;
      }

      video.src = url;

      try {
        await video.play();
        console.log("[▶️] 영상 재생 시작");
      } catch (err) {
        console.warn("[🚫] 영상 자동 재생 실패:", err);
      }

      const audioCtx = new AudioContext();
      const sourceNode = audioCtx.createMediaElementSource(video);
      const destination = audioCtx.createMediaStreamDestination();

      sourceNode.connect(destination);
      sourceNode.connect(audioCtx.destination);

      const mediaRecorder = new MediaRecorder(destination.stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.onstart = () => {
        console.log("[🔴] 녹음 시작됨 (5초)");
      };

      mediaRecorder.ondataavailable = (e) => {
        console.log("[📥] 데이터 수신됨:", e.data);
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error("[❗] MediaRecorder 오류:", e);
      };

      mediaRecorder.onstop = async () => {
        console.log("[🛑] 녹음 종료됨");

        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        console.log("[📦] 오디오 Blob 생성 완료:", audioBlob);

        try {
          await processAudio(audioBlob);
          console.log("[✅] processAudio 호출 완료");
        } catch (err) {
          console.error("[❌] processAudio 실패:", err);
        }
      };

      mediaRecorder.start();

      setTimeout(() => {
        console.log("[⏱️] 5초 경과 → 녹음 종료 시도");
        mediaRecorder.stop();
      }, 5000);
    }, 100); // 렌더링 대기
  };

  return (
    <div>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      {videoUrl && (
        <>
          <video
            ref={videoRef}
            controls
            width="100%"
            style={{ marginTop: 16 }}
          />
          <SubtitlesProgress progress={progress} status={status} />
        </>
      )}
    </div>
  );
};

export default VideoPlayer;
