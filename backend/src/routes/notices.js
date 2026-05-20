const express = require("express");
const router = express.Router();
const { db } = require("../db");
const axios = require("axios");
const cheerio = require("cheerio");

router.get("/", (req, res) => {
  const items = db
    .prepare(
      `
    SELECT *
    FROM notices
    ORDER BY end_date ASC, id DESC
  `,
    )
    .all();

  res.json({
    success: true,
    items,
  });
});
router.get("/:id", (req, res) => {
  const item = db
    .prepare(
      `
    SELECT *
    FROM notices
    WHERE id = ?
  `,
    )
    .get(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "공고를 찾을 수 없습니다.",
    });
  }

  res.json({
    success: true,
    item,
  });
});
router.post("/:id/collect-detail", async (req, res) => {
  try {
    const notice = db
      .prepare(
        `
      SELECT *
      FROM notices
      WHERE id = ?
    `,
      )
      .get(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "공고를 찾을 수 없습니다.",
      });
    }

    const detailUrl = notice.detail_url || notice.url;

    const { data } = await axios.get(detailUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(data);

    $("script, style, noscript").remove();

    const fullText = $("body").text().replace(/\s+/g, " ").trim();

    const content = extractSection(fullText, [
      "지원내용",
      "사업내용",
      "지원 사항",
      "지원분야",
      "지원 내용",
    ]);

    const eligibility = extractSection(fullText, [
      "신청자격",
      "지원대상",
      "신청대상",
      "자격요건",
      "지원 자격",
    ]);

    const supportScale = extractSection(fullText, [
      "지원규모",
      "지원금액",
      "사업비",
      "지원 한도",
      "지원규모 및 내용",
    ]);

    const requiredDocs = extractSection(fullText, [
      "제출서류",
      "제출 서류",
      "신청서류",
      "구비서류",
    ]);

    const publishedDate = extractDate(fullText, [
      "공고일자",
      "등록일자",
      "공고일",
    ]);

    db.prepare(
      `
      UPDATE notices
      SET content = ?,
          eligibility = ?,
          support_scale = ?,
          required_docs = ?,
          published_date = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(
      content,
      eligibility,
      supportScale,
      requiredDocs,
      publishedDate,
      req.params.id,
    );

    const updated = db
      .prepare(
        `
      SELECT *
      FROM notices
      WHERE id = ?
    `,
      )
      .get(req.params.id);

    res.json({
      success: true,
      item: updated,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

function extractSection(text, keywords) {
  for (const keyword of keywords) {
    const index = text.indexOf(keyword);

    if (index < 0) continue;

    const sliced = text.slice(index, index + 1200);

    return sliced.trim();
  }

  return null;
}

function extractDate(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*(\\d{4}-\\d{2}-\\d{2})`);
    const match = text.match(regex);

    if (match) return match[1];
  }

  return null;
}
router.post("/:id/local-summary", async (req, res) => {
  try {
    const notice = db
      .prepare(
        `
      SELECT *
      FROM notices
      WHERE id = ?
    `,
      )
      .get(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "공고를 찾을 수 없습니다.",
      });
    }

    const prompt = `
너는 대한민국 정부지원사업 공고 분석 도우미다.
아래 공고 내용을 보기 쉽게 정리해줘.

반드시 아래 형식으로 출력:
1. 사업 개요
2. 지원 대상
3. 지원 내용
4. 지원 규모/금액
5. 신청 기간
6. 제출 서류
7. 핵심 체크포인트

공고명: ${notice.title}
분야: ${notice.category || "-"}
주관기관: ${notice.organization || "-"}
시작일자: ${notice.start_date || "-"}
마감일자: ${notice.end_date || "-"}
지원내용: ${notice.content || "-"}
지원자격: ${notice.eligibility || "-"}
지원규모: ${notice.support_scale || "-"}
제출서류: ${notice.required_docs || "-"}
`;

    const ollamaRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3:8b",
        prompt,
        stream: false,
      }),
    });

    const result = await ollamaRes.json();
    const summary = result.response || "";

    db.prepare(
      `
      UPDATE notices
      SET ai_summary = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(summary, req.params.id);

    res.json({
      success: true,
      summary,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
router.delete("/delete-all", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM notices").run();

    res.json({
      success: true,
      deletedCount: result.changes,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
