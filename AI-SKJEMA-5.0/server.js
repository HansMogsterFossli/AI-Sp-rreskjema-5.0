import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));

const submissions = []; // newest first
const FALLBACK_ACKS = [
  "Takk for at du sier fra — det høres skikkelig ubehagelig ut.",
  "Skjønner. Takk for at du deler.",
  "Det gir mening. La oss ta ett spørsmål om gangen.",
  "Jeg hører deg. Vi tar neste spørsmål nå."
];

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

app.post("/api/ack", async (req, res) => {
  const apiKey = process.env.CHATAI_API_KEY;
  const baseUrl = process.env.CHATAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
  const model = process.env.CHATAI_MODEL || "gpt-4.1-mini";

  const { userAnswer, nextQuestionLabel } = req.body || {};

  if (!apiKey) return res.json({ text: pick(FALLBACK_ACKS) });

  try {
    const messages = [
      {
        role: "system",
        content:
          "Du er en varm, kort og nøytral samtaleassistent i en demo. " +
          "Svar på norsk, maks 1 setning. Vær empatisk og menneskelig. " +
          "Ikke gi medisinske råd, ikke diagnostiser."
      },
      {
        role: "user",
        content:
          `Bruker svarte: "${String(userAnswer)}". ` +
          `Gi en kort empatisk respons (maks 1 setning) som leder naturlig inn i neste spørsmål: "${String(nextQuestionLabel)}". ` +
          "Ikke si 'Notert'."
      }
    ];

    const resp = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.6 })
    });

    if (!resp.ok) return res.json({ text: pick(FALLBACK_ACKS) });
    const data = await resp.json();
    const txt = data?.choices?.[0]?.message?.content?.trim();
    res.json({ text: txt || pick(FALLBACK_ACKS) });
  } catch {
    res.json({ text: pick(FALLBACK_ACKS) });
  }
});

app.post("/api/submit", (req, res) => {
  const record = { id: uid(), createdAt: new Date().toISOString(), ...(req.body || {}) };
  submissions.unshift(record);
  res.json({ ok: true, id: record.id });
});
app.get("/api/list", (_req, res) => res.json(submissions));
app.post("/api/clear", (_req, res) => { submissions.length = 0; res.json({ ok: true }); });

app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Web service listening on :${port}`));
