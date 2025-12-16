import { QUESTIONS, SCORE_ITEM_IDS, QUESTION_LABELS } from "./questions.js";

export function scoreAnswers(rawAnswers) {
  const scored = {};
  for (const q of QUESTIONS) {
    const v = rawAnswers[q.id];
    if (q.type === "select_scored") {
      const opt = q.options.find(o => o.label === v);
      scored[q.id] = opt ? opt.score : null;
      continue;
    }
    if (q.type === "scale") {
      const n = typeof v === "number" ? v : Number(v);
      scored[q.id] = Number.isFinite(n) ? (q.reverse ? (10 - n) : n) : null;
    }
  }
  const total = SCORE_ITEM_IDS.reduce((sum, id) => sum + (Number(scored[id]) || 0), 0);
  return { scored, total };
}

export function interpretProfile(rawAnswers, scoredPack) {
  const pain = Number(rawAnswers.q2_pain ?? 0);
  const stress = Number(rawAnswers.q5_stress ?? 0);
  const mood = Number(rawAnswers.q6_mood ?? 0);
  const stopSignal = Number(rawAnswers.q9_stopSignal ?? 0);
  const avoidNormal = Number(rawAnswers.q10_avoidNormal ?? 0);

  const lightWorkProblem = Number(scoredPack.scored.q3_lightWork ?? 0);
  const sleepProblem = Number(scoredPack.scored.q4_sleep ?? 0);
  const workConcern = Number(scoredPack.scored.q8_work3mo ?? 0);

  const flags = {
    painHigh: pain >= 7,
    functionHigh: (lightWorkProblem >= 7) || (sleepProblem >= 7),
    psychosocialHigh: (stress >= 7) || (mood >= 7),
    fearAvoidanceHigh: (stopSignal >= 7) || (avoidNormal >= 7),
    workConcernHigh: workConcern >= 7
  };

  let hint = "Blandet profil (flere faktorer samtidig).";
  if (flags.psychosocialHigh && !flags.painHigh && !flags.functionHigh) hint = "Pekepinne: stress/psykososial belastning ser ut til å dominere.";
  else if ((flags.painHigh || flags.functionHigh) && !flags.psychosocialHigh) hint = "Pekepinne: mer muskel-/skjelett (muskuloskeletal) / belastningsrelatert profil.";
  else if (flags.psychosocialHigh && (flags.painHigh || flags.functionHigh || flags.fearAvoidanceHigh)) hint = "Pekepinne: muskel-/skjelett + stress/yellow flags samtidig.";

  const total = scoredPack.total;
  const riskText = total > 50 ? "Score > 50: høyere estimert risiko (screening)." : "Score ≤ 50: lavere estimert risiko (screening).";
  return { flags, hint, riskText };
}

export function buildSummary(rawAnswers, scoredPack, interp) {
  const chief = (rawAnswers.open_intro || "").toString().trim();
  const duration = (rawAnswers.q1_duration || "").toString().trim();

  const entries = Object.entries(scoredPack.scored)
    .filter(([id, v]) => id !== "q1_duration" && Number.isFinite(Number(v)))
    .map(([id, v]) => ({ id, score: Number(v), label: QUESTION_LABELS[id] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const focus = [];
  if (interp.flags.psychosocialHigh) focus.push("Psykososialt/stress: se stress, søvn, belastning og støtte.");
  if (interp.flags.fearAvoidanceHigh) focus.push("Unngåelse: utforsk trygg aktivitet og gradvis økning (demo).");
  if (interp.flags.functionHigh) focus.push("Funksjon/søvn: se søvn og tilrettelegging/aktivitetsdose (demo).");
  if (interp.flags.painHigh) focus.push("Smerte: se smerteintensitet og triggere/lindring (demo).");
  if (focus.length === 0) focus.push("Ingen tydelige 'høye' flagg i demo-terskler – se helheten.");

  const commentKeys = Object.keys(rawAnswers).filter(k => k.endsWith("_comment") && String(rawAnswers[k]||"").trim().length>0);
  const comments = commentKeys.map(k => ({ id: k.replace(/_comment$/,""), text: String(rawAnswers[k]).trim() }));

  return {
    chiefComplaint: chief || "(ikke oppgitt)",
    duration: duration || "(ikke valgt)",
    topDrivers: entries.map(e => ({ id: e.id, label: e.label, score: e.score })),
    focusHints: focus.slice(0, 3),
    extraComments: comments
  };
}
