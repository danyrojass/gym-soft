import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card, Badge, EmptyState, ButtonLink } from "@/components/ui";
import { formatDateTime, formatMoney, toDateInputValue } from "@/lib/format";
import { CASH_CATEGORIES, getOpenCashSession, parseDateRange } from "@/lib/domain/cash";
import { createCashMovementAction } from "./actions";

export default async function CajaPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string; from?: string; to?: string; tipo?: string };
}) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const { from, to } = parseDateRange(searchParams?.from, searchParams?.to);
  const tipo = searchParams?.tipo === "INGRESO" || searchParams?.tipo === "EGRESO" ? searchParams.tipo : undefined;

  const [movements, openSession, totals] = await Promise.all([
    prisma.cashMovement.findMany({
      where: { gymId, fecha: { gte: from, lte: to }, ...(tipo ? { tipo } : {}) },
      include: { registradoPor: true, payment: { include: { member: true } } },
      orderBy: { fecha: "desc" },
      take: 200,
    }),
    getOpenCashSession(gymId),
    prisma.cashMovement.groupBy({
      by: ["tipo"],
      where: { gymId, fecha: { gte: from, lte: to } },
      _sum: { monto: true },
    }),
  ]);

  const ingresos = Number(totals.find((t) => t.tipo === "INGRESO")?._sum.monto ?? 0);
  const egresos = Number(totals.find((t) => t.tipo === "EGRESO")?._sum.monto ?? 0);

  return (
    <PageShell
      title="Caja"
      description="Ingresos, egresos y movimientos operativos. Los ingresos de pagos confirmados se generan automáticamente."
      action={<ButtonLink href="/caja/arqueos" variant="secondary">Arqueos</ButtonLink>}
    >
      {searchParams?.ok && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Movimiento registrado.</div>}
      {searchParams?.error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{decodeURIComponent(searchParams.error)}</div>}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><div className="text-sm text-slate-500">Ingresos período</div><div className="text-2xl font-semibold text-emerald-700">{formatMoney(ingresos)}</div></Card>
        <Card><div className="text-sm text-slate-500">Egresos período</div><div className="text-2xl font-semibold text-red-700">{formatMoney(egresos)}</div></Card>
        <Card><div className="text-sm text-slate-500">Balance</div><div className="text-2xl font-semibold text-slate-900">{formatMoney(ingresos - egresos)}</div></Card>
        <Card><div className="text-sm text-slate-500">Caja efectivo</div><div className="mt-1">{openSession ? <Badge tone="green">ABIERTA</Badge> : <Badge tone="amber">CERRADA</Badge>}</div></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Registrar movimiento</h3>
          <form action={createCashMovementAction} className="space-y-3 text-sm">
            <Field label="Tipo">
              <select name="tipo" className="input" defaultValue="EGRESO">
                <option value="EGRESO">EGRESO</option>
                <option value="INGRESO">INGRESO</option>
              </select>
            </Field>
            <Field label="Categoría">
              <select name="categoria" className="input">
                <optgroup label="Ingresos">
                  {CASH_CATEGORIES.INGRESO.map((c) => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Egresos">
                  {CASH_CATEGORIES.EGRESO.map((c) => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </Field>
            <Field label="Monto (ARS)"><input name="monto" type="number" min="0.01" step="0.01" required className="input" /></Field>
            <Field label="Método">
              <select name="metodo" className="input" defaultValue="EFECTIVO">
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="OTRO">OTRO</option>
              </select>
            </Field>
            <Field label="Fecha"><input name="fecha" type="date" defaultValue={toDateInputValue(new Date())} className="input" /></Field>
            <Field label="Descripción"><input name="descripcion" className="input" /></Field>
            <button className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800" type="submit">Guardar</button>
          </form>
          <style>{`.input{width:100%;border-radius:0.375rem;border:1px solid #cbd5e1;padding:0.5rem 0.75rem}`}</style>
        </Card>

        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Movimientos</h3>
            <form className="flex flex-wrap gap-2 text-sm" action="/caja" method="get">
              <input type="date" name="from" defaultValue={toDateInputValue(from)} className="rounded-md border border-slate-300 px-2 py-1.5" />
              <input type="date" name="to" defaultValue={toDateInputValue(to)} className="rounded-md border border-slate-300 px-2 py-1.5" />
              <select name="tipo" defaultValue={tipo || ""} className="rounded-md border border-slate-300 px-2 py-1.5">
                <option value="">Todos</option><option value="INGRESO">INGRESO</option><option value="EGRESO">EGRESO</option>
              </select>
              <button className="rounded-md bg-slate-900 px-3 py-1.5 text-white" type="submit">Filtrar</button>
            </form>
          </div>
          {movements.length === 0 ? <EmptyState text="No hay movimientos en el período." /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Tipo</th><th className="py-2 pr-3">Categoría</th><th className="py-2 pr-3">Detalle</th><th className="py-2 pr-3">Método</th><th className="py-2">Monto</th></tr></thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{formatDateTime(m.fecha)}</td>
                      <td className="py-2 pr-3"><Badge tone={m.tipo === "INGRESO" ? "green" : "red"}>{m.tipo}</Badge></td>
                      <td className="py-2 pr-3">{m.categoria}</td>
                      <td className="py-2 pr-3">{m.descripcion || m.payment?.member ? `${m.descripcion || "Pago"}${m.payment?.member ? ` - ${m.payment.member.apellido}` : ""}` : "-"}</td>
                      <td className="py-2 pr-3">{m.metodo}</td>
                      <td className={`py-2 font-medium ${m.tipo === "INGRESO" ? "text-emerald-700" : "text-red-700"}`}>{m.tipo === "EGRESO" ? "-" : ""}{formatMoney(String(m.monto))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}</label>;
}
