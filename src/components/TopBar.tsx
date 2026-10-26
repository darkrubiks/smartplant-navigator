import { Link } from "@tanstack/react-router";

export function MBLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
        <img
          src={`${import.meta.env.BASE_URL}mercedes-benz-star.svg`}
          alt=""
          aria-hidden="true"
          className="h-9 w-9 object-contain"
        />
      </div>
      <div className="leading-none">
        <div className="text-[15px] font-semibold tracking-tight text-foreground">
          SmartPlant <span className="text-[var(--mb-blue)]">Navigator</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Mercedes-Benz
        </div>
      </div>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between p-3 sm:p-4">
      <Link
        to="/"
        className="pointer-events-auto rounded-2xl bg-card/95 px-4 py-2 shadow-[var(--shadow-elegant)] backdrop-blur border border-border/60"
      >
        <MBLogo />
      </Link>
    </header>
  );
}
