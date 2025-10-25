import { useState } from 'react';
import type { SearchFilters } from '../types/document';

interface DateRangeFilterProps {
  value?: SearchFilters['dateRange'];
  onChange: (range?: { start: Date; end: Date }) => void;
}

const presets: { label: string; get: () => { start: Date; end: Date } }[] = [
  { label: 'Today', get: () => { const now = new Date(); return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now }; } },
  { label: 'This Week', get: () => { const now = new Date(); const day = now.getDay(); const diff = now.getDate() - day; const start = new Date(now.getFullYear(), now.getMonth(), diff); return { start, end: now }; } },
  { label: 'This Month', get: () => { const now = new Date(); return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }; } },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(false);
  const startISO = value?.start ? value.start.toISOString().substring(0,10) : '';
  const endISO = value?.end ? value.end.toISOString().substring(0,10) : '';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        className="rounded border border-gray-300 px-2 py-1 text-sm"
        value=""
        onChange={(e) => {
          const preset = presets.find(p => p.label === e.target.value);
          if (preset) { onChange(preset.get()); setShowCustom(false); }
          else if (e.target.value === 'custom') { setShowCustom(true); }
          else { onChange(undefined); setShowCustom(false); }
        }}
      >
        <option value="">Date: Any</option>
        {presets.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
        <option value="custom">Custom…</option>
        {value && <option value="clear">Clear</option>}
      </select>
      {showCustom && (
        <div className="flex items-center gap-1 text-xs">
          <input
            type="date"
            value={startISO}
            onChange={(e) => {
              if (!e.target.value) return onChange(undefined);
              const start = new Date(e.target.value);
              const end = value?.end || start;
              onChange({ start, end });
            }}
            className="rounded border px-1 py-0.5"
          />
          <span>→</span>
          <input
            type="date"
            value={endISO}
            onChange={(e) => {
              if (!e.target.value) return onChange(undefined);
              const end = new Date(e.target.value);
              const start = value?.start || end;
              onChange({ start, end });
            }}
            className="rounded border px-1 py-0.5"
          />
        </div>
      )}
      {value && !showCustom && (
        <span className="text-xs text-gray-600">{value.start.toLocaleDateString()} – {value.end.toLocaleDateString()}</span>
      )}
    </div>
  );
}

export default DateRangeFilter;
