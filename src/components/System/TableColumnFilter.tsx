'use client';

import React from 'react';

export function TableTextFilter({
  value,
  onChange,
  placeholder = 'Filter'
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full min-w-[5.5rem] px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-white font-normal normal-case tracking-normal placeholder:text-slate-500"
    />
  );
}

export function TableSelectFilter({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full min-w-[5.5rem] px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-white font-normal normal-case tracking-normal"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function tableIncludes(haystack: string, needle: string) {
  if (!needle.trim()) return true;
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}
