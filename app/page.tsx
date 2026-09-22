import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-6 text-center">
      <h1 className="font-display text-3xl font-semibold text-deep">Swirl</h1>
      <p className="max-w-sm text-[15px] text-slate">
        Pick somewhere to swim to. We&apos;ll help you get there.
      </p>
      <Link
        href="/auth/login"
        className="rounded-pill bg-blue px-6 py-3 text-[15px] font-semibold text-white"
      >
        Sign in
      </Link>
    </main>
  );
}
