import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card, Badge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { accessReasonLabel } from "@/lib/domain/access";
import { checkInAction } from "./actions";

export default async function CheckinPage({
  searchParams,
}: {
  searchParams?: { resultado?: string; motivo?: string; doc?: string; nombre?: string };
}) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const events = await prisma.accessEvent.findMany({
    where: { gymId },
    include: { member: true },
    orderBy: { fechaHora: "desc" },
    take: 20,
  });

  const resultado = searchParams?.resultado;
  const motivo = searchParams?.motivo;

  return (
    <PageShell title="Check-in / Control de acceso" description="Validación por DNI/cédula. Registra todo intento con motivo (software; integración torniquete en Iteración 2).">
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Ingresar DNI</h3>
          <form action={checkInAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="documento">DNI / cédula</label>
              <input id="documento" name="documento" autoFocus required className="w-full rounded-md border border-slate-300 px-3 py-3 text-lg tracking-wider" placeholder="Ej: 12345678" />
            </div>
            <button type="submit" className="w-full rounded-md bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">Validar acceso</button>
          </form>

          {resultado && (
            <div className={`mt-4 rounded-lg border p-4 ${resultado === "PERMITIDO" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              <div className={`text-lg font-bold ${resultado === "PERMITIDO" ? "text-emerald-800" : "text-red-800"}`}>{resultado}</div>
              <div className="text-sm text-slate-700 mt-1">{searchParams?.nombre ? `${searchParams.nombre} · ` : ""}{accessReasonLabel(motivo || "")}</div>
              {searchParams?.doc && <div className="text-xs text-slate-500 mt-1">Documento: {searchParams.doc}</div>}
            </div>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Historial reciente</h3>
          {events.length === 0 ? <EmptyState text="No hay eventos de acceso todavía." /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3">Fecha/hora</th><th className="py-2 pr-3">Socio / Documento</th><th className="py-2 pr-3">Motivo</th><th className="py-2">Resultado</th></tr></thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{formatDateTime(e.fechaHora)}</td>
                      <td className="py-2 pr-3">{e.member ? `${e.member.apellido}, ${e.member.nombre}` : e.documentoIngresado}</td>
                      <td className="py-2 pr-3">{accessReasonLabel(e.motivo)} <span className="text-slate-400">({e.motivo})</span></td>
                      <td className="py-2"><Badge tone={e.resultado === "PERMITIDO" ? "green" : "red"}>{e.resultado}</Badge></td>
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
