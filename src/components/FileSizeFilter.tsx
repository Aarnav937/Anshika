import type { SearchFilters } from '../types/document';

interface FileSizeFilterProps {
  value?: SearchFilters['sizeRange'];
  onChange: (range?: { min: number; max: number }) => void;
}

// Sizes in bytes
const KB = 1024;
const MB = 1024 * KB;

const presets: { label: string; range?: { min: number; max: number } }[] = [
  { label: 'Any', range: undefined },
  { label: 'Small (<100KB)', range: { min: 0, max: 100 * KB } },
  { label: 'Medium (100KB–1MB)', range: { min: 100 * KB, max: 1 * MB } },
  { label: 'Large (>1MB)', range: { min: 1 * MB, max: 50 * MB } },
];

export function FileSizeFilter({ value, onChange }: FileSizeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded border border-gray-300 px-2 py-1 text-sm"
        value={presets.find(p => p.range?.min === value?.min && p.range?.max === value?.max) ? presets.find(p => p.range?.min === value?.min && p.range?.max === value?.max)!.label : ''}
        onChange={(e) => {
          const preset = presets.find(p => p.label === e.target.value);
            onChange(preset ? preset.range : undefined);
        }}
      >
        {presets.map(p => <option key={p.label} value={p.label === 'Any' ? '' : p.label}>{p.label}</option>)}
      </select>
      {value && (
        <span className="text-xs text-gray-600">
          {(value.min/KB).toFixed(0)}KB – {(value.max/KB).toFixed(0)}KB
        </span>
      )}
    </div>
  );
}

export default FileSizeFilter;
