import React, { useState } from "react";
import VideoPlayer from "./components/VideoPlayer";
import SubtitleOverlay from "./components/SubtitleOverlay";
import "antd/dist/reset.css";

const App = () => {
  const [subtitle, setSubtitle] = useState("자막 준비 중...");

  return (
    <div style={{ position: "relative", width: "800px", margin: "0 auto" }}>
      <VideoPlayer onSubtitleUpdate={setSubtitle} />
      <SubtitleOverlay subtitle={subtitle} />
    </div>
  );
};

export default App;
