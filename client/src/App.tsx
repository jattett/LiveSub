import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import VideoList from "./components/VideoList";
import VideoUpload from "./components/VideoUpload";
import VideoDetail from "./components/VideoDetail";
import styled from "styled-components";

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const App: React.FC = () => {
  return (
    <Router>
      <AppContainer>
        <Routes>
          <Route path="/" element={<VideoList />} />
          <Route path="/upload" element={<VideoUpload />} />
          <Route path="/videos/:id" element={<VideoDetail />} />
        </Routes>
      </AppContainer>
    </Router>
  );
};

export default App;
