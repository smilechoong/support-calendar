import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/user/Documents/카카오톡 받은 파일/2026년 정부지원사업 조사 보고서(리스트&API출처)_종합(SW).xlsx";
const outputDir = "C:/Choong/other/support-calendar/outputs/support-calendar-source-url-update";
const outputPath = `${outputDir}/2026년 정부지원사업 조사 보고서(리스트&API출처)_종합(SW)_공고목록URL추가.xlsx`;

const rows = [
  ["https://www.k-startup.go.kr/web/contents/bizpbanc-list.do", "https://www.data.go.kr/data/15128037/openapi.do", "REST OpenAPI / K-Startup 사업공고. API출처 No.2·21 기준"],
  ["https://www.jointips.or.kr", "—", "웹 크롤링 / TIPS 전용 사이트. API출처 No.22 기준"],
  ["https://www.smtech.go.kr/front/ifg/no/noticeList.do", "https://www.data.go.kr/data/15113191/openapi.do", "REST OpenAPI / SMTECH·TIPA R&D 공고. API출처 No.5·23 기준"],
  ["https://www.smtech.go.kr/front/ifg/no/noticeList.do", "https://www.data.go.kr/data/15113191/openapi.do", "REST OpenAPI / SMTECH·TIPA R&D 공고. API출처 No.5·23 기준"],
  ["https://www.data.go.kr/suc/startup.do", "—", "웹 크롤링 / 공공데이터 창업경진대회 전용 페이지. API출처 No.24 기준"],
  ["https://www.kodit.co.kr/kodit/na/ntt/selectNttList.do?mi=2285&bbsId=BBSMSTR_000000000001", "https://www.data.go.kr/tcs/dss/selectDataSetList.do?keyword=신용보증기금", "REST OpenAPI 검색 + 웹 크롤링 / 신보 공지. API출처 No.17·25 기준"],
  ["https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do", "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do", "REST API + RSS / 기업마당 여성기업 키워드 필터. API출처 No.1·26 기준"],
  ["https://www.nipa.kr/home/2-2/16540", "—", "웹 크롤링 / NIPA AI바우처·AI 지원사업 페이지. API출처 No.27 기준"],
  ["https://www.kosmes.or.kr/nsh/SH/NTS/SHNTS001M0.do", "https://www.kosmes.or.kr/opendata/portal/openapi/openApiDevPage.do", "자체 REST OpenAPI + 웹 크롤링 / KOSME 정책자금. API출처 No.7·28 기준"],
  ["https://www.kibo.or.kr/kibo/na/ntt/selectNttList.do?mi=1054&bbsId=BBSMSTR_000000000001", "https://tb.kibo.or.kr/ktbs/voc/openapi/openApiList.do", "자체 REST OpenAPI + 웹 크롤링 / 기보 공지. API출처 No.18·29 기준"],
  ["https://www.molit.go.kr", "—", "웹 크롤링 / 국토교통부·한국부동산원 사업 공고 확인. API출처 No.30 기준"],
  ["https://srome.keit.re.kr/", "https://www.data.go.kr/data/15121618/fileData.do", "파일 데이터(CSV) + 웹 크롤링 / KEIT 산업기술 R&D. API출처 No.31·73 기준"],
  ["https://www.songpa.go.kr", "—", "웹 크롤링 / 송파구청 고시·공고 및 기업지원 게시판 확인. API출처 No.32 기준"],
  ["https://www.startup-plus.kr", "—", "웹 크롤링 / 서울AI허브·Startup Plus 공고 확인. API출처 No.33 기준"],
  ["https://www.work24.go.kr", "—", "웹 크롤링 / 고용24 장려금 공고 확인. API출처 No.34 기준"],
  ["https://wbiz.or.kr/notice/business/list.do", "기업마당 API 여성기업 필터 활용", "웹 크롤링 + 기업마당 필터 / 여성기업지원센터. API출처 No.8·35 기준"],
  ["http://kovwa.or.kr/94/", "—", "웹 크롤링 / 한국여성벤처협회 공지. API출처 No.36·77 기준"],
  ["https://www.kdata.or.kr/datavoucher", "—", "웹 크롤링 / 데이터바우처 전용 사이트. API출처 No.37 기준"],
  ["https://www.nipa.kr/home/2-2/16540", "—", "웹 크롤링 / NIPA AI 중소기업 지원 공고. API출처 No.27 기준"],
  ["https://seoul.rnbd.kr", "—", "웹 크롤링 / 서울혁신챌린지 전용 사이트. API출처 No.38·51 기준"],
  ["https://seoulfintechlab.kr", "—", "웹 크롤링 / 서울핀테크랩 입주 공고. API출처 No.39 기준"],
  ["https://fintech.or.kr", "—", "웹 크롤링 / 한국핀테크지원센터·핀테크 큐브 공고. API출처 No.39 기준"],
  ["https://pms.ripc.org/main.do", "https://www.data.go.kr/data/15128235/fileData.do", "파일 데이터(CSV) + 웹 크롤링 / RIPC PMS·IP나래. API출처 No.40·68 기준"],
  ["https://www.iris.go.kr", "—", "웹 크롤링 / IRIS 통합공고 확인. API출처 No.41 기준"],
  ["https://swgo.kr", "—", "웹 크롤링 / SW고성장클럽 공고 확인. API출처 No.42 기준"],
  ["https://www.digital-service.kr", "—", "웹 크롤링 / 디지털서비스 전문기업 지정. API출처 No.48 기준"],
  ["https://smartcity.go.kr", "—", "웹 크롤링 / 스마트시티 혁신기술 공고. API출처 No.43 기준"],
  ["https://smartcity.go.kr", "—", "웹 크롤링 / 스마트시티 혁신서비스 공고. API출처 No.43 기준"],
  ["https://hubgongdeok.startup-plus.kr", "—", "웹 크롤링 / 서울창업허브 공덕·창동 입주 공고. API출처 No.50 기준"],
  ["https://www.sba.seoul.kr", "—", "웹 크롤링 / SBA 수출유망기업·서울시 지원사업 공고. API출처 No.38 기준"],
  ["https://www.exportvoucher.com", "—", "웹 크롤링 / 수출바우처 사업 공고. API출처 No.44 기준"],
  ["https://www.mssmiv.com", "—", "웹 크롤링 / 중소기업 혁신바우처 공고. API출처 No.45 기준"],
  ["https://www.sbcplan.or.kr", "—", "웹 크롤링 / 청년내일채움공제 안내·공고. API출처 No.46 기준"],
  ["https://www.seoul.go.kr", "—", "웹 크롤링 / 서울시 여성창업·지원사업 공고. API출처 No.47 기준"],
  ["https://www.kodit.co.kr/kodit/na/ntt/selectNttList.do?mi=2285&bbsId=BBSMSTR_000000000001", "https://www.data.go.kr/tcs/dss/selectDataSetList.do?keyword=신용보증기금", "REST OpenAPI 검색 + 웹 크롤링 / 신보 스타트업 네스트. API출처 No.17·25 기준"],
  ["https://www.k-startup.go.kr/web/contents/bizpbanc-list.do", "https://www.data.go.kr/data/15128037/openapi.do", "REST OpenAPI / K-Startup 창업도약패키지 공고. API출처 No.2·21 기준"],
  ["https://www.smes.go.kr/main/bizApply", "https://www.data.go.kr/data/15113297/openapi.do", "REST OpenAPI / 중소벤처24·중기부 지원사업 공고. API출처 No.3·52 기준"],
  ["https://www.smes.go.kr/venturein/sb/sb0501.do", "https://www.data.go.kr/data/15084581/fileData.do", "파일 데이터(CSV) + 웹 크롤링 / 벤처확인 공고·현황. API출처 No.10·49 기준"],
  ["https://www.innobiz.or.kr/info/notice_list.do", "https://www.data.go.kr/data/15134641/fileData.do", "파일 데이터(CSV) + 웹 크롤링 / 이노비즈 인증·지원 공고. API출처 No.53·63 기준"],
  ["https://www.digital-service.kr", "—", "웹 크롤링 / 디지털서비스 전문기업 지정. API출처 No.48 기준"],
];

if (rows.length !== 40) throw new Error(`Expected 40 rows, got ${rows.length}`);

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const sheet = workbook.worksheets.getItem("📊 2026 보고서 사업 목록");

sheet.getRange("J2:L2").values = [["공고 목록 페이지 URL", "기관별 API / RSS 출처", "수집 방식 / 검토 메모"]];
sheet.getRange("J3:L42").values = rows;
sheet.getRange("J2:L2").format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true,
  horizontalAlignment: "center",
  verticalAlignment: "middle",
  borders: { preset: "all", style: "thin", color: "#D9E2F3" },
};
sheet.getRange("J3:L42").format = {
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "all", style: "thin", color: "#D9E2F3" },
};
sheet.getRange("J2:J42").format.columnWidthPx = 330;
sheet.getRange("K2:K42").format.columnWidthPx = 330;
sheet.getRange("L2:L42").format.columnWidthPx = 380;
sheet.getRange("J2:L42").format.rowHeightPx = 48;

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const check = await workbook.inspect({
  kind: "table",
  sheetId: "📊 2026 보고서 사업 목록",
  range: "I1:L42",
  maxChars: 8000,
  tableMaxRows: 8,
  tableMaxCols: 4,
  tableMaxCellChars: 140,
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
const preview = await workbook.render({
  sheetName: "📊 2026 보고서 사업 목록",
  range: "A1:L12",
  scale: 1,
  format: "png",
});
await fs.writeFile(`${outputDir}/report-preview.png`, new Uint8Array(await preview.arrayBuffer()));

console.log(JSON.stringify({ outputPath, check: check.ndjson, errors: errors.ndjson }));
