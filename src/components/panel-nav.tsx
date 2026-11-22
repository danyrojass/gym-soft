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

export function PanelNav({
  user,
}: {
  user?: { name?: string | null; email?: string | null; rol?: string; gymNombre?: string; gymId?: string };
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">GymSoft</h1>
            <p className="text-sm text-slate-600">Panel de gestión</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">{user?.name || user?.email}</div>
              <div className="text-xs text-slate-500">
                {user?.rol} · {user?.gymNombre || user?.gymId}
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
          {user?.rol === "ADMIN" && (
            <Link href="/admin" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100">
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
