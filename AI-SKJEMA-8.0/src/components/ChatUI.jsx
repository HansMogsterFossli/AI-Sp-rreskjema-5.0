import React, { useEffect, useRef, useState } from "react";
import { postJSON } from "../api.js";

function Bubble({ who, children }) {
  return (
    <div className={`row ${who}`}>
      <div className="bubble">{children}</div>
    </div>

function clampInt(value, min, max) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return "";
  return String(Math.min(max, Math.max(min, n)));
}

export default function ChatUI({ questions, onComplete }) {
  function handleEnterSend(e, sendFn, enabled) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (enabled) sendFn();
    }
  }

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState("");
  const [comment, setComment] = useState("");
  const [botTyping, setBotTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);

  function scrollToBottom() {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  // initial question in a slightly freer phrasing
  useEffect(() => {
    (async () => {
      const first = questions[0];
      let qText = first?.label || "Klar?";
      try {
        const out = await postJSON("/api/question", { questionId: first?.id, label: first?.label });
        qText = out?.text || qText;
      } catch {}
      setMessages([
        { who: "bot", text: "Hei 👋 Jeg skal stille noen korte spørsmål, så lager jeg en oppsummering." },
        { who: "bot", text: qText }
      ]);
      setTimeout(scrollToBottom, 50);
    })();
  }, []);

  const current = questions[step];
  const isDone = step >= questions.length;

  async function submit(value, optionalComment) {
    const q = questions[step];
    const nextAnswers = { ...answers, [q.id]: value };
    if (optionalComment && optionalComment.trim().length > 0) {
      nextAnswers[`${q.id}_comment`] = optionalComment.trim();
    }
    setAnswers(nextAnswers);

    setMessages((m) => [
      ...m,
      { who: "user", text: String(value) },
      ...(optionalComment && optionalComment.trim().length > 0 ? [{ who: "user", text: `Ekstra: ${optionalComment.trim()}` }] : [])
    ]);

    setDraft("");
    setComment("");

    const nextStep = step + 1;
    if (nextStep >= questions.length) {
      await onComplete(nextAnswers);
      setMessages((m) => [...m, { who: "bot", text: "Tusen takk — da er vi ferdig. Oppsummeringen ligger på veileder-siden." }]);
      setStep(nextStep);
      setTimeout(scrollToBottom, 50);
      return;
    }

    setBotTyping(true);
    const next = questions[nextStep];
    const nextLabel = next?.label ?? "neste spørsmål";
    let ack = "Skjønner. Takk for at du deler.";
    let qText = nextLabel;

    try {
      const out = await postJSON("/api/turn", { userAnswer: value, nextQuestionLabel: nextLabel });
      ack = out?.ack || ack;
    } catch {
      // fallback
      try {
        const out = await postJSON("/api/ack", { userAnswer: value, nextQuestionLabel: nextLabel });
        ack = out?.text || ack;
      } catch {}
    }

    try {
      const qOut = await postJSON("/api/question", { questionId: next?.id, label: nextLabel });
      qText = qOut?.text || qText;
    } catch {}

    setBotTyping(false);
    setMessages((m) => [...m, { who: "bot", text: ack }, { who: "bot", text: qText }]);
    setStep(nextStep);
    setTimeout(scrollToBottom, 50);
  }

  const canSend = (() => {
    if (!current || isDone) return false;
    if (current.type === "text") return draft.trim().length > 0;
    if (current.type === "select_scored") return draft !== "";
    if (current.type === "scale") return draft !== "" && Number.isFinite(Number(draft));
    return false;
  })();

  const showOptionalComment = current && current.type !== "text";

  return (
    <div className="card">
      <div ref={listRef} style={{ maxHeight: 600, overflow: "auto", paddingRight: 8 }}>
        <div className="chat">
          {messages.map((m, idx) => (
            <Bubble key={idx} who={m.who}>{m.text}</Bubble>
          ))}
          {botTyping && <Bubble who="bot">...</Bubble>}
        </div>
      </div>

      {!isDone && current && (
        <div className="inputBar">
          {current.type === "text" && (
            <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => handleEnterSend(e, () => submit(draft.trim(), comment), canSend && !botTyping)} placeholder="Skriv her…" />
          )}

          {current.type === "select_scored" && (
            <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 10 }}>
              <select className="input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => handleEnterSend(e, () => submit(draft.trim(), comment), canSend && !botTyping)}>
                <option value="">Velg…</option>
                {current.options.map((o) => (
                  <option key={o.label} value={o.label}>{o.label}</option>
                ))}
              </select>
              {showOptionalComment && (
                <textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ekstra kommentar (valgfritt)…" />
              )}
            </div>
          )}

          {current.type === "scale" && (
            <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                className="input"
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(clampInt(e.target.value, current.min, current.max))}
                onKeyDown={(e) => handleEnterSend(e, () => submit(Number(draft), comment), canSend && !botTyping)}
                placeholder={`${current.min}–${current.max}`}
              />
              {showOptionalComment && (
                <textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ekstra kommentar (valgfritt)…" />
              )}
            </div>
          )}

          <button className="btn" disabled={!canSend || botTyping} onClick={() => {
            if (current.type === "scale") submit(Number(draft), comment);
            else submit(draft.trim(), comment);
          }}>
            Send
          </button>
        </div>
      )}
    </div>
