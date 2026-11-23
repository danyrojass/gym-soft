import Link from "next/link";
import { ReactNode } from "react";

export function PageShell({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm ${className}`}>{children}</section>;
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  const cls = variant === "primary"
    ? "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
  return <Link href={href} className={`inline-flex rounded-lg px-4 py-2 text-sm font-medium transition ${cls}`}>{children}</Link>;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "red" | "amber" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500 text-center">{text}</div>;
}
