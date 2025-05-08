import React from "react";
import { Progress } from "antd";

interface Props {
  progress: number;
  status: string;
}

const SubtitlesProgress: React.FC<Props> = ({ progress, status }) => {
  return (
    <div style={{ marginTop: 16 }}>
      <Progress
        percent={progress}
        status={
          status === "error"
            ? "exception"
            : status === "done"
            ? "success"
            : "active"
        }
      />
      <p>
        {status === "processing" && "자막 생성 중..."}
        {status === "done" && "자막 생성 완료!"}
        {status === "error" && "자막 생성 실패"}
      </p>
    </div>
  );
};

export default SubtitlesProgress;
