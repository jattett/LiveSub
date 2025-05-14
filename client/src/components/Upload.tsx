import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
  margin-bottom: 2rem;
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

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const Option = styled.option`
  padding: 0.5rem;
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

const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const Upload: React.FC = () => {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [targetLangs, setTargetLangs] = useState<string[]>(["ko"]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 서버 요청을 보내고 바로 메인 페이지로 이동
    fetch("http://localhost:8000/api/videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        youtubeUrl,
        targetLangs,
      }),
    }).catch((err) => {
      console.error("Error uploading video:", err);
    });

    // 서버 응답을 기다리지 않고 바로 메인 페이지로 이동
    navigate("/");
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setTargetLangs(selectedOptions);
  };

  return (
    <Container>
      <Title>Upload Video</Title>
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
          <Label htmlFor="targetLangs">Target Languages</Label>
          <Select
            id="targetLangs"
            multiple
            value={targetLangs}
            onChange={handleLanguageChange}
            required
          >
            <Option value="ko">한국어</Option>
            <Option value="en">영어</Option>
            <Option value="ja">일본어</Option>
            <Option value="zh">중국어</Option>
          </Select>
        </FormGroup>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <UploadButton type="submit">Upload</UploadButton>
      </Form>
    </Container>
  );
};

export default Upload;
