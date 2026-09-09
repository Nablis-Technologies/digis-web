import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Clock3, FilePenLine, X } from "lucide-react";
import { useTheme } from "@/app/components/ThemeContext";
import { QuestionField } from "@/features/checkout/components/QuestionField";
import type { CheckoutAnswers, UserTicket } from "@/types";
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from "@/components/primitives/GlassReflection";

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
}

export function EditTicketAnswersDialog({
  ticket,
  isSaving,
  saveError,
  onClose,
  onSave,
}: {
  ticket: UserTicket;
  isSaving: boolean;
  saveError?: string;
  onClose: () => void;
  onSave: (answers: CheckoutAnswers) => void;
}) {
  const { isDark } = useTheme();
  const questions = ticket.customQuestions ?? [];
  const [answers, setAnswers] = useState<CheckoutAnswers>(() => ({ ...ticket.answers }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const editableUntil = ticket.answersEditableUntil!;
  const remaining = useMemo(() => Date.parse(editableUntil) - Date.now(), [editableUntil]);
  const isExpired = remaining <= 0;
  const text = isDark ? "#fff" : "#171717";
  const muted = isDark ? "rgba(255,255,255,0.58)" : "rgba(23,23,23,0.55)";
  const panel = isDark ? "#101010" : "#ffffff";

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    questions.forEach((question) => {
      if (!question.required) return;
      const value = answers[question.id];
      if (question.type === "checkbox") {
        if (!Array.isArray(value) || value.length === 0) nextErrors[question.id] = "Please select at least one option";
      } else if (typeof value !== "string" || !value.trim()) {
        nextErrors[question.id] = "This field is required";
      }
    });
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) onSave(answers);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-5" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: isDark ? "rgba(0,0,0,0.78)" : "rgba(20,20,28,0.32)", backdropFilter: "blur(22px)" }} />
      <motion.section initial={{ y: 28, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 28, opacity: 0, scale: 0.98 }} transition={{ type: "spring", damping: 28, stiffness: 300 }} onClick={(event) => event.stopPropagation()} className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] sm:rounded-[28px]" style={{ background: panel }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 contents">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-5 px-5 sm:px-6 pt-5 pb-4" style={{ background: panel, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}` }}>
          <div>
            <div className="flex items-center gap-2 text-[10px] tracking-[1.6px] uppercase" style={{ color: isDark ? "#d6f905" : "#566600", fontFamily: "'Inter', sans-serif", fontWeight: 700 }}><FilePenLine className="w-3.5 h-3.5" /> Attendee details</div>
            <h2 className="mt-2 text-[20px] font-light" style={{ color: text, fontFamily: "'Zalando Sans Expanded', sans-serif" }}>Edit your answers</h2>
            <p className="mt-1 text-[12px]" style={{ color: muted, fontFamily: "'Inter', sans-serif" }}>{ticket.eventName}</p>
          </div>
          <AppButton aria-label="Close answer editor" onClick={onClose} className="shrink-0 w-9 h-9 rounded-full grid place-items-center" style={{ color: text, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}><X className="w-4 h-4" /></AppButton>
        </div>

        <div className="px-5 sm:px-6 py-5">
          <div className="flex gap-2.5 rounded-2xl p-3.5 mb-5" style={{ background: isExpired ? "rgba(248,113,113,0.08)" : (isDark ? "rgba(214,249,5,0.08)" : "rgba(214,249,5,0.14)"), border: `1px solid ${isExpired ? "rgba(248,113,113,0.2)" : (isDark ? "rgba(214,249,5,0.18)" : "rgba(120,140,0,0.16)")}` }}>
            <Clock3 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: isExpired ? "#f87171" : (isDark ? "#d6f905" : "#596600") }} />
            <p className="text-[12px] leading-relaxed" style={{ color: muted, fontFamily: "'Inter', sans-serif" }}>{isExpired ? "This organizer’s answer-edit window has closed." : <>You can update these details until <strong style={{ color: text }}>{formatDeadline(editableUntil)}</strong>.</>}</p>
          </div>
          <div className="space-y-4">{questions.map((question) => <QuestionField key={question.id} question={question} value={answers[question.id]} error={errors[question.id]} onChange={(value: unknown) => { setAnswers((previous) => ({ ...previous, [question.id]: value })); setErrors((previous) => ({ ...previous, [question.id]: "" })); }} isDark={isDark} />)}</div>
          <AnimatePresence>{saveError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex gap-2 text-[12px]" style={{ color: "#f87171", fontFamily: "'Inter', sans-serif" }}><AlertCircle className="w-4 h-4 shrink-0" />{saveError}</motion.p>}</AnimatePresence>
        </div>
        <div className="sticky bottom-0 px-5 sm:px-6 py-4" style={{ background: panel, borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}` }}>
          <AppButton whileTap={{ scale: isExpired || isSaving ? 1 : 0.98 }} disabled={isExpired || isSaving} onClick={submit} className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[13px] disabled:cursor-not-allowed" style={{ background: isExpired ? (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)") : "linear-gradient(135deg, #d9ff00, #d6f905)", color: isExpired ? muted : "#0a0a0a", fontFamily: "'Inter', sans-serif", fontWeight: 700 }}><Check className="w-4 h-4" />{isSaving ? "Saving…" : "Save answers"}</AppButton>
        </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
