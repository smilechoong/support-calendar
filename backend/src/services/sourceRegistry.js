const sourceCatalog = require("../config/sourceCatalog.json");
const { crawlKStartup } = require("../crawlers/kstartupCrawler");
const { crawlMsit } = require("../crawlers/msitCrawler");
const { crawlRss } = require("../crawlers/rssCrawler");

const bizinfoApiKey = process.env.BIZINFO_API_KEY || "";

const collectorDefinitions = {
  1: {
    id: "bizinfo",
    requiresKey: true,
    statusMessage: bizinfoApiKey
      ? "수집 가능"
      : "Render 환경변수 BIZINFO_API_KEY 설정 필요",
    collect: bizinfoApiKey
      ? () =>
          crawlRss({
            source: "기업마당",
            organization: "중소벤처기업부",
            category: "정부지원사업",
            url: `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=${encodeURIComponent(bizinfoApiKey)}`,
          })
      : null,
  },
  2: { id: "k-startup", requiresKey: false, collect: crawlKStartup },
  4: {
    id: "mss",
    collect: () =>
      crawlRss({
        source: "중소벤처기업부",
        organization: "중소벤처기업부",
        category: "사업공고",
        url: "https://mss.go.kr/rss/smba/board/126.do",
      }),
  },
  81: {
    id: "mss-women",
    collect: () =>
      crawlRss({
        source: "중소벤처기업부 여성기업",
        organization: "중소벤처기업부",
        category: "여성기업",
        url: "https://mss.go.kr/rss/smba/board/310.do",
      }),
  },
};

const sources = sourceCatalog.map((source) => {
  const collector = collectorDefinitions[source.excelNo];
  return {
    ...source,
    id: collector?.id || source.id,
    requiresKey: collector?.requiresKey ?? source.requiresKey,
    ready: Boolean(collector?.collect),
    statusMessage: collector?.statusMessage
      ? collector.statusMessage
      : collector?.collect
        ? "수집 가능"
      : source.requiresKey
        ? "공공데이터 서비스키와 API 호출 규격 설정 필요"
        : source.method.includes("파일 데이터")
          ? "파일 데이터 다운로드·변환기 필요"
          : "기관별 웹 파서 연결 필요",
    collect: collector?.collect || null,
  };
});

sources.push({
  id: "msit",
  excelNo: null,
  group: "기존 수집기",
  name: "과학기술정보통신부",
  category: "정부 부처 공고",
  listUrl: "https://www.msit.go.kr/bbs/list.do?sCode=user&mPid=121&mId=311",
  dataUrl: "",
  method: "웹 크롤링",
  frequency: "수시",
  purpose: "과학기술·정보통신 사업공고 수집",
  note: "기존 Puppeteer 수집기",
  requiresKey: false,
  ready: true,
  statusMessage: "수집 가능",
  collect: crawlMsit,
});

function getPublicSources() {
  return sources.map(({ collect, ...source }) => source);
}

function getSource(sourceId) {
  return sources.find((source) => source.id === sourceId);
}

function getReadySources() {
  return sources.filter((source) => source.ready);
}

module.exports = { getPublicSources, getReadySources, getSource };
