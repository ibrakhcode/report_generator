'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

export type SuggestOption = {
  value: string;
  label: string;
  hint?: string;
};

function matchesOption(option: SuggestOption, needle: string) {
  if (!needle) return true;
  const hay = `${option.label} ${option.hint || ''} ${option.value}`.toLowerCase();
  return hay.includes(needle);
}

export function SuggestField({
  label,
  value,
  onChange,
  options,
  allowCustom = false,
  placeholder = 'Type to search...',
  required,
  disabled,
  hint,
  className = '',
  compact = false
}: {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  options: SuggestOption[];
  allowCustom?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  className?: string;
  compact?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    if (open) return;
    setDraft(selected?.label || value || '');
  }, [open, selected?.label, value]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  const filtered = useMemo(() => {
    const needle = draft.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((item) => matchesOption(item, needle));
  }, [options, draft]);

  const pick = (option: SuggestOption) => {
    onChange(option.value);
    setDraft(option.label);
    setOpen(false);
  };

  const inputClass = compact
    ? 'w-full bg-transparent border-none text-xs text-slate-200 focus:outline-none py-1'
    : 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500';

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      {label ? (
        <label className="block text-slate-400 font-semibold mb-1">
          {label}
          {required ? <span className="text-rose-400"> *</span> : null}
        </label>
      ) : null}
      <input
        type="text"
        autoComplete="off"
        required={required}
        disabled={disabled}
        value={open ? draft : selected?.label || value || ''}
        placeholder={placeholder}
        onFocus={() => {
          setDraft(selected?.label || value || '');
          setOpen(true);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          setOpen(true);
          if (!allowCustom) return;
          const exact = options.find(
            (item) =>
              item.label.toLowerCase() === next.trim().toLowerCase() ||
              item.value.toLowerCase() === next.trim().toLowerCase()
          );
          onChange(exact ? exact.value : next);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            return;
          }
          if (event.key === 'Enter' && open && filtered[0]) {
            event.preventDefault();
            pick(filtered[0]);
          }
        }}
        className={inputClass}
      />
      {open && !disabled && (
        <div className="absolute z-[70] left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          {filtered.length === 0 && !allowCustom && (
            <p className="px-3 py-2 text-[11px] text-slate-500">No matches</p>
          )}
          {filtered.map((option) => (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(option)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 ${
                option.value === value ? 'text-teal-300' : 'text-slate-200'
              }`}
            >
              <span className="block font-medium">{option.label}</span>
              {option.hint ? <span className="block text-[11px] text-slate-500">{option.hint}</span> : null}
            </button>
          ))}
          {allowCustom && draft.trim() && !filtered.some((item) => item.label.toLowerCase() === draft.trim().toLowerCase()) && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(draft.trim());
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-teal-300 hover:bg-slate-800 border-t border-slate-800"
            >
              Use &quot;{draft.trim()}&quot;
            </button>
          )}
        </div>
      )}
      {hint ? <p className="text-[11px] text-slate-500 mt-1">{hint}</p> : null}
    </div>
  );
}
