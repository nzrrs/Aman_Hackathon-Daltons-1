import React, { useMemo, useState } from "react";
import { useStore } from "../store.jsx";
import { STATUS_CONFIG } from "../data/seed.js";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import AppModal from "./AppModal.jsx";

const STATUS_ACTIONS = [
  { value: "resolved", label: "Résolu", color: "#10b981" },
  { value: "false", label: "Faux", color: "#f97316" },
  { value: "duplicate", label: "Doublon", color: "#14b8a6" },
];

const EDITABLE_FIELDS = ["description", "reportedBy", "severity", "status"];

function timeAgo(iso) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
}

function normalizeText(value = "") {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function hoursSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

export default function AdminPanel() {
  const { reports, setReportStatus, markReportResolved, deleteReport, patchReport } = useStore();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [pendingDeleteReport, setPendingDeleteReport] = useState(null);
  const [pendingResolveReport, setPendingResolveReport] = useState(null);
  const [draft, setDraft] = useState({
    description: "",
    reportedBy: "",
    severity: "medium",
    status: "active",
  });

  const duplicateIds = useMemo(() => {
    const byFingerprint = new Map();
    reports.forEach((report) => {
      const key = `${report.city}|${report.neighborhood}|${normalizeText(report.description)}`;
      byFingerprint.set(key, [...(byFingerprint.get(key) || []), report.id]);
    });
    const duplicates = new Set();
    byFingerprint.forEach((ids) => {
      if (ids.length < 2) return;
      ids.forEach((id) => duplicates.add(id));
    });
    return duplicates;
  }, [reports]);

  const visibleReports = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return [...reports]
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
      .filter((report) => {
        if (!normalizedQuery) return true;
        const target = normalizeText(
          `${report.city} ${report.neighborhood} ${report.description} ${report.reportedBy}`,
        );
        return target.includes(normalizedQuery);
      });
  }, [reports, query]);

  const openEdit = (report) => {
    setEditingId(report.id);
    setDraft({
      description: report.description,
      reportedBy: report.reportedBy,
      severity: report.severity,
      status: report.status,
    });
  };

  const saveEdit = (reportId) => {
    const patch = {};
    EDITABLE_FIELDS.forEach((key) => {
      patch[key] = draft[key];
    });
    const updated = patchReport(reportId, patch);
    if (!updated) return;
    setEditingId(null);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24 }}>
              Console d'administration
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>
              Modération en direct des signalements, détection de doublons et nettoyage des faux rapports.
            </div>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher ville, quartier, description, auteur..."
            style={{
              width: 360,
              maxWidth: "100%",
              background: "var(--bg3)",
              border: "1px solid var(--border2)",
              color: "var(--text)",
              padding: "9px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "var(--font-body)",
            }}
          />
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 12,
        }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" }}>Total</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>{reports.length}</div>
          </div>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" }}>Suspects doublon</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)", color: "#14b8a6" }}>{duplicateIds.size}</div>
          </div>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" }}>Actifs &gt; 24h</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)", color: "#ef4444" }}>
              {reports.filter((r) => ["active", "partial"].includes(r.status) && hoursSince(r.reportedAt) >= 24).length}
            </div>
          </div>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" }}>Faux + Doublons</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)", color: "#f97316" }}>
              {reports.filter((r) => r.status === "false" || r.status === "duplicate").length}
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg2)" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "90px 170px 120px 110px 1fr 250px 110px",
            gap: 10,
            padding: "10px 12px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg3)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text3)",
            fontWeight: 700,
          }}>
            <span>ID</span>
            <span>Zone</span>
            <span>Signalé</span>
            <span>Statut</span>
            <span>Description</span>
            <span>Actions rapides</span>
            <span>Ops</span>
          </div>

          {visibleReports.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
              Aucun signalement correspondant.
            </div>
          )}

          {visibleReports.map((report) => {
            const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.active;
            const isDuplicate = duplicateIds.has(report.id);
            const isLongActive = ["active", "partial"].includes(report.status) && hoursSince(report.reportedAt) >= 24;
            const isEditing = editingId === report.id;
            const warning = isDuplicate || isLongActive || report.status === "false" || report.status === "duplicate";

            return (
              <div key={report.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "90px 170px 120px 110px 1fr 250px 110px",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  background: warning ? "rgba(249,115,22,0.04)" : "transparent",
                }}>
                  <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "monospace" }}>{report.id}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{report.neighborhood}</div>
                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{report.city}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>{timeAgo(report.reportedAt)}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, borderRadius: 999, padding: "2px 8px", background: cfg.bg, color: cfg.color, fontWeight: 700 }}>
                        {cfg.label}
                      </span>
                      {report.status === "resolved" && report.resolvedBy === "community" && (
                        <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>
                          Signal communauté
                        </span>
                      )}
                      {isDuplicate && (
                        <span style={{ fontSize: 10, color: "#14b8a6", fontWeight: 700 }}>Doublon?</span>
                      )}
                    {isLongActive && (
                      <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>Actif &gt;24h</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
                    <div>{report.description}</div>
                    {report.status === "resolved" && report.resolvedBy === "community" && (
                      <div
                        style={{
                          marginTop: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          borderRadius: 999,
                          border: "1px solid rgba(16,185,129,0.35)",
                          background: "rgba(16,185,129,0.12)",
                          color: "#10b981",
                          padding: "2px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        ✅ Résolu par la communauté
                        {(report.resolvedAt || report.estimatedRestore) && (
                          <span style={{ color: "var(--text2)", fontWeight: 500 }}>
                            · {timeAgo(report.resolvedAt || report.estimatedRestore)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {STATUS_ACTIONS.map((action) => (
                        <button
                          key={action.value}
                          onClick={() => {
                            if (action.value === "resolved") {
                              setPendingResolveReport(report);
                              return;
                            }
                            setReportStatus(report.id, action.value);
                          }}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 7,
                          border: `1px solid ${action.color}55`,
                          background: "transparent",
                          color: action.color,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => (isEditing ? setEditingId(null) : openEdit(report))}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 7,
                        border: "1px solid var(--border2)",
                        background: "var(--bg3)",
                        color: "var(--text2)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {isEditing ? "Fermer" : "Éditer"}
                    </button>
                    <button
                      onClick={() => setPendingDeleteReport(report)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 7,
                        border: "1px solid rgba(239,68,68,0.4)",
                        background: "rgba(239,68,68,0.08)",
                        color: "#ef4444",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Suppr.
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 180px 130px 150px auto",
                    gap: 8,
                    padding: "10px 12px 12px",
                    borderTop: "1px solid var(--border)",
                    background: "rgba(20,28,40,0.55)",
                  }}>
                    <textarea
                      rows={2}
                      value={draft.description}
                      onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                      style={{
                        background: "var(--bg3)",
                        border: "1px solid var(--border2)",
                        borderRadius: 8,
                        color: "var(--text)",
                        fontSize: 12,
                        padding: "8px 10px",
                        fontFamily: "var(--font-body)",
                        resize: "vertical",
                      }}
                    />
                    <input
                      type="text"
                      value={draft.reportedBy}
                      onChange={(e) => setDraft((prev) => ({ ...prev, reportedBy: e.target.value }))}
                      style={{
                        background: "var(--bg3)",
                        border: "1px solid var(--border2)",
                        borderRadius: 8,
                        color: "var(--text)",
                        fontSize: 12,
                        padding: "8px 10px",
                        fontFamily: "var(--font-body)",
                      }}
                    />
                    <select
                      value={draft.severity}
                      onChange={(e) => setDraft((prev) => ({ ...prev, severity: e.target.value }))}
                      style={{
                        background: "var(--bg3)",
                        border: "1px solid var(--border2)",
                        borderRadius: 8,
                        color: "var(--text)",
                        fontSize: 12,
                        padding: "8px 10px",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      <option value="low">Sévérité faible</option>
                      <option value="medium">Sévérité moyenne</option>
                      <option value="high">Sévérité élevée</option>
                    </select>
                    <select
                      value={draft.status}
                      onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
                      style={{
                        background: "var(--bg3)",
                        border: "1px solid var(--border2)",
                        borderRadius: 8,
                        color: "var(--text)",
                        fontSize: 12,
                        padding: "8px 10px",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                        <option key={key} value={key}>{value.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => saveEdit(report.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(16,185,129,0.4)",
                        background: "rgba(16,185,129,0.12)",
                        color: "#10b981",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Enregistrer
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <AppModal
          open={Boolean(pendingResolveReport)}
          onClose={() => setPendingResolveReport(null)}
          title="Confirmer la résolution"
          description="Sans backend ni authentification, cette résolution reste un signal communautaire et peut être inexacte ou malveillante."
          footer={(
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setPendingResolveReport(null)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border2)",
                  background: "transparent",
                  color: "var(--text2)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!pendingResolveReport) return;
                  const updated = markReportResolved(pendingResolveReport.id);
                  if (!updated) return;
                  setPendingResolveReport(null);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(16,185,129,0.45)",
                  background: "rgba(16,185,129,0.12)",
                  color: "#10b981",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Marquer résolu
              </button>
            </div>
          )}
        >
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
            {pendingResolveReport ? (
              <>
                <strong>{pendingResolveReport.neighborhood}</strong>
                <span style={{ color: "var(--text3)" }}> · {pendingResolveReport.city}</span>
                <div style={{ marginTop: 8 }}>{pendingResolveReport.description}</div>
              </>
            ) : null}
          </div>
        </AppModal>
        <AppModal
          open={Boolean(pendingDeleteReport)}
          onClose={() => setPendingDeleteReport(null)}
          title="Supprimer le signalement"
          description="Cette action retire immédiatement le rapport de toutes les vues (carte, liste, stats, heatmap)."
          footer={(
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setPendingDeleteReport(null)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border2)",
                  background: "transparent",
                  color: "var(--text2)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!pendingDeleteReport) return;
                  deleteReport(pendingDeleteReport.id);
                  setPendingDeleteReport(null);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.45)",
                  background: "rgba(239,68,68,0.12)",
                  color: "#ef4444",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Supprimer
              </button>
            </div>
          )}
        >
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
            {pendingDeleteReport ? (
              <>
                <strong>{pendingDeleteReport.neighborhood}</strong>
                <span style={{ color: "var(--text3)" }}> · {pendingDeleteReport.city}</span>
                <div style={{ marginTop: 8 }}>{pendingDeleteReport.description}</div>
              </>
            ) : null}
          </div>
        </AppModal>
      </div>
    </div>
  );
}
