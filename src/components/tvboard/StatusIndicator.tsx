export function StatusIndicator({ label, status, activeColor = 'bg-green-500' }: { label: string; status: string; activeColor?: string }) {
  const isInactive = status === 'INACTIVO' || status.includes('SUSPENDIDO');
  const colorClass = isInactive ? 'bg-red-500' : activeColor;
  const textToShow = status.replace(/_/g, ' ');

  return (
    <div className="hidden lg:flex items-center gap-2 text-white px-3 py-1.5 rounded-lg bg-white/10 border border-white/20">
      <span className={`w-3 h-3 rounded-full ${colorClass} ${!isInactive ? 'animate-pulse' : ''}`}></span>
      <div className="text-sm font-semibold">
        <div className="leading-tight">{label}</div>
        <div className="text-xs opacity-80 font-medium leading-tight">{textToShow}</div>
      </div>
    </div>
  );
}