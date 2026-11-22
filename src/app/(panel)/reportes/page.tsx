import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card, Badge, EmptyState } from "@/components/ui";
import { formatDateTime, formatMoney, toDateInputValue } from "@/lib/format";
import { getCashSummary, parseDateRange } from "@/lib/domain/cash";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const { from, to } = parseDateRange(searchParams?.from, searchParams?.to);

  const [summary, overdueSubs, pendingPayments, accessStats] = await Promise.all([
    getCashSummary(gymId, from, to),
    prisma.subscription.count({ where: { gymId, fechaFin: { lt: new Date() }, estado: { in: ["ACTIVA", "PENDIENTE_PAGO"] } } }),
    prisma.payment.aggregate({ where: { gymId, estado: "PENDIENTE", metodo: "TRANSFERENCIA" }, _sum: { monto: true }, _count: { _all: true } }),
    prisma.accessEvent.groupBy({ by: ["resultado"], where: { gymId, fechaHora: { gte: from, lte: to } }, _count: { _all: true } }),
  ]);

  const allowed = accessStats.find((a) => a.resultado === "PERMITIDO")?._count._all ?? 0;
  const denied = accessStats.find((a) => a.resultado === "DENEGADO")?._count._all ?? 0;
  const exportParams = new URLSearchParams({ from: toDateInputValue(from), to: toDateInputValue(to) });

  return (
    <PageShell
      title="Reportes"
      description="Resumen operativo y contable del período. Exportá movimientos a CSV."
      action={<a href={`/reportes/export?${exportParams.toString()}`} className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Exportar CSV</a>}
    >
      <Card>
        <form className="flex flex-wrap gap-3 items-end text-sm" action="/reportes" method="get">
          <label className="block"><span className="mb-1 block text-slate-600">Desde</span><input type="date" name="from" defaultValue={toDateInputValue(from)} className="rounded-md border border-slate-300 px-3 py-2" /></label>
          <label className="block"><span className="mb-1 block text-slate-600">Hasta</span><input type="date" name="to" defaultValue={toDateInputValue(to)} className="rounded-md border border-slate-300 px-3 py-2" /></label>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800" type="submit">Aplicar</button>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><div className="text-sm text-slate-500">Ingresos</div><div className="text-2xl font-semibold text-emerald-700">{formatMoney(summary.totalIngresos)}</div></Card>
        <Card><div className="text-sm text-slate-500">Egresos</div><div className="text-2xl font-semibold text-red-700">{formatMoney(summary.totalEgresos)}</div></Card>
        <Card><div className="text-sm text-slate-500">Balance</div><div className="text-2xl font-semibold">{formatMoney(summary.balance)}</div></Card>
        <Card><div className="text-sm text-slate-500">Asistencias / denegados</div><div className="text-2xl font-semibold">{allowed} / {denied}</div></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Por categoría</h3>
          {summary.byCategory.length === 0 ? <EmptyState text="Sin movimientos en el período." /> : (
            <table className="min-w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3">Tipo</th><th className="py-2 pr-3">Categoría</th><th className="py-2 pr-3">Cant.</th><th className="py-2">Total</th></tr></thead>
              <tbody>{summary.byCategory.map((r, i) => (<tr key={i} className="border-b border-slate-100"><td className="py-2 pr-3"><Badge tone={r.tipo === "INGRESO" ? "green" : "red"}>{r.tipo}</Badge></td><td className="py-2 pr-3">{r.categoria}</td><td className="py-2 pr-3">{r._count._all}</td><td className="py-2">{formatMoney(String(r._sum.monto ?? 0))}</td></tr>))}</tbody>
            </table>
          )}
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Pendientes / riesgo</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between rounded-md border border-slate-200 p-3"><span>Transferencias pendientes</span><span className="font-medium">{pendingPayments._count._all} ({formatMoney(String(pendingPayments._sum.monto ?? 0))})</span></div>
            <div className="flex justify-between rounded-md border border-slate-200 p-3"><span>Suscripciones vencidas/pendientes con fin pasado</span><span className="font-medium">{overdueSubs}</span></div>
            <div className="text-slate-500">Período: {formatDateTime(from)} — {formatDateTime(to)}</div>
            <Link href="/pagos" className="text-slate-900 hover:underline">Ir a pagos</Link>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
