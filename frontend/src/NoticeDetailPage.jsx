import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = "http://localhost:4000";

export default function NoticeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [notice, setNotice] = useState(null);
  const [message, setMessage] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        setMessage("");

        const res = await fetch(`${API_BASE}/api/notices/${id}`);
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || "상세 조회 실패");
        }

        let item = data.item;
        setNotice(item);

        if (item.ai_summary) return;

        if (!item.content && !item.eligibility && !item.support_scale) {
          const detailRes = await fetch(
            `${API_BASE}/api/notices/${id}/collect-detail`,
            { method: "POST" },
          );

          const detailData = await detailRes.json();

          if (detailData.success) {
            item = detailData.item;
            setNotice(item);
          }
        }

        setSummaryLoading(true);

        const summaryRes = await fetch(
          `${API_BASE}/api/notices/${id}/local-summary`,
          { method: "POST" },
        );

        const summaryData = await summaryRes.json();

        if (summaryData.success) {
          setNotice((prev) => ({
            ...prev,
            ai_summary: summaryData.summary,
          }));
        }
      } catch (err) {
        setMessage(err.message);
      } finally {
        setSummaryLoading(false);
      }
    };

    init();
  }, [id]);

  if (message) {
    return (
      <div style={styles.page}>
        <button style={styles.backButton} onClick={() => navigate("/")}>
          ← 목록으로
        </button>
        <div style={styles.errorBox}>오류: {message}</div>
      </div>
    );
  }

  if (!notice) {
    return <div style={styles.page}>로딩 중...</div>;
  }

  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={() => navigate("/")}>
        ← 목록으로
      </button>

      <section style={styles.heroCard}>
        <div style={styles.heroTop}>
          <div>
            <div style={styles.badgeRow}>
              <span style={styles.sourceBadge}>{notice.source}</span>
              <span style={styles.categoryBadge}>
                {notice.category || "분야 미분류"}
              </span>
            </div>

            <h1 style={styles.title}>{notice.title}</h1>
          </div>

          <div style={styles.topActions}>
            <a
              href={notice.detail_url || notice.url}
              target="_blank"
              rel="noreferrer"
              style={styles.primaryLink}
            >
              원문 페이지
            </a>
          </div>
        </div>

        <div style={styles.summaryGrid}>
          <Info label="주관기관" value={notice.organization} />
          <Info
            label="공고일자"
            value={notice.published_date || notice.created_at}
          />
          <Info label="시작일자" value={notice.start_date} />
          <Info label="마감일자" value={notice.end_date} danger />
          <Info label="지원분야" value={notice.category} />
        </div>
      </section>

      <section style={styles.summaryCard}>
        <div style={styles.summaryHeader}>
          <div>
            <h2 style={styles.summaryTitle}>지원사업 요약</h2>
            <p style={styles.summaryDesc}>
              로컬 AI가 공고 내용을 신청 판단용으로 정리합니다.
            </p>
          </div>
        </div>

        <div style={notice.ai_summary ? styles.summaryBody : styles.emptyBody}>
          {summaryLoading
            ? "로컬 AI가 공고 내용을 분석하고 있습니다..."
            : notice.ai_summary || "요약 준비 중입니다."}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, danger }) {
  return (
    <div style={styles.infoBox}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={danger ? styles.infoValueDanger : styles.infoValue}>
        {value || "-"}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: 28,
    background: "#f3f6fb",
    color: "#1f2937",
    boxSizing: "border-box",
  },
  backButton: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "10px 14px",
    background: "#fff",
    cursor: "pointer",
    marginBottom: 16,
    fontWeight: 800,
  },
  heroCard: {
    background: "#fff",
    borderRadius: 22,
    padding: 30,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.07)",
    marginBottom: 20,
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
    marginBottom: 24,
  },
  badgeRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  sourceBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    fontWeight: 900,
    fontSize: 13,
  },
  categoryBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#ecfdf5",
    color: "#047857",
    fontWeight: 900,
    fontSize: 13,
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.35,
    fontWeight: 900,
  },
  topActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  primaryLink: {
    display: "inline-block",
    background: "#2563eb",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 900,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 12,
  },
  infoBox: {
    background: "#f9fafb",
    borderRadius: 14,
    padding: 14,
    border: "1px solid #eef2f7",
  },
  infoLabel: {
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 6,
  },
  infoValue: {
    fontWeight: 800,
    lineHeight: 1.4,
  },
  infoValueDanger: {
    fontWeight: 900,
    color: "#dc2626",
  },
  summaryCard: {
    background: "#fff",
    borderRadius: 22,
    padding: 30,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.07)",
  },
  summaryHeader: {
    marginBottom: 20,
  },
  summaryTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
  },
  summaryDesc: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: 14,
  },
  summaryBody: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.85,
    color: "#1f2937",
    fontSize: 16,
    background: "#f8fafc",
    borderRadius: 16,
    padding: 22,
    border: "1px solid #e5e7eb",
  },
  emptyBody: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.7,
    color: "#9ca3af",
    background: "#f9fafb",
    padding: 22,
    borderRadius: 16,
    border: "1px dashed #d1d5db",
    textAlign: "center",
  },
  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: 16,
    borderRadius: 12,
    fontWeight: 700,
  },
};
