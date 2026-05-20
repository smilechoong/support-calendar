const axios = require("axios");
const cheerio = require("cheerio");

const SOURCE = "K-Startup";
const BASE_URL = "https://www.k-startup.go.kr";
const LIST_URL = `${BASE_URL}/web/contents/bizpbanc-ongoing.do`;

function cleanText(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/새로운게시글/g, "")
    .trim();
}

function isInvalidTitle(title) {
  if (!title) return true;

  return (
    title.length > 250 ||
    title.includes("function") ||
    title.includes("console.log") ||
    title.includes("window.open") ||
    title.includes("document.") ||
    title.includes("alert(") ||
    title.includes("copyUrlPopup") ||
    title.includes("getRSS") ||
    title.includes("상세검색") ||
    title.includes("검색어 입력") ||
    title.includes("지원분야") ||
    title.includes("주관부처") ||
    title.includes("정렬 유형")
  );
}

function extractDate(text, label) {
  const regex = new RegExp(`${label}\\s*(\\d{4}-\\d{2}-\\d{2})`);
  const match = text.match(regex);
  return match ? match[1] : null;
}

function makeDetailUrl(pbancSn) {
  if (!pbancSn) return LIST_URL;

  return `${LIST_URL}?pbancClssCd=PBC010&schM=view&pbancSn=${pbancSn}`;
}

function extractPbancSn($, el) {
  const candidates = [];

  $(el)
    .find("a, button")
    .each((_, node) => {
      candidates.push($(node).attr("href") || "");
      candidates.push($(node).attr("onclick") || "");
      candidates.push($(node).attr("data-pbanc-sn") || "");
      candidates.push($(node).attr("data-pbancsn") || "");
      candidates.push($.html(node) || "");
    });

  candidates.push($(el).html() || "");

  const joined = candidates.join(" ");

  const patterns = [
    /pbancSn=(\d+)/,
    /pbancSn['"]?\s*[:=]\s*['"]?(\d+)/,
    /['"]pbancSn['"]\s*,\s*['"]?(\d+)/,
    /go_view\(['"]?(\d{5,})['"]?\)/,
    /fn_[A-Za-z0-9_]+\([^)]*?['"]?(\d{5,})['"]?[^)]*?\)/,
    /['"](\d{5,})['"]/,
  ];

  for (const pattern of patterns) {
    const match = joined.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function parseNoticeFromLi($, el) {
  const rawText = $(el).text();
  const text = cleanText(rawText);

  if (!text.includes("마감일자")) return null;
  if (!text.includes("등록일자")) return null;
  if (!text.includes("조회")) return null;

  const pbancSn = extractPbancSn($, el);
  const detailUrl = makeDetailUrl(pbancSn);

  if (!pbancSn) {
    console.log("[K-STARTUP][NO PBANC SN]", text.slice(0, 120));
  }

  const endDate = extractDate(text, "마감일자");
  const startDate = extractDate(text, "시작일자");

  const categoryMatch = text.match(
    /(사업화|기술개발\(R&D\)|시설ㆍ공간ㆍ보육|멘토링ㆍ컨설팅ㆍ교육|글로벌|인력|융자ㆍ보증|행사ㆍ네트워크|창업교육|판로ㆍ해외진출|정책자금)\s+D-\d+/,
  );

  const category = categoryMatch ? categoryMatch[1] : null;

  let title = text;

  if (categoryMatch) {
    title = title.replace(categoryMatch[0], "");
  }

  title = title
    .replace(/마감일자\s*\d{4}-\d{2}-\d{2}/, "")
    .replace(/등록일자\s*\d{4}-\d{2}-\d{2}.*/, "")
    .trim();

  if (!title || !endDate) return null;
  if (isInvalidTitle(title)) return null;

  return {
    source: SOURCE,
    title,
    organization: null,
    category,
    start_date: startDate,
    end_date: endDate,
    url: detailUrl,
    detail_url: detailUrl,
    status: "ongoing",
  };
}

async function crawlKStartup() {
  const { data } = await axios.get(LIST_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  const $ = cheerio.load(data);
  const notices = [];

  $("li").each((_, el) => {
    const notice = parseNoticeFromLi($, el);

    if (notice) {
      notices.push(notice);
    }
  });

  const map = new Map();

  for (const notice of notices) {
    const key = `${notice.source}|${notice.title}|${notice.end_date}`;
    map.set(key, notice);
  }

  return [...map.values()];
}

module.exports = {
  crawlKStartup,
};
