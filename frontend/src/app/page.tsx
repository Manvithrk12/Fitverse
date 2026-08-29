import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">FITVERSE</h1>
      <p className="text-muted-foreground max-w-md text-balance text-sm text-gray-500">
        Your Fitness. Your Community. Your Journey.
      </p>
      <p className="text-xs text-gray-400">
        Phase 1 — Authentication. Feature pages arrive in later phases.
      </p>
      <div className="flex gap-3 text-sm">
        <Link href="/login" className="rounded border border-gray-300 px-4 py-2">
          Log in
        </Link>
        <Link href="/register" className="rounded bg-black px-4 py-2 text-white">
          Register
        </Link>
      </div>
    </main>
  );
}
