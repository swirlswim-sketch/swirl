interface CheckpointMarkerProps {
  unlocked: boolean;
}

export default function CheckpointMarker({ unlocked }: CheckpointMarkerProps) {
  if (unlocked) {
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-pill border-2 border-white bg-blue text-[10px] text-white shadow-card">
        ✓
      </div>
    );
  }

  return <div className="h-4 w-4 rounded-pill border-2 border-mist bg-white/40" />;
}
