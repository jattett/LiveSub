import { useState } from "react";

export const useSubtitles = (onSubtitleUpdate?: (text: string) => void) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "processing" | "done" | "error"
  >("idle");

  const processAudio = async (blob: Blob) => {
    setStatus("processing");
    setProgress(30);

    try {
      const formData = new FormData();
      formData.append("file", blob, "audio.webm");

      const res = await fetch("http://localhost:8000/transcribe", {
        method: "POST",
        body: formData,
      });

      setProgress(80);
      const data = await res.json();
      console.log("[DEBUG] 서버 응답 수신:", data);

      onSubtitleUpdate?.(data.text);
      setProgress(100);
      setStatus("done");
    } catch (err) {
      console.error("자막 처리 실패:", err);
      setStatus("error");
    }
  };

  return { progress, status, processAudio };
};
