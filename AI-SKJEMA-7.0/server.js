import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));

// ===== DEMO STORAGE (RAM) =====
const submissions = []; // newest first

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Fallback tone (no API key) ---
const FALLBACK_ACKS = [
  "Takk for at du sier fra — det høres skikkelig ubehagelig ut.",
  "Skjønner. Takk for at du deler.",
  "Det gir mening. Vi tar ett steg om gangen.",
  "Jeg hører deg. La oss gå videre.",
  "Takk, det er nyttig å vite."
];

// Slightly freer question templates (still same meaning)
const FALLBACK_QUESTIONS = {
  open_intro: [
    "Før vi starter: hva er det viktigste du ønsker at vi skal forstå om plagene dine?",
    "Hva er det viktigste du vil at vi skal få med oss om plagene dine?",
    "Hvis du skulle oppsummere: hva håper du vi forstår om plagene dine?"
  ],
  q1_duration: [
    "For å få litt kontekst: hvor lenge har du hatt disse plagene?",
    "Omtrent hvor lenge har dette vart?",
    "Når startet dette omtrent?"
  ],
  q2_pain: [
    "Når du ser tilbake på siste uke: hvor sterke smerter har du hatt? (0–10)",
    "Hvis du må sette et tall (0–10): hvor vondt har det vært siste uka?",
    "På en skala fra 0 til 10 – hvor sterke smerter siste uke?"
  ],
  q3_lightWork: [
    "I hvor stor grad opplever du at du kan gjøre lettere arbeid under en time? (0–10)",
    "Hvis du må velge et tall (0–10): hvor mulig er lett arbeid under en time?",
    "0–10: hvor lett er det å gjøre lett arbeid under en time nå?"
  ],
  q4_sleep: [
    "Hvordan har nattesøvnen fungert? (0–10)",
    "0–10: hvordan har søvnen vært i det siste?",
    "Hvis du må velge: hvor greit har du sovet? (0–10)"
  ],
  q5_stress: [
    "Hvor anspent eller stresset har du kjent deg den siste uken? (0–10)",
    "0–10: hvor stresset/anspent har du kjent deg?",
    "Hvis du setter et tall: hvor stresset siste uke? (0–10)"
  ],
  q6_mood: [
    "I hvilken grad har du kjent deg nedstemt den siste uken? (0–10)",
    "0–10: hvor nedstemt har du vært siste uke?",
    "Hvis du må velge et tall: hvor nedstemt har du kjent deg? (0–10)"
  ],
  q7_risk: [
    "Hva tenker du om risikoen for at plagene kan bli langvarige? (0–10)",
    "0–10: hvor stor risiko føler du det er for at dette blir langvarig?",
    "Hvis du må velge: hvor bekymret er du for at dette varer lenge? (0–10)"
  ],
  q8_work3mo: [
    "Hvor stor tror du sjansen er for at du er i arbeid om tre måneder? (0–10)",
    "0–10: hvor sannsynlig er det at du er i jobb om 3 måneder?",
    "Hvis du må velge: sjansen for arbeid om tre måneder (0–10)?"
  ],
  q9_stopSignal: [
    "Hvis plagene øker, føler du at du bør stoppe det du gjør til det roer seg? (0–10)",
    "0–10: hvis det blir verre, føler du at du må stoppe helt til det roer seg?",
    "Hvis du må velge: hvor mye må du stoppe når det øker? (0–10)"
  ],
  q10_avoidNormal: [
    "Opplever du at du bør unngå normale aktiviteter/arbeid med smerten du har nå? (0–10)",
    "0–10: hvor mye føler du at du bør unngå normale aktiviteter nå?",
    "Hvis du må velge: hvor mye unngår du normale ting pga smerten? (0–10)"
  ]
};

function fallbackQuestion(questionId, label) {
  const arr = FALLBACK_QUESTIONS[questionId];
  return arr ? pick(arr) : (label || "OK, neste spørsmål.");
}

// ===== LLM helpers =====
async function llmGenerate({ userAnswer, nextQuestionLabel, mode }) {
  const apiKey = process.env.CHATAI_API_KEY;
  const baseUrl = process.env.CHATAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
  const model = process.env.CHATAI_MODEL || "gpt-4.1-mini";
  if (!apiKey) return null;

  const sys =
    "Du er en varm, kort og nøytral samtaleassistent i en demo. " +
    "Svar på norsk. Ikke gi medisinske råd, ikke diagnostiser. " +
    "Hold det kort og menneskelig.";

  let user;
  if (mode === "ack") {
    user =
      `Bruker svarte: "${String(userAnswer)}". ` +
      `Skriv en empatisk respons (maks 1 setning) som leder naturlig inn i neste spørsmål. ` +
      `IKKE si 'Notert'.`;
  } else {
    user =
      `Lag en mer naturlig, mindre rigid formulering av dette spørsmålet, med samme mening: "${String(nextQuestionLabel)}". ` +
      `Maks 1 setning. Hvis det er en 0–10-skala, inkluder "(0–10)" i setningen.`;
  }

  try {
    const resp = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: sys }, { role: "user", content: user }], temperature: 0.6 })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const txt = data?.choices?.[0]?.message?.content?.trim();
    return txt || null;
  } catch {
    return null;
  }
}

// Get question in freer phrasing
app.post("/api/question", async (req, res) => {
  const { questionId, label } = req.body || {};
  const ai = await llmGenerate({ nextQuestionLabel: label, mode: "question" });
  res.json({ text: ai || fallbackQuestion(questionId, label) });
});

// After user answers: return { ack, question } for next step
app.post("/api/turn", async (req, res) => {
  const { userAnswer, nextQuestionLabel } = req.body || {};
  const ackAI = await llmGenerate({ userAnswer, nextQuestionLabel, mode: "ack" });

  // Guard: if the model accidentally asks a question, strip it.
  let ack = (ackAI || "").trim();
  if (ack.includes("?")) ack = ack.split("?")[0].trim().replace(/[.!\s]*$/, "") + ".";
  if (!ack) ack = pick(FALLBACK_ACKS);

  res.json({ ack });
});
const qAI = await llmGenerate({ nextQuestionLabel, mode: "question" });

  res.json({
    ack: ackAI || pick(FALLBACK_ACKS),
    question: qAI || fallbackQuestion(nextQuestionId, nextQuestionLabel)
  });
});

// Backward-compatible endpoint
app.post("/api/ack", async (req, res) => {
  const { userAnswer, nextQuestionLabel } = req.body || {};
  const ackAI = await llmGenerate({ userAnswer, nextQuestionLabel, mode: "ack" });
  res.json({ text: ackAI || pick(FALLBACK_ACKS) });
});

// ===== SUBMISSION API =====
app.post("/api/submit", (req, res) => {
  const record = { id: uid(), createdAt: new Date().toISOString(), ...(req.body || {}) };
  submissions.unshift(record);
  res.json({ ok: true, id: record.id });
});
app.get("/api/list", (_req, res) => res.json(submissions));
app.post("/api/clear", (_req, res) => { submissions.length = 0; res.json({ ok: true }); });

// ===== Serve frontend build =====
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Web service listening on :${port}`));
