import React, { useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #333;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 1rem;
  color: #666;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const LanguageGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const LanguageLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: #f8f9fa;
  }
`;

const Button = styled.button`
  padding: 1rem 2rem;
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
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const VideoUpload: React.FC = () => {
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<string[]>([
    "ko",
    "en",
    "ja",
    "zh",
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError("");
    console.log("submit called", youtubeUrl, selectedLangs); // 디버깅용

    try {
      const response = await fetch("http://127.0.0.1:8081/api/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtubeUrl,
          targetLangs: selectedLangs,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to upload video");
      }

      const data = await response.json();
      console.log("Video uploaded successfully:", data);
      navigate("/");
    } catch (err) {
      console.error("Error uploading video:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsUploading(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLangs((prev) => {
      if (prev.includes(lang)) {
        return prev.filter((l) => l !== lang);
      }
      return [...prev, lang];
    });
  };

  return (
    <Container>
      <Title>Upload YouTube Video</Title>
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="youtubeUrl">YouTube URL</Label>
          <Input
            id="youtubeUrl"
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Enter YouTube video URL"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>Select Languages</Label>
          <LanguageGroup>
            <LanguageLabel>
              <input
                type="checkbox"
                id="ko"
                checked={selectedLangs.includes("ko")}
                onChange={() => handleLanguageChange("ko")}
              />
              <label htmlFor="ko">한국어</label>
            </LanguageLabel>
            <LanguageLabel>
              <input
                type="checkbox"
                id="en"
                checked={selectedLangs.includes("en")}
                onChange={() => handleLanguageChange("en")}
              />
              <label htmlFor="en">영어</label>
            </LanguageLabel>
            <LanguageLabel>
              <input
                type="checkbox"
                id="ja"
                checked={selectedLangs.includes("ja")}
                onChange={() => handleLanguageChange("ja")}
              />
              <label htmlFor="ja">일본어</label>
            </LanguageLabel>
            <LanguageLabel>
              <input
                type="checkbox"
                id="zh"
                checked={selectedLangs.includes("zh")}
                onChange={() => handleLanguageChange("zh")}
              />
              <label htmlFor="zh">중국어</label>
            </LanguageLabel>
          </LanguageGroup>
        </FormGroup>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Button type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload Video"}
        </Button>
      </Form>
    </Container>
  );
};

export default VideoUpload;
