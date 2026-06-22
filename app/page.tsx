export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center animate-fade-up">
      <div className="flex size-[52px] items-center justify-center rounded-[15px] bg-brand text-lg font-bold tracking-tight text-white shadow-[0_8px_22px_rgba(110,86,207,0.32)]">
        AA
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Account Abstraction Platform
        </h1>
        <p className="text-sm text-muted-foreground">
          Scaffold ready — no screens yet.
        </p>
      </div>
      <p className="max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
        Privy · Kernel · 7702 · Pimlico · Relay — providers wired client-side
        (ssr: false).
      </p>
    </main>
  );
}
