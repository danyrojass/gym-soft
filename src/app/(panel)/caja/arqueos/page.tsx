import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card, Badge, EmptyState } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getExpectedCashForSession, getOpenCashSession } from "@/lib/domain/cash";
import { closeCashSessionAction, openCashSessionAction } from "../actions";

export default async function ArqueosPage({ searchParams }: { searchParams?: { ok?: string; error?: string } }) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const open = await getOpenCashSession(gymId);
  const expected = open ? await getExpectedCashForSession(gymId, open) : null;
  const sessions = await prisma.cashSession.findMany({
    where: { gymId },
    include: { aperturaPor: true, cierrePor: true },
    orderBy: { aperturaFecha: "desc" },
    take: 30,
  });

  return (
    <PageShell title="Arqueos de caja" description="Apertura y cierre de caja en efectivo. La diferencia se calcula contra movimientos en efectivo desde la apertura.">
      {searchParams?.ok && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Arqueo {searchParams.ok}.</div>}
      {searchParams?.error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{decodeURIComponent(searchParams.error)}</div>}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{open ? "Cerrar caja" : "Abrir caja"}</h3>
          {!open ? (
            <form action={openCashSessionAction} className="space-y-3 text-sm">
              <label className="block"><span className="mb-1 block font-medium text-slate-700">Monto inicial (efectivo)</span>
                <input name="aperturaMonto" type="number" min="0" step="0.01" required className="w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <button className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800" type="submit">Abrir caja</button>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="rounded-md bg-slate-50 p-4 space-y-1">
                <div><span className="text-slate-500">Abierta:</span> {formatDateTime(open.aperturaFecha)}</div>
                <div><span className="text-slate-500">Por:</span> {open.aperturaPor?.nombre || "-"}</div>
                <div><span className="text-slate-500">Monto inicial:</span> {formatMoney(String(open.aperturaMonto))}</div>
                <div><span className="text-slate-500">Esperado en efectivo:</span> <span className="font-semibold">{formatMoney(expected ?? 0)}</span></div>
              </div>
              <form action={closeCashSessionAction} className="space-y-3">
                <input type="hidden" name="sessionId" value={open.id} />
                <label className="block"><span className="mb-1 block font-medium text-slate-700">Contado en efectivo</span>
                  <input name="contadoEfectivo" type="number" min="0" step="0.01" required className="w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="block"><span className="mb-1 block font-medium text-slate-700">Observaciones</span>
                  <textarea name="observaciones" className="w-full rounded-md border border-slate-300 px-3 py-2 min-h-20" />
                </label>
                <button className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700" type="submit">Cerrar caja</button>
              </form>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Historial</h3>
          {sessions.length === 0 ? <EmptyState text="No hay arqueos registrados." /> : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><div className="font-medium">{formatDateTime(s.aperturaFecha)}</div><Badge tone={s.estado === "ABIERTA" ? "green" : "slate"}>{s.estado}</Badge></div>
                  <div className="text-slate-600 mt-1">Inicial: {formatMoney(String(s.aperturaMonto))}{s.estado === "CERRADA" && <> · Esperado: {formatMoney(String(s.esperadoEfectivo ?? 0))} · Contado: {formatMoney(String(s.contadoEfectivo ?? 0))}</>}</div>
                  {s.estado === "CERRADA" && <div className={`font-medium ${Number(s.diferencia ?? 0) === 0 ? "text-emerald-700" : "text-amber-700"}`}>Diferencia: {formatMoney(String(s.diferencia ?? 0))}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
