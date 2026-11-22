import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Card, PageShell, Badge } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { computeEffectiveSubscriptionStatus } from "@/lib/domain/subscriptions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const now = new Date();

  const [members, plans, subscriptions, pendingPayments, recentAccess] = await Promise.all([
    prisma.member.count({ where: { gymId } }),
    prisma.plan.count({ where: { gymId, activo: true } }),
    prisma.subscription.findMany({ where: { gymId }, select: { id: true, estado: true, fechaFin: true, pasesRestantes: true, planSnapshot: true } }),
    prisma.payment.findMany({
      where: { gymId, estado: "PENDIENTE", metodo: "TRANSFERENCIA" },
      include: { member: true, subscription: { include: { plan: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.accessEvent.findMany({
      where: { gymId },
      include: { member: true },
      orderBy: { fechaHora: "desc" },
      take: 8,
    }),
  ]);

  let active = 0;
  let vencidas = 0;
  let pendientes = 0;
  for (const s of subscriptions) {
    const effective = computeEffectiveSubscriptionStatus(s, now);
    if (effective === "ACTIVA") active++;
    if (effective === "VENCIDA") vencidas++;
    if (effective === "PENDIENTE_PAGO") pendientes++;
  }

  const cards = [
    { label: "Socios", value: members, href: "/socios" },
    { label: "Planes activos", value: plans, href: "/planes" },
    { label: "Suscripciones activas", value: active, href: "/suscripciones" },
    { label: "Suscripciones vencidas", value: vencidas, href: "/suscripciones" },
    { label: "Pagos pendientes", value: pendingPayments.length, href: "/pagos" },
    { label: "Pendientes de pago (subs)", value: pendientes, href: "/suscripciones" },
  ];

  return (
    <PageShell
      title="Inicio"
      description="Resumen operativo: socios, planes, suscripciones, pagos y check-in por software."
    >
      {searchParams?.error === "forbidden" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No tenés permisos para acceder a esa sección (requiere rol ADMIN).
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="block">
            <Card className="hover:border-slate-300 transition-colors">
              <div className="text-sm text-slate-500">{c.label}</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{c.value}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Transferencias pendientes</h3>
            <Link href="/pagos" className="text-sm text-slate-700 hover:underline">Ver pagos</Link>
          </div>
          <div className="space-y-3">
            {pendingPayments.length === 0 && <p className="text-sm text-slate-500">No hay transferencias pendientes.</p>}
            {pendingPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{p.member.apellido}, {p.member.nombre}</div>
                  <div className="text-slate-500">{p.subscription?.plan?.nombre || "Sin suscripción"} · {formatDateTime(p.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatMoney(String(p.monto))}</div>
                  <Badge tone="amber">PENDIENTE</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Últimos accesos</h3>
            <Link href="/checkin" className="text-sm text-slate-700 hover:underline">Ir a check-in</Link>
          </div>
          <div className="space-y-3">
            {recentAccess.length === 0 && <p className="text-sm text-slate-500">No hay eventos de acceso.</p>}
            {recentAccess.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{e.member ? `${e.member.apellido}, ${e.member.nombre}` : e.documentoIngresado}</div>
                  <div className="text-slate-500">{formatDateTime(e.fechaHora)} · {e.motivo}</div>
                </div>
                <Badge tone={e.resultado === "PERMITIDO" ? "green" : "red"}>{e.resultado}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
