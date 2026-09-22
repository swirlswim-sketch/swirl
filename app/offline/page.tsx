export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-deep">Swirl</h1>
      <p className="max-w-xs text-[15px] text-slate">
        You&apos;re offline. Your swims are saved and will sync when you&apos;re back.
      </p>
    </main>
  );
}
