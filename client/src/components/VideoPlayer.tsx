import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import ReactPlayer from "react-player";

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
`;

const PlayerWrapper = styled.div`
  position: relative;
  padding-top: 56.25%; /* 16:9 비율 */
`;

const Player = styled(ReactPlayer)`
  position: absolute;
  top: 0;
  left: 0;
`;

const SubtitleContainer = styled.div`
  margin-top: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const InputContainer = styled.div`
  margin-bottom: 20px;
`;

const UrlInput = styled.input`
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const VideoPlayer: React.FC = () => {
  const [url, setUrl] = useState<string>("");
  const playerRef = useRef<ReactPlayer>(null);
  const [subtitles, setSubtitles] = useState<{
    original: string;
    translated: string;
  }>({
    original: "",
    translated: "",
  });
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const WS_URL = "ws://127.0.0.1:8000/ws";

  const connectWebSocket = () => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      console.log("WebSocket이 이미 연결 중이거나 연결되어 있습니다.");
      return;
    }

    try {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          console.error("이전 WebSocket 연결 정리 중 오류:", e);
        }
        wsRef.current = null;
      }

      console.log("WebSocket 연결 시도...", WS_URL);
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log("WebSocket 연결됨");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("서버로부터 받은 자막:", data);

          if (data && data.original) {
            console.log("자막 상태 업데이트:", data);
            setSubtitles({
              original: data.original,
              translated: data.translated || data.original,
            });
          }
        } catch (error) {
          console.error("자막 데이터 파싱 오류:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket 에러 발생:", error);
        console.log("WebSocket 상태:", wsRef.current?.readyState);
        console.log("WebSocket URL:", wsRef.current?.url);
        setIsConnected(false);

        // 에러 발생 시 즉시 재연결 시도
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          console.log(
            `${delay}ms 후 재연결 시도... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          );

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, delay);
        } else {
          console.error("최대 재연결 시도 횟수를 초과했습니다.");
          alert("서버와의 연결이 불안정합니다. 페이지를 새로고침해주세요.");
        }
      };

      wsRef.current.onclose = (event) => {
        console.log("WebSocket 연결 종료:", event.code, event.reason);
        setIsConnected(false);

        // 정상적인 종료가 아닌 경우에만 재연결 시도
        if (
          event.code !== 1000 &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          if (!reconnectTimeoutRef.current) {
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttemptsRef.current),
              30000
            );
            console.log(
              `${delay}ms 후 재연결 시도... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
            );

            reconnectTimeoutRef.current = window.setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connectWebSocket();
            }, delay);
          }
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error("최대 재연결 시도 횟수를 초과했습니다.");
          alert("서버와의 연결이 불안정합니다. 페이지를 새로고침해주세요.");
        }
      };
    } catch (error) {
      console.error("WebSocket 연결 실패:", error);
      setIsConnected(false);
    }
  };

  const startAudioCapture = async () => {
    if (
      !playerRef.current ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      console.log("플레이어나 WebSocket이 준비되지 않음");
      return;
    }

    try {
      setIsCapturing(true);

      // YouTube 플레이어가 준비될 때까지 대기
      if (!isPlayerReady) {
        console.log("플레이어가 아직 준비되지 않음");
        return;
      }

      // 오디오 컨텍스트 생성
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }

      const audioContext = new AudioContext({
        sampleRate: 16000,
        latencyHint: "interactive",
      });
      audioContextRef.current = audioContext;

      // YouTube 플레이어의 오디오 요소 가져오기
      const videoElement = playerRef.current.getInternalPlayer();
      if (!videoElement) {
        throw new Error("비디오 요소를 찾을 수 없습니다.");
      }

      // 비디오 요소에서 오디오 스트림 생성
      const stream = videoElement.captureStream();
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);

      // 오디오 데이터를 WAV로 변환하는 함수
      const convertToWav = (audioData: Float32Array) => {
        const wavBuffer = new ArrayBuffer(44 + audioData.length * 2);
        const view = new DataView(wavBuffer);

        // WAV 헤더 작성
        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };

        writeString(0, "RIFF"); // ChunkID
        view.setUint32(4, 36 + audioData.length * 2, true); // ChunkSize
        writeString(8, "WAVE"); // Format
        writeString(12, "fmt "); // Subchunk1ID
        view.setUint32(16, 16, true); // Subchunk1Size
        view.setUint16(20, 1, true); // AudioFormat (PCM)
        view.setUint16(22, 1, true); // NumChannels (Mono)
        view.setUint32(24, 16000, true); // SampleRate
        view.setUint32(28, 16000 * 2, true); // ByteRate
        view.setUint16(32, 2, true); // BlockAlign
        view.setUint16(34, 16, true); // BitsPerSample
        writeString(36, "data"); // Subchunk2ID
        view.setUint32(40, audioData.length * 2, true); // Subchunk2Size

        // 오디오 데이터 작성
        const offset = 44;
        for (let i = 0; i < audioData.length; i++) {
          const sample = Math.max(-1, Math.min(1, audioData[i]));
          view.setInt16(offset + i * 2, sample * 0x7fff, true);
        }

        return new Blob([wavBuffer], { type: "audio/wav" });
      };

      // 오디오 데이터 수집을 위한 ScriptProcessorNode 생성
      const bufferSize = 16384;
      const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

      // 오디오 데이터를 누적할 버퍼
      let audioBuffer: Float32Array[] = [];
      const MAX_BUFFER_LENGTH = 16000 * 2; // 2초 분량의 오디오 데이터

      scriptNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(inputData);

        // 버퍼가 충분히 쌓이면 전송
        if (audioBuffer.length * bufferSize >= MAX_BUFFER_LENGTH) {
          // 모든 오디오 데이터를 하나의 Float32Array로 결합
          const combinedData = new Float32Array(
            audioBuffer.length * bufferSize
          );
          audioBuffer.forEach((data, index) => {
            combinedData.set(data, index * bufferSize);
          });

          const wavBlob = convertToWav(combinedData);

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wavBlob.arrayBuffer().then((arrayBuffer) => {
              if (arrayBuffer.byteLength >= 100) {
                console.log(
                  "오디오 데이터 전송:",
                  arrayBuffer.byteLength,
                  "bytes"
                );
                wsRef.current?.send(arrayBuffer);
              }
            });
          }

          // 버퍼 초기화
          audioBuffer = [];
        }
      };

      // ScriptProcessorNode 연결
      source.connect(scriptNode);
      scriptNode.connect(audioContext.destination);

      // 정리 함수 저장
      const cleanup = () => {
        scriptNode.disconnect();
        source.disconnect();
        destination.disconnect();
        if (audioContext.state !== "closed") {
          audioContext.close();
        }
      };

      // 컴포넌트 언마운트 시 정리
      return cleanup;
    } catch (error) {
      console.error("오디오 캡처 중 오류:", error);
      setIsCapturing(false);
      alert("오디오 캡처를 시작할 수 없습니다.");
    }
  };

  const stopAudioCapture = () => {
    console.log("오디오 캡처 중지 시도:", {
      hasContext: !!audioContextRef.current,
    });

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsCapturing(false);
    console.log("오디오 캡처 중지 완료");
  };

  // 컴포넌트 마운트 시 WebSocket 연결
  useEffect(() => {
    let mounted = true;

    const initializeConnection = async () => {
      if (mounted) {
        connectWebSocket();
      }
    };

    initializeConnection();

    // 컴포넌트 언마운트 시 정리
    return () => {
      mounted = false;
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "Component unmounting");
        } catch (e) {
          console.error("WebSocket 종료 중 오류:", e);
        }
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      stopAudioCapture();
    };
  }, []);

  // URL이 변경될 때마다 오디오 캡처 시작
  useEffect(() => {
    if (url && isConnected && isPlayerReady) {
      // 플레이어가 준비된 후 약간의 지연을 두고 오디오 캡처 시작
      const timer = setTimeout(() => {
        startAudioCapture();
      }, 1000);
      return () => {
        clearTimeout(timer);
        stopAudioCapture();
      };
    }
    return () => {
      stopAudioCapture();
    };
  }, [url, isConnected, isPlayerReady]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  return (
    <VideoContainer>
      <InputContainer>
        <UrlInput
          type="text"
          placeholder="YouTube URL을 입력하세요"
          value={url}
          onChange={handleUrlChange}
        />
        {!isConnected && (
          <div style={{ color: "red", marginTop: "10px" }}>
            서버와 연결이 끊어졌습니다. 재연결을 시도합니다...
          </div>
        )}
      </InputContainer>
      <PlayerWrapper>
        <Player
          ref={playerRef}
          url={url}
          width="100%"
          height="100%"
          controls
          playing
          config={{
            youtube: {
              playerVars: { showinfo: 1 },
            },
          }}
          onReady={() => {
            console.log("플레이어 준비 완료");
            setIsPlayerReady(true);
          }}
          onPlay={() => {
            console.log("비디오 재생 시작");
            if (isConnected && isPlayerReady) {
              startAudioCapture();
            }
          }}
          onPause={() => {
            console.log("비디오 일시정지");
            stopAudioCapture();
          }}
          onEnded={stopAudioCapture}
        />
      </PlayerWrapper>
      <SubtitleContainer>
        {isCapturing && isConnected ? (
          subtitles.original ? (
            <>
              <div
                style={{
                  fontSize: "1.2em",
                  color: "#333",
                  marginBottom: "10px",
                }}
              >
                {subtitles.original}
              </div>
              {subtitles.translated &&
                subtitles.translated !== subtitles.original && (
                  <div
                    style={{
                      fontSize: "1.2em",
                      color: "#666",
                      borderTop: "1px solid #ddd",
                      paddingTop: "10px",
                    }}
                  >
                    {subtitles.translated}
                  </div>
                )}
            </>
          ) : (
            <div
              style={{
                color: "#666",
                fontStyle: "italic",
                textAlign: "center",
                padding: "10px",
              }}
            >
              음성 인식 중...
            </div>
          )
        ) : (
          <div
            style={{
              color: "#666",
              fontStyle: "italic",
              textAlign: "center",
              padding: "10px",
            }}
          >
            자막 준비중...
          </div>
        )}
      </SubtitleContainer>
    </VideoContainer>
  );
};

export default VideoPlayer;
