import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";

const API_BASE = "";

export default function MainPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [crawlSource, setCrawlSource] = useState("");
  const [message, setMessage] = useState("");

  const [keyword, setKeyword] = useState("");
  const [excludeKeyword, setExcludeKeyword] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [onlyUpcoming, setOnlyUpcoming] = useState(false);

  const makeCrawlFilterPayload = () => ({
    keyword,
    excludeKeyword,
    source: sourceFilter,
    category: categoryFilter,
    fromDate,
    toDate,
    onlyUpcoming,
  });

  const loadNotices = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/api/notices`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "공고 조회 실패");
      }

      setNotices(data.items || []);
      setMessage(`공고 조회 완료: ${(data.items || []).length}건`);
    } catch (err) {
      console.error(err);
      setMessage(`조회 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const crawlKStartup = async () => {
    try {
      setCrawlLoading(true);
      setCrawlSource("kstartup");
      setMessage("K-Startup 공고 수집 중...");

      const res = await fetch(`${API_BASE}/api/crawl/k-startup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(makeCrawlFilterPayload()),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "수집 실패");
      }

      setMessage(
        `K-Startup 수집 완료: ${data.savedCount}건 저장 / ${data.totalCount}건 수집`,
      );
      await loadNotices();
    } catch (err) {
      console.error(err);
      setMessage(`수집 실패: ${err.message}`);
    } finally {
      setCrawlLoading(false);
      setCrawlSource("");
    }
  };

  const crawlMsit = async () => {
    try {
      setCrawlLoading(true);
      setCrawlSource("msit");
      setMessage("과기정통부 공고 수집 중...");

      const res = await fetch(`${API_BASE}/api/crawl/msit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(makeCrawlFilterPayload()),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "수집 실패");
      }

      setMessage(
        `과기정통부 수집 완료: ${data.savedCount}건 저장 / ${data.totalCount}건 수집`,
      );
      await loadNotices();
    } catch (err) {
      console.error(err);
      setMessage(`수집 실패: ${err.message}`);
    } finally {
      setCrawlLoading(false);
      setCrawlSource("");
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const sourceOptions = useMemo(() => {
    const sources = [...new Set(notices.map((n) => n.source).filter(Boolean))];
    return ["ALL", ...sources];
  }, [notices]);

  const categoryOptions = useMemo(() => {
    const categories = [
      ...new Set(notices.map((n) => n.category).filter(Boolean)),
    ];
    return ["ALL", ...categories];
  }, [notices]);

  const filteredNotices = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const exclude = excludeKeyword.trim().toLowerCase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingLimit = new Date(today);
    upcomingLimit.setDate(upcomingLimit.getDate() + 7);

    return notices
      .filter((n) => {
        const endDate = n.end_date ? new Date(n.end_date) : null;

        const target = [
          n.title,
          n.organization,
          n.category,
          n.source,
          n.start_date,
          n.end_date,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (q && !target.includes(q)) return false;
        if (exclude && target.includes(exclude)) return false;

        if (sourceFilter !== "ALL" && n.source !== sourceFilter) return false;

        if (categoryFilter !== "ALL" && n.category !== categoryFilter) {
          return false;
        }

        if (fromDate && (!n.end_date || n.end_date < fromDate)) return false;
        if (toDate && (!n.end_date || n.end_date > toDate)) return false;

        if (onlyUpcoming) {
          if (!endDate) return false;
          if (endDate < today || endDate > upcomingLimit) return false;
        }

        return true;
      })
      .sort((a, b) =>
        String(a.end_date || "").localeCompare(String(b.end_date || "")),
      );
  }, [
    notices,
    keyword,
    excludeKeyword,
    sourceFilter,
    categoryFilter,
    fromDate,
    toDate,
    onlyUpcoming,
  ]);

  const upcomingList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limit = new Date(today);
    limit.setDate(limit.getDate() + 7);

    return notices
      .filter((n) => {
        if (!n.end_date) return false;
        const end = new Date(n.end_date);
        return end >= today && end <= limit;
      })
      .sort((a, b) => String(a.end_date).localeCompare(String(b.end_date)));
  }, [notices]);

  const groupedNoticesByMonth = useMemo(() => {
    const map = new Map();

    for (const notice of filteredNotices) {
      const date = notice.end_date || "날짜 없음";
      const monthKey =
        date && date !== "날짜 없음" ? date.slice(0, 7) : "날짜 없음";

      if (!map.has(monthKey)) {
        map.set(monthKey, []);
      }

      map.get(monthKey).push(notice);
    }

    return Array.from(map.entries()).map(([month, items]) => ({
      month,
      items,
    }));
  }, [filteredNotices]);

  const events = useMemo(() => {
    return filteredNotices
      .filter((n) => n.end_date)
      .map((n) => ({
        id: String(n.id),
        title: `[${n.source}] ${n.title}`,
        date: n.end_date,
        extendedProps: n,
      }));
  }, [filteredNotices]);

  const resetFilters = () => {
    setKeyword("");
    setExcludeKeyword("");
    setSourceFilter("ALL");
    setCategoryFilter("ALL");
    setFromDate("");
    setToDate("");
    setOnlyUpcoming(false);
  };

  const openOriginalUrl = (notice) => {
    const url = notice?.detail_url || notice?.url;

    if (!url) {
      alert("원문 URL이 없습니다.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>정부지원사업 캘린더</h1>
          <p style={styles.subtitle}>
            정부 · 지자체 · 기관 · 협회 공고를 마감일 기준으로 확인
          </p>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.secondaryButton}
            onClick={loadNotices}
            disabled={loading || crawlLoading}
          >
            {loading ? "조회 중..." : "새로고침"}
          </button>

          <button
            style={styles.primaryButton}
            onClick={crawlKStartup}
            disabled={loading || crawlLoading}
          >
            {crawlLoading && crawlSource === "kstartup"
              ? "수집 중..."
              : "K-Startup 수집"}
          </button>

          <button
            style={styles.primaryButton}
            onClick={crawlMsit}
            disabled={loading || crawlLoading}
          >
            {crawlLoading && crawlSource === "msit"
              ? "수집 중..."
              : "과기정통부 수집"}
          </button>
        </div>
      </header>

      {message && <div style={styles.message}>{message}</div>}

      <section style={styles.summaryGrid}>
        <SummaryCard label="전체 공고" value={`${notices.length}건`} />
        <SummaryCard label="필터 결과" value={`${filteredNotices.length}건`} />
        <SummaryCard label="이번주 마감" value={`${upcomingList.length}건`} />
      </section>

      <section style={styles.filterCard}>
        <div style={styles.filterHeader}>
          <div>
            <h2 style={styles.sectionTitle}>검색 / 수집 필터</h2>
            <p style={styles.filterDesc}>
              이 조건은 화면 조회뿐 아니라 수집 버튼 클릭 시 저장 전 필터에도
              적용됩니다.
            </p>
          </div>

          <button style={styles.resetButton} onClick={resetFilters}>
            초기화
          </button>
        </div>

        <div style={styles.filterGrid}>
          <div style={styles.filterItem}>
            <label style={styles.label}>포함 검색어</label>
            <input
              style={styles.input}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: AI, 창업, 제조, 스마트팜"
            />
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>제외 검색어</label>
            <input
              style={styles.input}
              value={excludeKeyword}
              onChange={(e) => setExcludeKeyword(e.target.value)}
              placeholder="예: 대학생, 여성기업"
            />
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>출처</label>
            <select
              style={styles.input}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              {sourceOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "전체" : s}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>분야</label>
            <select
              style={styles.input}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "전체" : c}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>마감 시작일</label>
            <input
              style={styles.input}
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>마감 종료일</label>
            <input
              style={styles.input}
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <label style={styles.checkboxWrap}>
            <input
              type="checkbox"
              checked={onlyUpcoming}
              onChange={(e) => setOnlyUpcoming(e.target.checked)}
            />
            이번주 마감만 보기
          </label>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>마감 캘린더</h2>
          <span style={styles.helperText}>공고 클릭 시 원문으로 이동</span>
        </div>

        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locales={[koLocale]}
          locale="ko"
          height="auto"
          events={events}
          dayMaxEvents={3}
          moreLinkClick="popover"
          eventClick={(info) => {
            openOriginalUrl(info.event.extendedProps);
          }}
          eventDidMount={(info) => {
            info.el.title = info.event.title;
          }}
        />
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>이번주 마감 공고</h2>
          <span style={styles.helperText}>오늘부터 7일 이내</span>
        </div>

        <NoticeTable
          notices={upcomingList}
          emptyText="이번주 마감 공고가 없습니다."
        />
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>월별 공고 리스트</h2>
          <span style={styles.helperText}>필터 조건 기준 월별 그룹</span>
        </div>

        <MonthlyNoticeList groupedNotices={groupedNoticesByMonth} />
      </section>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  );
}

function MonthlyNoticeList({ groupedNotices }) {
  if (!groupedNotices || groupedNotices.length === 0) {
    return <div style={styles.empty}>조건에 맞는 공고가 없습니다.</div>;
  }

  return (
    <div style={styles.monthlyWrap}>
      {groupedNotices.map((group) => (
        <div key={group.month} style={styles.monthGroup}>
          <div style={styles.monthHeader}>
            <h3 style={styles.monthTitle}>{formatMonthTitle(group.month)}</h3>
            <span style={styles.monthCount}>{group.items.length}건</span>
          </div>

          <NoticeTable
            notices={group.items}
            emptyText="해당 월 공고가 없습니다."
          />
        </div>
      ))}
    </div>
  );
}

function NoticeTable({ notices, emptyText }) {
  if (!notices || notices.length === 0) {
    return <div style={styles.empty}>{emptyText}</div>;
  }

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>마감일</th>
            <th style={styles.th}>분야</th>
            <th style={styles.th}>공고명</th>
            <th style={styles.th}>기관</th>
            <th style={styles.th}>출처</th>
          </tr>
        </thead>

        <tbody>
          {notices.map((n) => {
            const originalUrl = n.detail_url || n.url;

            return (
              <tr key={n.id} style={styles.tr}>
                <td style={styles.tdDate}>{n.end_date || "-"}</td>
                <td style={styles.td}>{n.category || "-"}</td>
                <td style={styles.tdTitle}>
                  {originalUrl ? (
                    <a
                      href={originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.link}
                    >
                      {n.title}
                    </a>
                  ) : (
                    <span>{n.title}</span>
                  )}
                </td>
                <td style={styles.td}>{n.organization || "-"}</td>
                <td style={styles.td}>{n.source}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatMonthTitle(month) {
  if (!month || month === "날짜 없음") return "날짜 없음";

  const [year, mm] = month.split("-");
  return `${year}년 ${Number(mm)}월`;
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "#f5f7fb",
    color: "#1f2937",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "18px",
  },
  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 800,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#6b7280",
    fontSize: "15px",
  },
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  primaryButton: {
    border: 0,
    borderRadius: "10px",
    padding: "11px 16px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "11px 16px",
    background: "#fff",
    color: "#374151",
    fontWeight: 700,
    cursor: "pointer",
  },
  message: {
    marginBottom: "16px",
    padding: "12px 14px",
    borderRadius: "10px",
    background: "#eef2ff",
    color: "#3730a3",
    fontWeight: 600,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
    marginBottom: "18px",
  },
  summaryCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  summaryLabel: {
    color: "#6b7280",
    fontSize: "14px",
    marginBottom: "8px",
  },
  summaryValue: {
    fontSize: "24px",
    fontWeight: 800,
  },
  filterCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  filterHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "14px",
    gap: "14px",
  },
  filterDesc: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: "13px",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr auto",
    gap: "12px",
    alignItems: "end",
  },
  filterItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    color: "#6b7280",
    fontWeight: 700,
  },
  input: {
    height: "42px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "0 12px",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
  },
  checkboxWrap: {
    height: "42px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#374151",
    whiteSpace: "nowrap",
  },
  resetButton: {
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "9px 13px",
    background: "#fff",
    color: "#374151",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  card: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
  },
  helperText: {
    color: "#6b7280",
    fontSize: "13px",
  },
  monthlyWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  monthGroup: {
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    overflow: "hidden",
    background: "#fff",
  },
  monthHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },
  monthTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 800,
    color: "#111827",
  },
  monthCount: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#2563eb",
    background: "#eff6ff",
    padding: "5px 10px",
    borderRadius: "999px",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#374151",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #eef2f7",
  },
  td: {
    padding: "12px",
    verticalAlign: "top",
    color: "#374151",
    whiteSpace: "nowrap",
  },
  tdDate: {
    padding: "12px",
    verticalAlign: "top",
    fontWeight: 800,
    color: "#dc2626",
    whiteSpace: "nowrap",
  },
  tdTitle: {
    padding: "12px",
    verticalAlign: "top",
    minWidth: "360px",
  },
  link: {
    color: "#1d4ed8",
    fontWeight: 700,
    textDecoration: "none",
  },
  empty: {
    padding: "24px",
    textAlign: "center",
    color: "#6b7280",
    background: "#f9fafb",
    borderRadius: "12px",
  },
};
