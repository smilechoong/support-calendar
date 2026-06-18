const sourceCatalog = require("../config/sourceCatalog.json");
const { crawlKStartup } = require("../crawlers/kstartupCrawler");
const { crawlMsit } = require("../crawlers/msitCrawler");
const { crawlGenericWeb } = require("../crawlers/genericWebCrawler");
const { crawlRss } = require("../crawlers/rssCrawler");

const staticWebSources = new Set([1, 11, 13, 55, 57, 71, 75, 77, 78, 82]);
const browserWebSources = new Set([56, 73]);
const sourceIdOverrides = { 1: "bizinfo" };
const unavailableReasons = {
  3: "중소벤처24 공고가 별도 요청으로 로드되어 전용 파서 필요",
  5: "엑셀의 SMTECH 목록 URL이 404입니다. 현재 공고 URL 확인 필요",
  6: "TIPA 페이지는 실제 공고 대신 외부 사업시스템 링크만 제공해 전용 연계 필요",
  7: "KOSME 페이지에서 지원사업 게시글을 식별할 수 없어 전용 파서 필요",
  8: "엑셀의 여성기업종합지원센터 목록 URL이 404입니다. 현재 공고 URL 확인 필요",
  9: "SEMAS 공고가 별도 요청으로 로드되어 전용 파서 필요",
  10: "엑셀의 벤처확인시스템 목록 URL이 404입니다. 현재 공고 URL 확인 필요",
  12: "보건복지부 페이지에서 지원사업 공고를 식별할 수 없어 전용 파서 필요",
  14: "KICT URL이 지원사업이 아닌 입찰공고 목록이어서 대체 페이지 필요",
  15: "엑셀의 서울기업지원센터 목록 URL이 404입니다. 현재 공고 URL 확인 필요",
  16: "서울복지재단 공고 목록이 별도 요청으로 로드되어 전용 파서 필요",
  17: "신용보증기금 목록 URL이 서버 오류를 반환합니다. 대체 공고 URL 필요",
  18: "기술보증기금 목록 URL이 404입니다. 현재 공고 URL 확인 필요",
  19: "공공데이터포털은 수집 대상 기관이 아닌 API 메타 포털입니다",
  20: "정부24 혜택알리미는 개인화 페이지여서 공개 공고 수집 경로 확인 필요",
  54: "청년창업사관학교 공고가 별도 요청으로 로드되어 전용 파서 필요",
  59: "중소기업중앙회 목록에서 게시글 링크를 식별할 전용 파서 필요",
  60: "판판대로 페이지에서 공고 상세 링크를 식별할 전용 파서 필요",
  61: "엑셀의 소상공인24 공고 URL이 404입니다. 현재 공고 URL 확인 필요",
  62: "대한상공회의소 페이지가 EUC-KR 인코딩이어서 전용 디코더 필요",
  63: "INNOBIZ 사이트 TLS 인증서 오류로 안전한 수집이 불가능합니다",
  64: "IBK 기업지원 URL이 404입니다. 현재 공고 URL 확인 필요",
  65: "넥스트라운드 URL이 공고가 아닌 스타트업 소개 목록이어서 대체 페이지 필요",
  66: "나라장터가 자동 접근 안내 페이지를 반환해 별도 연계 방식이 필요합니다",
  67: "특허청 공고 URL이 404입니다. 현재 공고 URL 확인 필요",
  68: "RIPC PMS는 기업회원용 페이지입니다. 공개 공고 페이지로 교체 필요",
  69: "한국지식재산보호원 목록이 별도 데이터 응답을 사용해 전용 파서 필요",
  70: "KIIP 페이지에서 입찰·행사가 섞여 지원사업 전용 목록 확인 필요",
  72: "KIAT 공고가 별도 요청으로 로드되어 전용 파서 필요",
  74: "ZEUS 목록 URL이 로그인 확인 페이지를 반환합니다",
  79: "성평등가족부 페이지에서 지원사업 공고를 식별할 전용 파서 필요",
  80: "서울시 여성능력개발원 페이지가 이동 중 재탐색되어 전용 파서 필요",
};

const collectorDefinitions = {
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
  let collector = collectorDefinitions[source.excelNo];
  if (!collector && staticWebSources.has(source.excelNo)) {
    collector = {
      id: sourceIdOverrides[source.excelNo] || source.id,
      requiresKey: false,
      collect: () => crawlGenericWeb(source, "static"),
    };
  }
  if (!collector && browserWebSources.has(source.excelNo)) {
    collector = {
      id: source.id,
      requiresKey: false,
      collect: () => crawlGenericWeb(source, "browser"),
    };
  }

  return {
    ...source,
    id: collector?.id || source.id,
    requiresKey: collector?.requiresKey ?? source.requiresKey,
    ready: Boolean(collector?.collect),
    statusMessage: unavailableReasons[source.excelNo]
      ? unavailableReasons[source.excelNo]
      : collector?.statusMessage
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
