const express = require("express");
const cors = require("cors");
const path = require("path");

const { initDb } = require("./src/db");
const noticeRoutes = require("./src/routes/notices");
const crawlRoutes = require("./src/routes/crawl");

const app = express();

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

initDb();

//
// API
//
app.use("/api/notices", noticeRoutes);
app.use("/api/crawl", crawlRoutes);

//
// React build 경로
//
const frontendDistPath = path.join(__dirname, "../frontend/dist");

//
// React 정적 파일 제공
//
app.use(express.static(frontendDistPath));

//
// React SPA 처리
//
app.use((req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

//
// Server Start
//
app.listen(PORT, () => {
  console.log(`Support Calendar API running on port ${PORT}`);
});
