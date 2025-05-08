import React from "react";

interface Props {
  subtitle: string;
}

const SubtitleOverlay: React.FC<Props> = ({ subtitle }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "60px",
        width: "100%",
        textAlign: "center",
        color: "white",
        fontSize: "24px",
        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
      }}
    >
      {subtitle}
    </div>
  );
};

export default SubtitleOverlay;
