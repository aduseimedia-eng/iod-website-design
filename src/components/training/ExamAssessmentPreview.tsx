"use client";

import { useEffect, useState } from "react";

import { CmsPublicPage, getPublishedCmsPage } from "@/lib/api/cms";
import { BuiltInVisibility } from "@/components/cms/BuiltInSection";

type Question = { id: string; prompt: string; options: { id: string; text: string }[]; correctOptionId: string };
type Assessment = { heading: string; instructions: string; accessCode: string; durationSeconds: number; passMark: number; showAnswerReview: boolean; questions: Question[] };

const fallback: Assessment = {
  heading: "Corporate governance assessment", instructions: "Use the code issued by IoD-Gh. Read every question carefully, flag questions to review later, and submit only when you are ready.", accessCode: "IoD-Gh-EXAM", durationSeconds: 45 * 60, passMark: 70, showAnswerReview: true,
  questions: [
    { id: "board-role", prompt: "Which statement best describes the role of a board of directors?", options: [{ id: "a", text: "To provide strategic direction and oversight." }, { id: "b", text: "To manage every daily operational activity." }, { id: "c", text: "To replace the executive management team." }, { id: "d", text: "To approve every individual expenditure." }], correctOptionId: "a" },
    { id: "governance-principle", prompt: "Which principle is essential to sound corporate governance?", options: [{ id: "a", text: "Clear accountability and responsible decision-making." }, { id: "b", text: "Avoiding communication with stakeholders." }, { id: "c", text: "Delegating all board responsibilities externally." }, { id: "d", text: "Keeping organisational objectives informal." }], correctOptionId: "a" },
    { id: "conflict", prompt: "What should a director do when a conflict of interest arises?", options: [{ id: "a", text: "Declare the interest and follow the appropriate process." }, { id: "b", text: "Keep it private to avoid delaying the meeting." }, { id: "c", text: "Vote on the matter without mentioning it." }, { id: "d", text: "Ask another director to decide informally." }], correctOptionId: "a" },
    { id: "risk", prompt: "Why should a board regularly review organisational risk?", options: [{ id: "a", text: "To ensure material risks are understood and appropriately overseen." }, { id: "b", text: "To transfer all risk decisions to external auditors." }, { id: "c", text: "To eliminate every business risk before a decision is made." }, { id: "d", text: "To limit reporting to financial risks only." }], correctOptionId: "a" },
  ],
};

const asText = (value: unknown) => typeof value === "string" ? value.trim() : "";
const cappedNumber = (value: unknown, fallbackValue: number, min: number, max: number) => { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallbackValue; };
const time = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function fromCms(page: CmsPublicPage): Assessment {
  const data = page.revision.sections.find((section) => section.section_type === "exam_assessment" && section.is_enabled)?.data;
  if (!data || !Array.isArray(data.questions)) return fallback;
  const questions = data.questions.flatMap((value, questionIndex) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const options = Array.isArray(item.options) ? item.options.flatMap((option, optionIndex) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) return [];
      const candidate = option as Record<string, unknown>; const optionText = asText(candidate.text);
      return optionText ? [{ id: asText(candidate.id) || `question-${questionIndex}-option-${optionIndex}`, text: optionText }] : [];
    }) : [];
    const correctOptionId = asText(item.correct_option_id); const prompt = asText(item.prompt);
    if (!prompt || options.length < 2) return [];
    return [{ id: asText(item.id) || `question-${questionIndex}`, prompt, options, correctOptionId: options.some((option) => option.id === correctOptionId) ? correctOptionId : options[0].id }];
  });
  if (!questions.length) return fallback;
  return { heading: asText(data.heading) || fallback.heading, instructions: asText(data.instructions) || fallback.instructions, accessCode: asText(data.access_code) || fallback.accessCode, durationSeconds: Math.round(cappedNumber(data.duration_minutes, 45, 1, 240) * 60), passMark: cappedNumber(data.pass_mark, 70, 0, 100), showAnswerReview: data.show_answer_review !== false, questions };
}

export function ExamAssessmentPreview() {
  return <BuiltInVisibility sectionId="exam-assessment" sectionType="exam_assessment"><AssessmentContent /></BuiltInVisibility>;
}

function AssessmentContent() {
  const [assessment, setAssessment] = useState(fallback);
  const [loaded, setLoaded] = useState(false);
  const [stage, setStage] = useState<"access" | "exam" | "review" | "results">("access");
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState(false);
  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(fallback.durationSeconds);

  useEffect(() => {
    let live = true;
    getPublishedCmsPage("training-exams").then((page) => { if (live) { const next = fromCms(page); setAssessment(next); setRemaining(next.durationSeconds); } }).catch(() => undefined).finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (stage !== "exam" && stage !== "review") return;
    const timer = window.setInterval(() => setRemaining((value) => { if (value <= 1) { window.clearInterval(timer); setStage("review"); return 0; } return value - 1; }), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  const answered = Object.keys(answers).length;
  const unanswered = assessment.questions.length - answered;
  const correct = assessment.questions.filter((question) => answers[question.id] === question.correctOptionId).length;
  const score = assessment.questions.length ? Math.round((correct / assessment.questions.length) * 100) : 0;
  const reset = () => { setStage("access"); setAccessCode(""); setAccessError(false); setActive(0); setAnswers({}); setFlagged([]); setRemaining(assessment.durationSeconds); };
  const start = () => { if (accessCode.trim().toUpperCase() !== assessment.accessCode.toUpperCase()) { setAccessError(true); return; } setAccessError(false); setStage("exam"); };

  if (!loaded) return <section className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-16 sm:py-20"><div className="site-container"><p className="text-sm text-[var(--color-slate)]">Loading assessment…</p></div></section>;
  if (stage === "access") return <Access assessment={assessment} accessCode={accessCode} error={accessError} onChange={setAccessCode} onSubmit={start} />;
  if (stage === "results") return <Results assessment={assessment} answers={answers} correct={correct} score={score} onRestart={reset} />;
  if (stage === "review") return <Review assessment={assessment} answers={answers} flagged={flagged} unanswered={unanswered} onReturn={(index) => { setActive(index); setStage("exam"); }} onSubmit={() => setStage("results")} />;

  const question = assessment.questions[active];
  const toggleFlag = () => setFlagged((items) => items.includes(question.id) ? items.filter((item) => item !== question.id) : [...items, question.id]);
  return <section className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-16 sm:py-20"><div className="site-container"><div className="flex flex-col justify-between gap-5 border-b border-[var(--color-line)] pb-7 sm:flex-row sm:items-end"><div><p className="eyebrow">Candidate workspace</p><h2 className="mt-4 font-serif text-[clamp(2.2rem,3.6vw,3.8rem)] leading-[1.03] tracking-[-0.05em]">{assessment.heading}</h2><p className="mt-3 text-sm text-[var(--color-slate)]">Answers remain in this browser until you submit.</p></div><div className={`w-fit border px-5 py-3 ${remaining < 300 ? "border-[var(--color-error)] bg-red-50 text-[var(--color-error)]" : "border-[var(--color-ink)] bg-white"}`}><p className="text-[0.65rem] font-bold tracking-[0.12em]">TIME REMAINING</p><p className="mt-1 font-mono text-2xl font-bold" aria-live="polite">{time(remaining)}</p></div></div><div className="mt-8 grid border border-[var(--color-line)] bg-white lg:grid-cols-12"><aside className="border-b border-[var(--color-line)] p-6 lg:col-span-3 lg:border-b-0 lg:border-r sm:p-8"><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-slate)]">ASSESSMENT PROGRESS</p><p className="mt-4 font-serif text-4xl tracking-[-0.05em]">{answered}/{assessment.questions.length}</p><div className="mt-6 grid grid-cols-4 gap-2">{assessment.questions.map((item, index) => <button key={item.id} className={`h-10 border text-sm font-bold ${active === index ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white" : flagged.includes(item.id) ? "border-[var(--color-accent-dark)] bg-[var(--color-accent-light)]" : answers[item.id] !== undefined ? "border-[var(--color-accent)] bg-[var(--color-paper)]" : "border-[var(--color-line)]"}`} type="button" onClick={() => setActive(index)} aria-label={`Question ${index + 1}`}>{index + 1}</button>)}</div><p className="mt-7 border-t border-[var(--color-line)] pt-5 text-sm leading-6 text-[var(--color-slate)]"><strong className="text-[var(--color-ink)]">{unanswered}</strong> unanswered<br /><strong className="text-[var(--color-ink)]">{flagged.length}</strong> flagged for review</p></aside><div className="p-6 sm:p-8 lg:col-span-9 lg:p-10"><p className="text-xs font-bold tracking-[0.12em] text-[var(--color-accent-dark)]">QUESTION {String(active + 1).padStart(2, "0")} OF {String(assessment.questions.length).padStart(2, "0")}</p><h3 className="mt-5 max-w-3xl font-serif text-3xl leading-[1.18] tracking-[-0.035em] sm:text-4xl">{question.prompt}</h3><fieldset className="mt-9 grid gap-3"><legend className="sr-only">Select your answer</legend>{question.options.map((option) => <label key={option.id} className={`flex cursor-pointer gap-4 border p-5 ${answers[question.id] === option.id ? "border-[var(--color-ink)] bg-[var(--color-paper)]" : "border-[var(--color-line)] hover:border-[var(--color-slate)]"}`}><input className="mt-1 h-4 w-4 accent-[var(--color-ink)]" type="radio" name={`question-${question.id}`} checked={answers[question.id] === option.id} onChange={() => setAnswers((items) => ({ ...items, [question.id]: option.id }))} /><span className="leading-7">{option.text}</span></label>)}</fieldset><div className="mt-8 flex flex-wrap items-center justify-between gap-4"><button className={`border px-4 py-3 text-sm font-bold ${flagged.includes(question.id) ? "border-[var(--color-accent-dark)] bg-[var(--color-accent-light)]" : "border-[var(--color-line)]"}`} type="button" onClick={toggleFlag}>{flagged.includes(question.id) ? "Remove review flag" : "Flag for review"}</button><div className="flex gap-3"><button className="px-4 py-3 text-sm font-bold disabled:text-[var(--color-slate)]" type="button" disabled={active === 0} onClick={() => setActive((index) => index - 1)}>Previous</button><button className="bg-[var(--color-ink)] px-5 py-3 text-sm font-bold text-white" type="button" onClick={() => active === assessment.questions.length - 1 ? setStage("review") : setActive((index) => index + 1)}>{active === assessment.questions.length - 1 ? "Review answers" : "Next question"}</button></div></div></div></div></div></section>;
}

function Access({ assessment, accessCode, error, onChange, onSubmit }: { assessment: Assessment; accessCode: string; error: boolean; onChange: (value: string) => void; onSubmit: () => void }) {
  return <section className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-16 sm:py-20"><div className="site-container grid gap-12 lg:grid-cols-12 lg:gap-16"><div className="border-l-2 border-[var(--color-accent)] pl-5 lg:col-span-5 lg:self-start lg:py-2"><p className="eyebrow">Assessment access</p><h2 className="mt-5 max-w-xl font-serif text-[clamp(2.5rem,4vw,4.25rem)] leading-[1.03] tracking-[-0.05em]">Ready when you are.</h2><p className="mt-6 max-w-lg leading-7 text-[var(--color-slate)]">{assessment.instructions}</p><p className="mt-7 border-t border-[var(--color-line)] pt-5 text-sm text-[var(--color-slate)]">{assessment.questions.length} questions · {Math.round(assessment.durationSeconds / 60)} minutes · Pass mark {assessment.passMark}%</p></div><form className="border-t-4 border-[var(--color-ink)] bg-white p-7 sm:p-9 lg:col-span-5 lg:col-start-8" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><label className="text-xs font-bold tracking-[0.12em] text-[var(--color-slate)]" htmlFor="exam-access-code">ACCESS CODE</label><input className="mt-3 w-full border border-[var(--color-line)] px-4 py-4 font-mono outline-none focus:border-[var(--color-ink)]" id="exam-access-code" type="password" autoComplete="off" value={accessCode} onChange={(event) => onChange(event.target.value)} placeholder="Enter your code" />{error && <p className="mt-3 text-sm text-red-800">The assessment access code is not recognised.</p>}<button className="mt-6 bg-[var(--color-ink)] px-6 py-3.5 text-sm font-bold text-white" type="submit">Start assessment</button><p className="mt-6 border-t border-[var(--color-line)] pt-5 text-sm leading-6 text-[var(--color-slate)]">This is a browser-based practice assessment. It provides immediate feedback and does not create an official examination record.</p></form></div></section>;
}

function Review({ assessment, answers, flagged, unanswered, onReturn, onSubmit }: { assessment: Assessment; answers: Record<string, string>; flagged: string[]; unanswered: number; onReturn: (index: number) => void; onSubmit: () => void }) {
  return <section className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-16 sm:py-20"><div className="site-container max-w-4xl"><p className="eyebrow">Final review</p><h2 className="mt-4 font-serif text-5xl tracking-[-0.05em]">Review before you submit.</h2><div className="mt-9 grid gap-3 sm:grid-cols-2">{assessment.questions.map((question, index) => <button key={question.id} className="flex items-center justify-between border border-[var(--color-line)] bg-white p-5 text-left hover:border-[var(--color-ink)]" type="button" onClick={() => onReturn(index)}><span><span className="block text-xs font-bold tracking-[0.1em] text-[var(--color-slate)]">QUESTION {String(index + 1).padStart(2, "0")}</span><span className="mt-2 block font-bold">{flagged.includes(question.id) ? "Flagged for review" : "Answer status"}</span></span><span className={`text-sm font-bold ${answers[question.id] !== undefined ? "text-[var(--color-accent-dark)]" : "text-[var(--color-error)]"}`}>{answers[question.id] !== undefined ? "Answered" : "Unanswered"}</span></button>)}</div>{unanswered > 0 && <p className="mt-6 border-l-2 border-[var(--color-error)] bg-red-50 p-4 text-sm">You have {unanswered} unanswered question{unanswered === 1 ? "" : "s"}. You may still submit.</p>}<div className="mt-8 flex flex-wrap gap-4"><button className="border border-[var(--color-ink)] px-6 py-3.5 text-sm font-bold" type="button" onClick={() => onReturn(0)}>Return to assessment</button><button className="bg-[var(--color-ink)] px-6 py-3.5 text-sm font-bold text-white" type="button" onClick={onSubmit}>Submit and see result</button></div></div></section>;
}

function Results({ assessment, answers, correct, score, onRestart }: { assessment: Assessment; answers: Record<string, string>; correct: number; score: number; onRestart: () => void }) {
  const passed = score >= assessment.passMark;
  return <section className="border-y border-[var(--color-line)] bg-[var(--color-paper)] py-16 sm:py-20"><div className="site-container max-w-4xl"><div className="border-t-4 border-[var(--color-accent-dark)] bg-white p-8 sm:p-10"><p className="eyebrow">Assessment result</p><div className="mt-5 flex flex-wrap items-end justify-between gap-5"><div><h2 className="font-serif text-5xl tracking-[-0.05em]">{passed ? "You passed." : "Keep building your knowledge."}</h2><p className="mt-4 max-w-2xl leading-7 text-[var(--color-slate)]">You answered {correct} of {assessment.questions.length} questions correctly. Your score is shown for this practice assessment only.</p></div><p className={`font-serif text-6xl tracking-[-0.06em] ${passed ? "text-[var(--color-accent-dark)]" : "text-[var(--color-error)]"}`}>{score}%</p></div><div className="mt-8 grid gap-4 border-y border-[var(--color-line)] py-5 text-sm sm:grid-cols-3"><p><strong className="block text-[var(--color-ink)]">{correct}/{assessment.questions.length}</strong>Correct answers</p><p><strong className="block text-[var(--color-ink)]">{assessment.passMark}%</strong>Pass mark</p><p><strong className="block text-[var(--color-ink)]">{passed ? "Passed" : "Not passed"}</strong>Practice outcome</p></div>{assessment.showAnswerReview && <div className="mt-8 space-y-3"><h3 className="font-serif text-3xl">Answer review</h3>{assessment.questions.map((question, index) => { const selected = question.options.find((option) => option.id === answers[question.id]); const correctOption = question.options.find((option) => option.id === question.correctOptionId); const isCorrect = selected?.id === correctOption?.id; return <article className="border border-[var(--color-line)] p-5" key={question.id}><p className="text-xs font-bold tracking-[0.1em] text-[var(--color-accent-dark)]">QUESTION {String(index + 1).padStart(2, "0")}</p><h4 className="mt-3 font-semibold">{question.prompt}</h4><p className={`mt-4 text-sm font-semibold ${isCorrect ? "text-emerald-800" : "text-[var(--color-error)]"}`}>{isCorrect ? "Correct" : "Not correct"}</p><p className="mt-2 text-sm leading-6 text-[var(--color-slate)]">Your answer: <strong className="text-[var(--color-ink)]">{selected?.text || "No answer"}</strong></p><p className="mt-1 text-sm leading-6 text-[var(--color-slate)]">Correct answer: <strong className="text-[var(--color-ink)]">{correctOption?.text}</strong></p></article>; })}</div>}<button className="mt-8 border border-[var(--color-ink)] px-6 py-3.5 text-sm font-bold" type="button" onClick={onRestart}>Take assessment again</button></div></div></section>;
}
