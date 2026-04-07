import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ScheduleCalendarProps {
  posts: any[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

export const ScheduleCalendar = ({ posts, selectedDate, onSelectDate }: ScheduleCalendarProps) => {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const daysWithPosts = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (p.scheduled_at) set.add(p.scheduled_at.slice(0, 10));
      if (p.published_at) set.add(p.published_at.slice(0, 10));
    });
    return set;
  }, [posts]);

  const firstDay = new Date(month.year, month.month, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  const monthLabel = firstDay.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = () => setMonth((m) => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 });
  const next = () => setMonth((m) => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 });

  const toDateStr = (day: number) => {
    const m = String(month.month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${month.year}-${m}-${d}`;
  };

  return (
    <div className="card-base p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} className="p-1 rounded hover:bg-[hsl(var(--bg-raised))] transition-colors">
          <ChevronLeft size={14} className="text-caption" />
        </button>
        <span className="text-mono-label capitalize">{monthLabel}</span>
        <button onClick={next} className="p-1 rounded hover:bg-[hsl(var(--bg-raised))] transition-colors">
          <ChevronRight size={14} className="text-caption" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] text-txt-ghost font-mono py-1">{d}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={i} />;
          const dateStr = toDateStr(day);
          const hasPost = daysWithPosts.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === new Date().toISOString().slice(0, 10);
          return (
            <button
              key={i}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className={`relative text-[11px] font-mono py-1.5 rounded transition-colors ${
                isSelected
                  ? "bg-[hsl(var(--accent))] text-[hsl(var(--bg-base))] font-bold"
                  : isToday
                  ? "bg-[hsl(var(--bg-raised))] text-foreground"
                  : "text-caption hover:text-foreground hover:bg-[hsl(var(--bg-raised))]"
              }`}
            >
              {day}
              {hasPost && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[hsl(var(--accent))]" />
              )}
            </button>
          );
        })}
      </div>
      {selectedDate && (
        <button
          onClick={() => onSelectDate(null)}
          className="mt-2 w-full text-[10px] text-accent font-mono hover:underline"
        >
          Limpar filtro
        </button>
      )}
    </div>
  );
};
