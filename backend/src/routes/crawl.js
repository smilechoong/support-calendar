const express = require("express");
const router = express.Router();

const { db } = require("../db");
const { crawlKStartup } = require("../crawlers/kstartupCrawler");
const { crawlMsit } = require("../crawlers/msitCrawler");

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
      stmt.run(item);
    }
  });

  insertMany(notices);
}

router.post("/k-startup", async (req, res) => {
  try {
    const rawNotices = await crawlKStartup();
    const filteredNotices = applyCrawlFilters(rawNotices, req.body);

    saveNotices(filteredNotices);

    res.json({
      success: true,
      source: "K-Startup",
      totalCount: rawNotices.length,
      savedCount: filteredNotices.length,
      count: filteredNotices.length,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.post("/msit", async (req, res) => {
  try {
    const rawNotices = await crawlMsit();
    const filteredNotices = applyCrawlFilters(rawNotices, req.body);

    console.log("[MSIT] 전체 수집 개수:", rawNotices.length);
    console.log("[MSIT] 필터 후 저장 개수:", filteredNotices.length);
    console.log("[MSIT] 첫 번째:", filteredNotices[0]);

    saveNotices(filteredNotices);

    res.json({
      success: true,
      source: "과기정통부",
      totalCount: rawNotices.length,
      savedCount: filteredNotices.length,
      count: filteredNotices.length,
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
