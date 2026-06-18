const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function textValue(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return String(value["#text"] || value["@_href"] || "").trim();
}

function normalizeDate(value) {
  const text = textValue(value);
  if (!text) return null;

  const direct = text.match(/(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);
  if (direct) {
    return `${direct[1]}-${direct[2].padStart(2, "0")}-${direct[3].padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function extractEndDate(text) {
  const source = String(text || "");
  const labeled = source.match(
    /(?:마감|접수종료|신청종료|종료일)[^0-9]{0,12}(20\d{2})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/,
  );
  if (!labeled) return null;
  return `${labeled[1]}-${labeled[2].padStart(2, "0")}-${labeled[3].padStart(2, "0")}`;
}

async function crawlRss({ source, organization, category, url }) {
  const { data } = await axios.get(url, {
    timeout: 30000,
    responseType: "text",
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "Mozilla/5.0 (compatible; SupportCalendar/1.0)",
    },
  });

  const document = parser.parse(data);
  const channel = document?.rss?.channel || document?.channel || document?.feed;
  const items = asArray(channel?.item || channel?.entry);

  return items
    .map((item) => {
      const title = textValue(item.title);
      const link = textValue(item.link || item.guid || item.id);
      const description = textValue(
        item.description || item.summary || item.content,
      );
      const startDate = normalizeDate(
        item.pubDate || item.published || item.updated || item.date,
      );

      if (!title || !link) return null;

      return {
        source,
        title,
        organization,
        category,
        start_date: startDate,
        end_date: extractEndDate(`${title} ${description}`),
        url: link,
        detail_url: link,
        status: "ongoing",
      };
    })
    .filter(Boolean);
}

module.exports = { crawlRss };
