const express = require("express");
const router = express.Router();

const { db } = require("../db");
const {
  getPublicSources,
  getReadySources,
  getSource,
} = require("../services/sourceRegistry");

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getNoticeSearchText(notice) {
  return [
    notice.source,
    notice.title,
    notice.organization,
    notice.category,
    notice.start_date,
    notice.end_date,
    notice.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isWithinUpcoming(endDate) {
  if (!endDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setDate(limit.getDate() + 7);

  const target = new Date(endDate);
  target.setHours(0, 0, 0, 0);

  return target >= today && target <= limit;
}

function applyCrawlFilters(notices, filters = {}) {
  const keyword = normalizeText(filters.keyword);
  const excludeKeyword = normalizeText(filters.excludeKeyword);
  const source = filters.source || "ALL";
  const category = filters.category || "ALL";
  const fromDate = filters.fromDate || "";
  const toDate = filters.toDate || "";
  const onlyUpcoming = Boolean(filters.onlyUpcoming);

  return notices.filter((notice) => {
    const searchText = getNoticeSearchText(notice);

    if (keyword && !searchText.includes(keyword)) {
      return false;
    }

    if (excludeKeyword && searchText.includes(excludeKeyword)) {
      return false;
    }

    if (source !== "ALL" && notice.source !== source) {
      return false;
    }

    if (category !== "ALL" && notice.category !== category) {
      return false;
    }

    if (fromDate && (!notice.end_date || notice.end_date < fromDate)) {
      return false;
    }

    if (toDate && (!notice.end_date || notice.end_date > toDate)) {
      return false;
    }

    if (onlyUpcoming && !isWithinUpcoming(notice.end_date)) {
      return false;
    }

    return true;
  });
}

function saveNotices(notices) {
  const stmt = db.prepare(`
    INSERT INTO notices (
      source,
      title,
      organization,
      category,
      start_date,
      end_date,
      url,
      detail_url,
      status
    )
    VALUES (
      @source,
      @title,
      @organization,
      @category,
      @start_date,
      @end_date,
      @url,
      @detail_url,
      @status
    )
    ON CONFLICT(source, title, end_date)
    DO UPDATE SET
      organization = excluded.organization,
      category = excluded.category,
      start_date = excluded.start_date,
      url = excluded.url,
      detail_url = excluded.detail_url,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      if (!item.end_date) {
        db.prepare(
          `DELETE FROM notices
           WHERE source = ? AND title = ? AND end_date IS NULL`,
        ).run(item.source, item.title);
      }
      stmt.run(item);
    }
  });

  insertMany(notices);
}

router.get("/sources", (req, res) => {
  const sources = getPublicSources();
  res.json({
    success: true,
    sources,
    totalCount: sources.length,
    readyCount: sources.filter((source) => source.ready).length,
  });
});

async function collect(source, filters) {
  const rawNotices = await source.collect();
  const filteredNotices = applyCrawlFilters(rawNotices, filters);
  saveNotices(filteredNotices);
  return {
    id: source.id,
    source: source.name,
    totalCount: rawNotices.length,
    savedCount: filteredNotices.length,
  };
}

router.post("/all", async (req, res) => {
  const results = [];

  for (const source of getReadySources()) {
    try {
      results.push({ success: true, ...(await collect(source, req.body)) });
    } catch (err) {
      console.error(`[CRAWL][${source.id}]`, err);
      results.push({
        success: false,
        id: source.id,
        source: source.name,
        message: err.message,
      });
    }
  }

  res.json({
    success: results.some((result) => result.success),
    results,
    totalCount: results.reduce(
      (sum, result) => sum + (result.totalCount || 0),
      0,
    ),
    savedCount: results.reduce(
      (sum, result) => sum + (result.savedCount || 0),
      0,
    ),
    failedCount: results.filter((result) => !result.success).length,
  });
});

router.post("/:sourceId", async (req, res) => {
  const source = getSource(req.params.sourceId);

  if (!source) {
    return res.status(404).json({
      success: false,
      message: "수집 대상을 찾을 수 없습니다.",
    });
  }

  if (!source.ready || !source.collect) {
    return res.status(409).json({
      success: false,
      message: source.statusMessage,
      source: source.name,
    });
  }

  try {
    res.json({ success: true, ...(await collect(source, req.body)) });
  } catch (err) {
    console.error(`[CRAWL][${source.id}]`, err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
