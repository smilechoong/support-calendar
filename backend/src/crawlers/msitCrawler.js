const puppeteer = require("puppeteer");

const SOURCE = "과기정통부";
const BASE_URL = "https://www.msit.go.kr";
const LIST_URL =
  "https://www.msit.go.kr/bbs/list.do?sCode=user&mPid=121&mId=311";

function normalizeMsitDate(raw) {
  if (!raw) return null;

  const match = raw.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (!match) return null;

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function cleanText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function isInvalidTitle(title) {
  if (!title) return true;

  return (
    title.length < 5 ||
    title.length > 250 ||
    title.includes("검색") ||
    title.includes("초기화") ||
    title.includes("노출내용") ||
    title.includes("담당자") ||
    title.includes("연락처") ||
    title.includes("부서")
  );
}

function makeMsitDetailUrl(nttId) {
  return `https://www.msit.go.kr/bbs/view.do?sCode=user&mId=311&mPid=121&pageIndex=&bbsSeqNo=100&nttSeqNo=${nttId}&searchOpt=ALL&searchTxt=`;
}

async function crawlMsit() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.goto(LIST_URL, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const rows = await page.evaluate(() => {
      const results = [];

      document.querySelectorAll("a").forEach((a) => {
        const onclick = a.getAttribute("onclick") || "";
        const match = onclick.match(/fn_detail\((\d+)\)/);

        if (!match) return;

        const nttId = match[1];
        const text = a.innerText.trim();

        if (!text) return;

        results.push({
          nttId,
          rawText: text,
        });
      });

      return results;
    });

    console.log("[MSIT] rows:", rows.length);
    console.log("[MSIT] sample:", rows[0]);

    const notices = [];

    for (const row of rows) {
      const lines = row.rawText
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);

      const title =
        lines.find(
          (v) =>
            v.length > 10 &&
            !v.includes("노출내용") &&
            !v.includes("담당자") &&
            !v.includes("연락처"),
        ) || "";

      const cleanTitle = cleanText(title);

      if (isInvalidTitle(cleanTitle)) continue;

      const date = normalizeMsitDate(row.rawText);
      const detailUrl = makeMsitDetailUrl(row.nttId);

      notices.push({
        source: SOURCE,
        title: cleanTitle,
        organization: "과학기술정보통신부",
        category: "사업공고",
        start_date: date,
        end_date: null,
        url: detailUrl,
        detail_url: detailUrl,
        status: "ongoing",
      });
    }

    const map = new Map();

    for (const notice of notices) {
      const key = `${notice.source}|${notice.title}|${notice.url}`;
      map.set(key, notice);
    }

    return [...map.values()];
  } finally {
    await browser.close();
  }
}

module.exports = {
  crawlMsit,
};
