"use client";

import { useState } from "react";
import { ActionSubmitButton, ConfirmActionSubmitButton } from "@/components/study-tools/action-submit-button";
import { Button } from "@/components/ui/button";

type PlannerEntry = {
  id: string;
  title: string;
  entry_date: string;
  entry_type: "exam_prep" | "quiz_review" | "reminder" | "study_session";
  note: string | null;
};

type StudyPlannerCalendarProps = {
  entries: PlannerEntry[];
  createAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getTodayKey() {
  return getDateKey(new Date());
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatDateKey(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDateKey(dateKey));
}

function getEntryTypeLabel(type: PlannerEntry["entry_type"]) {
  const labels: Record<PlannerEntry["entry_type"], string> = {
    study_session: "Study session",
    quiz_review: "Quiz review",
    exam_prep: "Exam prep",
    reminder: "Reminder",
  };

  return labels[type];
}

function buildCalendarDays(monthDate: Date, entriesByDate: Map<string, PlannerEntry[]>) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const todayKey = getTodayKey();
  const days: Array<{
    key: string;
    dateKey: string | null;
    day: number | null;
    isToday: boolean;
    entries: PlannerEntry[];
  }> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push({
      key: `blank-${index}`,
      dateKey: null,
      day: null,
      isToday: false,
      entries: [],
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const dateKey = getDateKey(new Date(year, month, day));

    days.push({
      key: dateKey,
      dateKey,
      day,
      isToday: dateKey === todayKey,
      entries: entriesByDate.get(dateKey) ?? [],
    });
  }

  return days;
}

export function StudyPlannerCalendar({
  entries,
  createAction,
  deleteAction,
}: StudyPlannerCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(getTodayKey()));
  const entriesByDate = entries.reduce((map, entry) => {
    const list = map.get(entry.entry_date) ?? [];
    list.push(entry);
    map.set(entry.entry_date, list);

    return map;
  }, new Map<string, PlannerEntry[]>());
  const calendarDays = buildCalendarDays(visibleMonth, entriesByDate);
  const selectedEntries = entriesByDate.get(selectedDate) ?? [];
  const visibleMonthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function jumpToToday() {
    const todayKey = getTodayKey();
    setSelectedDate(todayKey);
    setVisibleMonth(parseDateKey(todayKey));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            {visibleMonthLabel}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={() => moveMonth(-1)}>
              Previous
            </Button>
            <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={jumpToToday}>
              Today
            </Button>
            <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={() => moveMonth(1)}>
              Next
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) =>
            day.dateKey ? (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDate(day.dateKey ?? selectedDate)}
                className={`soft-hover relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-2xl border text-sm transition-colors ${
                  day.dateKey === selectedDate
                    ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-50"
                    : day.isToday
                      ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-50"
                      : day.entries.length > 0
                        ? "border-cyan-300/20 bg-cyan-300/10 text-white"
                        : "border-white/10 bg-slate-950/40 text-slate-400"
                }`}
                aria-label={`${formatDateKey(day.dateKey)}${
                  day.entries.length > 0 ? `, ${day.entries.length} plan${day.entries.length === 1 ? "" : "s"}` : ""
                }`}
              >
                <span>{day.day}</span>
                {day.entries.length > 0 ? (
                  <span className="absolute bottom-1.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    {day.entries.length > 1 ? (
                      <span className="text-[0.6rem] font-semibold text-cyan-100">{day.entries.length}</span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            ) : (
              <div key={day.key} className="aspect-square min-h-11 rounded-2xl border border-transparent" />
            ),
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-4">
        <div>
          <p className="text-sm font-semibold text-white">{formatDateKey(selectedDate)}</p>
          <p className="mt-1 text-xs text-slate-400">
            {selectedEntries.length === 0
              ? "No plans yet. Add one for this day."
              : `${selectedEntries.length} plan${selectedEntries.length === 1 ? "" : "s"} on this day.`}
          </p>
        </div>

        <div className="max-h-52 space-y-3 overflow-y-auto pr-1">
          {selectedEntries.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{entry.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-300">
                    {getEntryTypeLabel(entry.entry_type)}
                  </p>
                </div>
                <form action={deleteAction}>
                  <input type="hidden" name="entryId" value={entry.id} />
                  <ConfirmActionSubmitButton
                    label="Delete"
                    pendingLabel="Deleting..."
                    confirmMessage={`Delete "${entry.title}" from your planner?`}
                    variant="ghost"
                    className="border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-400/20"
                  />
                </form>
              </div>
              {entry.note ? <p className="mt-2 text-sm leading-6 text-slate-400">{entry.note}</p> : null}
            </div>
          ))}
        </div>

        <form key={selectedDate} action={createAction} className="space-y-3 border-t border-white/10 pt-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Plan title</span>
            <input
              name="title"
              type="text"
              required
              placeholder="Review tomorrow's lecture notes"
              className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Date</span>
              <input
                name="entryDate"
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setVisibleMonth(parseDateKey(event.target.value));
                }}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors focus:border-cyan-300/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">Type</span>
              <select
                name="entryType"
                defaultValue="study_session"
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-colors focus:border-cyan-300/40"
              >
                <option value="study_session">Study session</option>
                <option value="quiz_review">Quiz review</option>
                <option value="exam_prep">Exam prep</option>
                <option value="reminder">Reminder</option>
              </select>
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Note</span>
            <textarea
              name="note"
              rows={3}
              placeholder="Optional goal, topic, or reminder."
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-300/40"
            />
          </label>
          <div className="flex justify-end">
            <ActionSubmitButton label="Save plan" pendingLabel="Saving..." />
          </div>
        </form>
      </div>
    </div>
  );
}
