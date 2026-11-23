import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

const items = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/socios", label: "Socios" },
  { href: "/planes", label: "Planes" },
  { href: "/suscripciones", label: "Suscripciones" },
  { href: "/pagos", label: "Pagos" },
  { href: "/caja", label: "Caja" },
  { href: "/reportes", label: "Reportes" },
  { href: "/checkin", label: "Check-in" },
];

function GymIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 7v10M7 5v14M17 5v14M21 7v10M7 12h10" />
    </svg>
  );
}

export function PanelNav({
  user,
}: {
  user?: { name?: string | null; email?: string | null; rol?: string; gymNombre?: string; gymId?: string };
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/95 text-white backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20">
              <GymIcon />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">GymSoft</h1>
              <p className="text-sm text-slate-400">Panel de gestión · {user?.gymNombre || "Gimnasio"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-100">{user?.name || user?.email}</div>
              <div className="text-xs text-slate-400">{user?.rol}</div>
            </div>
            <SignOutButton />
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          {user?.rol === "ADMIN" && (
            <Link href="/admin" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-500/20">
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
