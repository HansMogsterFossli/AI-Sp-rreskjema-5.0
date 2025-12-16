export const QUESTIONS = [
  { id: "open_intro", type: "text", label: "Før vi starter: hva er det viktigste du ønsker at vi skal forstå om plagene dine?" },
  {
    id: "q1_duration", type: "select_scored",
    label: "For å få litt kontekst: hvor lenge har du hatt disse plagene?",
    options: [
      { label: "0–1 uker", score: 1 },
      { label: "1–2 uker", score: 2 },
      { label: "3–4 uker", score: 3 },
      { label: "4–5 uker", score: 4 },
      { label: "6–8 uker", score: 5 },
      { label: "9–11 uker", score: 6 },
      { label: "3–6 måneder", score: 7 },
      { label: "6–9 måneder", score: 8 },
      { label: "9–12 måneder", score: 9 },
      { label: "Over ett år", score: 10 }
    ]
  },
  { id: "q2_pain", type: "scale", label: "Når du ser tilbake på siste uke: hvor sterke smerter har du hatt? (0–10)", min: 0, max: 10, reverse: false },
  { id: "q3_lightWork", type: "scale", label: "I hvor stor grad opplever du at du kan gjøre lettere arbeid under en time? (0–10)", min: 0, max: 10, reverse: true },
  { id: "q4_sleep", type: "scale", label: "Hvordan har nattesøvnen fungert? (0–10)", min: 0, max: 10, reverse: true },
  { id: "q5_stress", type: "scale", label: "Hvor anspent eller stresset har du kjent deg den siste uken? (0–10)", min: 0, max: 10, reverse: false },
  { id: "q6_mood", type: "scale", label: "I hvilken grad har du kjent deg nedstemt den siste uken? (0–10)", min: 0, max: 10, reverse: false },
  { id: "q7_risk", type: "scale", label: "Hva tenker du om risikoen for at plagene kan bli langvarige? (0–10)", min: 0, max: 10, reverse: false },
  { id: "q8_work3mo", type: "scale", label: "Hvor stor tror du sjansen er for at du er i arbeid om tre måneder? (0–10)", min: 0, max: 10, reverse: true },
  { id: "q9_stopSignal", type: "scale", label: "Hvis plagene øker, føler du at du bør stoppe det du gjør til det roer seg? (0–10)", min: 0, max: 10, reverse: false },
  { id: "q10_avoidNormal", type: "scale", label: "Opplever du at du bør unngå normale aktiviteter/arbeid med smerten du har nå? (0–10)", min: 0, max: 10, reverse: false }
];

export const SCORE_ITEM_IDS = [
  "q1_duration","q2_pain","q3_lightWork","q4_sleep","q5_stress","q6_mood","q7_risk","q8_work3mo","q9_stopSignal","q10_avoidNormal"
];

export const QUESTION_LABELS = Object.fromEntries(QUESTIONS.map(q => [q.id, q.label]));
