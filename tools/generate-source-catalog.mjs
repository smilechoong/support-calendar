import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath =
  "C:/Choong/other/support-calendar/outputs/support-calendar-source-url-update/2026년 정부지원사업 조사 보고서(리스트&API출처)_종합(SW)_공고목록URL추가.xlsx";
const outputPath =
  "C:/Choong/other/support-calendar/backend/src/config/sourceCatalog.json";

const workbook = await SpreadsheetFile.importXlsx(
  await FileBlob.load(workbookPath),
);
const sheet = workbook.worksheets.getItem("📋 API출처 종합목록");
const values = sheet.getRange("A4:J85").values;

const slugCounts = new Map();
const seenUrls = new Set();
const sources = [];

function makeId(value) {
  let base = String(value || "source")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "source";
  const count = (slugCounts.get(base) || 0) + 1;
  slugCounts.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

for (const row of values) {
  const [no, group, name, category, listUrl, dataUrl, method, frequency, purpose, note] = row;
  if (!no || !group || group.startsWith("⑧")) continue;

  const normalizedListUrl = String(listUrl || "").trim();
  if (!normalizedListUrl || seenUrls.has(normalizedListUrl)) continue;
  seenUrls.add(normalizedListUrl);

  const dataSource = String(dataUrl || "").trim();
  const collectionMethod = String(method || "").trim();
  const requiresKey =
    /data\.go\.kr|data\.seoul\.go\.kr/.test(dataSource) &&
    !/fileData\.do/.test(dataSource);

  sources.push({
    id: makeId(normalizedListUrl),
    excelNo: Number(no),
    group,
    name,
    category,
    listUrl: normalizedListUrl,
    dataUrl: dataSource,
    method: collectionMethod,
    frequency,
    purpose,
    note,
    requiresKey,
  });
}

await fs.mkdir(new URL("../backend/src/config/", import.meta.url), {
  recursive: true,
});
await fs.writeFile(outputPath, `${JSON.stringify(sources, null, 2)}\n`, "utf8");
console.log(`Generated ${sources.length} sources: ${outputPath}`);
