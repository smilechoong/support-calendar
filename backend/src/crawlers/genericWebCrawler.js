const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

const SUPPORT_PATTERN =
  /지원|사업|공고|모집|신청|창업|스타트업|중소기업|소상공인|여성기업|기술개발|연구개발|R&D|바우처|융자|보증|입주|교육|컨설팅|판로|수출|일자리|고용|인턴|특허|지식재산|실증|과제/i;
const SKIP_PATTERN =
  /로그인|회원가입|개인정보|이용약관|사이트맵|오시는 길|전체메뉴|메뉴 열기|이전|다음|맨위로|더보기|검색|공유|인쇄|홈$/i;
const GENERIC_TITLE_PATTERN =
  /^(지원사업|지원사업 공고|사업공고|공고|공지사항|새소식|입찰공고|채용공고|전체보기)$/i;
const DETAIL_URL_PATTERN =
  /view|detail|article|board|bbs|notice|seq|idx|sn=|no=|bcIdx|menuId|ARTICLE_SEQ/i;

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDateParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractDates(text) {
  const dates = [];
  const pattern = /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/g;
  for (const match of String(text || "").matchAll(pattern)) {
    const value = normalizeDateParts(match[1], match[2], match[3]);
    if (!dates.includes(value)) dates.push(value);
  }
  return dates.slice(0, 2);
}

function absoluteUrl(href, baseUrl) {
  if (!href || /^(javascript:|mailto:|tel:|#)/i.test(href)) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function resolveDetailUrl(anchor, excelNo, baseUrl) {
  const href = anchor.attr("href") || "";
  const onclick = anchor.attr("onclick") || "";
  const script = `${href} ${onclick}`;

  if (excelNo === 11) {
    const match = script.match(/fn_bbsView\(['"](\d+)['"]\)/);
    if (match) {
      return new URL(
        `/bbs/deptgongji/bbsView.do?bbsCnId=${match[1]}&menuId=MENU0895`,
        baseUrl,
      ).toString();
    }
  }

  if (excelNo === 13 && anchor.hasClass("wrtancInfoBtn")) {
    const params = new URLSearchParams({
      mi: "1026",
      panId: anchor.attr("data-id1") || "",
      ccrCnntSysDsCd: anchor.attr("data-id2") || "",
      uppAisTpCd: anchor.attr("data-id3") || "",
      aisTpCd: anchor.attr("data-id4") || "",
    });
    return new URL(
      `/lhapply/apply/wt/wrtanc/selectWrtancInfo.do?${params}`,
      baseUrl,
    ).toString();
  }

  if (excelNo === 75) {
    const match = script.match(/goDetail\(['"]([^'"]+)['"]\)/);
    if (match) return new URL(`/notice/${match[1]}`, baseUrl).toString();
  }

  return absoluteUrl(href, baseUrl);
}

function parseNoticeHtml({ html, source, excelNo, baseUrl, category }) {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer").remove();

  const candidates = [];
  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const title = cleanText(anchor.text() || anchor.attr("title"));
    if (
      title.length < 6 ||
      title.length > 220 ||
      SKIP_PATTERN.test(title) ||
      GENERIC_TITLE_PATTERN.test(title)
    ) {
      return;
    }

    const container = anchor.closest("tr, li, article, .item, .list-item, .board-list, div");
    const context = cleanText(container.text()).slice(0, 1200);
    const detailUrl = resolveDetailUrl(anchor, excelNo, baseUrl);
    if (!detailUrl) return;

    const dates = extractDates(context);
    const titleMatches = SUPPORT_PATTERN.test(title);
    if (!titleMatches && !(dates.length > 0 && SUPPORT_PATTERN.test(context))) return;
    if (dates.length === 0 && !DETAIL_URL_PATTERN.test(detailUrl)) return;

    candidates.push({
      source,
      title,
      organization: source,
      category,
      start_date: dates[0] || null,
      end_date: dates[1] || null,
      url: detailUrl,
      detail_url: detailUrl,
      status: "ongoing",
    });
  });

  const unique = new Map();
  for (const item of candidates) {
    const key = `${item.title}|${item.detail_url}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()].slice(0, 100);
}

async function fetchStaticHtml(url) {
  const { data } = await axios.get(url, {
    timeout: 30000,
    responseType: "text",
    maxRedirects: 5,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    },
  });
  return String(data || "");
}

async function fetchBrowserHtml(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    return await page.content();
  } finally {
    await browser.close();
  }
}

async function crawlGenericWeb(source, transport = "static") {
  const html =
    transport === "browser"
      ? await fetchBrowserHtml(source.listUrl)
      : await fetchStaticHtml(source.listUrl);

  return parseNoticeHtml({
    html,
    source: source.name,
    excelNo: source.excelNo,
    baseUrl: source.listUrl,
    category: source.category,
  });
}

module.exports = { crawlGenericWeb, parseNoticeHtml };
