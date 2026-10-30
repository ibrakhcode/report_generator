export function ViewLoading() {
  return (
    <div className="p-8 flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="mx-auto h-8 w-8 rounded-xl border border-teal-500/30 bg-teal-600/10 animate-pulse" />
        <p className="text-xs text-slate-400">Loading</p>
      </div>
    </div>
  );
}
