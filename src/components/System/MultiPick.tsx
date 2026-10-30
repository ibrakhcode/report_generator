'use client';

export function splitPicked(value?: string): string[] {
  return String(value || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinPicked(values: string[]): string {
  return values.filter(Boolean).join('; ');
}

export function MultiPick({
  label,
  options,
  value,
  onChange,
  emptyHint
}: {
  label: string;
  options: string[];
  value?: string;
  onChange: (next: string) => void;
  emptyHint: string;
}) {
  const selected = splitPicked(value);
  const toggle = (name: string) => {
    const next = selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name];
    onChange(joinPicked(next));
  };

  return (
    <div>
      <label className="block text-slate-400 font-semibold mb-1">{label}</label>
      {options.length === 0 ? (
        <p className="text-[11px] text-slate-500">{emptyHint}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800/40 p-2">
          {options.map((name) => {
            const checked = selected.includes(name);
            return (
              <label
                key={name}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer ${
                  checked ? 'bg-teal-500/15 text-teal-200' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(name)}
                  className="rounded border-slate-600 text-teal-600 focus:ring-0"
                />
                <span className="truncate">{name}</span>
              </label>
            );
          })}
        </div>
      )}
      {selected.length > 0 && (
        <p className="text-[11px] text-slate-500 mt-1">{selected.length} selected</p>
      )}
    </div>
  );
}
