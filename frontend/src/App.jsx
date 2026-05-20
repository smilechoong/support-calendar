import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./MainPage";
import NoticeDetailPage from "./NoticeDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/notices/:id" element={<NoticeDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
