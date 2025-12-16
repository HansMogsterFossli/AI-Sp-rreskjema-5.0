import React, { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../api.js";
import { QUESTION_LABELS } from "../questions.js";

function flagLine(label, on) {
  return (
    <div className="kv">
      <div>{label}</div>
      <div>{on ? "✅" : "—"}</div>
    </div>
  );
}

function toRows(obj, valueFormatter = (v) => String(v ?? "")) {
  if (!obj) return [];
  return Object.entries(obj).map(([k, v]) => ({ key: k, label: QUESTION_LABELS[k] || k, value: valueFormatter(v) }));
}

export default function Doctor() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState(null);

  async function refresh() {
    try {
      setErr(null);
      const data = await getJSON("/api/list");
      setList(Array.isArray(data) ? data : []);
      if (selected) {
        const updated = (Array.isArray(data) ? data : []).find(x => x.id === selected.id);
        setSelected(updated || null);
      }
    } catch {
      setErr("Klarte ikke hente list (server?).");
    }
  }

  useEffect(() => { refresh(); }, []);

  const detail = selected;
  const rawRows = useMemo(() => (detail?.rawAnswers ? toRows(detail.rawAnswers, (v) => String(v ?? "")) : []), [detail]);
  const scoreRows = useMemo(() => (detail?.scored ? toRows(detail.scored, (v) => (v === null || v === undefined) ? "" : String(v)) : []), [detail]);

  return (
    <div className="grid2">
      <div className="card">
        <div className="h1">Veileder/lege-demo</div>
        <div className="small">Klikk en innsending for detaljer. (RAM-lagring, reset ved restart)</div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={refresh}>Oppdater</button>
          <button className="btn" onClick={async () => { await postJSON("/api/clear", {}); setSelected(null); refresh(); }}>
            Tøm demo
          </button>
        </div>

        {err && <div className="small" style={{ marginTop: 10 }}>{err}</div>}

        <div className="list">
          {list.length === 0 ? (
            <div className="small">Ingen innsendinger enda.</div>
          ) : (
            list.map((s) => (
              <div key={s.id} className="item" onClick={() => setSelected(s)}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <div><b>{s.id}</b></div>
                  <div className="small">{new Date(s.createdAt).toLocaleString()}</div>
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Total: <b>{s.totalScore}</b>/100 — {s.interpretation?.riskText}
                </div>
                {s.summary?.chiefComplaint && (
                  <div className="small" style={{ marginTop: 6, opacity: 0.9 }}>
                    Kort: {String(s.summary.chiefComplaint).slice(0, 90)}{String(s.summary.chiefComplaint).length > 90 ? "…" : ""}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ height: "fit-content" }}>
        <div className="h1">Oppsummering</div>

        {!detail ? (
          <div className="small">Velg en innsending i lista.</div>
        ) : (
          <div>
            <div className="small">ID: <b>{detail.id}</b></div>
            <div className="small">Tid: {new Date(detail.createdAt).toLocaleString()}</div>

            <hr />

            <div className="badge">Total score: <b style={{ marginLeft: 6 }}>{detail.totalScore}</b> / 100</div>
            <div className="small" style={{ marginTop: 8 }}>{detail.interpretation?.riskText}</div>

            <hr />

            <div className="h2">Nøkkelpunkt</div>
            <div className="kv">
              <div>Hovedplage</div>
              <div style={{ maxWidth: 360, textAlign: "right" }}>{detail.summary?.chiefComplaint}</div>
            </div>
            <div className="kv">
              <div>Varighet</div>
              <div>{detail.summary?.duration}</div>
            </div>

            {(detail.summary?.extraComments?.length || 0) > 0 && (
              <>
                <hr />
                <div className="h2">Ekstra kommentarer</div>
                {(detail.summary.extraComments || []).map((c, idx) => (
                  <div key={idx} className="kv">
                    <div>{QUESTION_LABELS[c.id] || c.id}</div>
                    <div style={{ maxWidth: 360, textAlign: "right" }}>{c.text}</div>
                  </div>
                ))}
              </>
            )}

            <hr />

            <div className="h2">Top 3 drivere</div>
            {(detail.summary?.topDrivers || []).map((d, idx) => (
              <div key={idx} className="kv">
                <div>{d.label}</div>
                <div><b>{d.score}</b></div>
              </div>
            ))}

            <hr />

            <div className="h2">Pekepinne</div>
            <div className="small">{detail.interpretation?.hint}</div>

            <hr />

            <div className="h2">Fokus (demo)</div>
            <ul className="small" style={{ marginTop: 6 }}>
              {(detail.summary?.focusHints || []).map((t, i) => <li key={i}>{t}</li>)}
            </ul>

            <hr />

            <details>
              <summary style={{ cursor: "pointer" }}>Profiler (detalj)</summary>
              {flagLine("Høy smerte (Q2 ≥ 7)", detail.interpretation?.flags?.painHigh)}
              {flagLine("Funksjon/søvn-problem (Q3/Q4 reverse ≥ 7)", detail.interpretation?.flags?.functionHigh)}
              {flagLine("Psykososialt (stress/mood ≥ 7)", detail.interpretation?.flags?.psychosocialHigh)}
              {flagLine("Unngåelse/fare-signal (Q9/Q10 ≥ 7)", detail.interpretation?.flags?.fearAvoidanceHigh)}
              {flagLine("Arbeid-bekymring (Q8 reverse ≥ 7)", detail.interpretation?.flags?.workConcernHigh)}
            </details>

            <details>
              <summary style={{ cursor: "pointer" }}>Råsvar (lesbart)</summary>
              <table className="table" style={{ marginTop: 10 }}>
                <thead><tr><th>Spørsmål</th><th>Svar</th></tr></thead>
                <tbody>
                  {rawRows.map((r) => (
                    <tr key={r.key}><td>{r.label}</td><td>{r.value}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>

            <details>
              <summary style={{ cursor: "pointer" }}>Score per item (lesbart)</summary>
              <table className="table" style={{ marginTop: 10 }}>
                <thead><tr><th>Item</th><th>Score</th></tr></thead>
                <tbody>
                  {scoreRows.map((r) => (
                    <tr key={r.key}><td>{r.label}</td><td>{r.value}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
