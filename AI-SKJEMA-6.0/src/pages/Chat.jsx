import React, { useState } from "react";
import ChatUI from "../components/ChatUI.jsx";
import { QUESTIONS } from "../questions.js";
import { scoreAnswers, interpretProfile, buildSummary } from "../scoring.js";
import { postJSON } from "../api.js";

export default function Chat() {
  const [lastId, setLastId] = useState(null);

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h1">Pasient-demo</div>
        <div className="small">Lett frihet: spørsmålene høres litt mer naturlige ut, men scoring er den samme.</div>
        {lastId && <div className="small" style={{ marginTop: 10 }}>✅ Sendt inn (id): <b>{lastId}</b></div>}
      </div>

      <ChatUI
        questions={QUESTIONS}
        onComplete={async (rawAnswers) => {
          const scoredPack = scoreAnswers(rawAnswers);
          const interp = interpretProfile(rawAnswers, scoredPack);
          const summary = buildSummary(rawAnswers, scoredPack, interp);

          const submission = {
            rawAnswers,
            scored: scoredPack.scored,
            totalScore: scoredPack.total,
            interpretation: interp,
            summary
          };

          const out = await postJSON("/api/submit", submission);
          setLastId(out?.id || null);
        }}
      />
    </div>
  );
}
