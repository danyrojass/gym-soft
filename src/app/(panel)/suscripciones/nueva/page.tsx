import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { createSubscriptionAction } from "../actions";

export default async function NuevaSuscripcionPage({
  searchParams,
}: {
  searchParams?: { memberId?: string; error?: string };
}) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const [members, plans] = await Promise.all([
    prisma.member.findMany({ where: { gymId, estado: "ACTIVO" }, orderBy: [{ apellido: "asc" }, { nombre: "asc" }] }),
    prisma.plan.findMany({ where: { gymId, activo: true }, orderBy: [{ esPromo: "desc" }, { nombre: "asc" }] }),
  ]);

  return (
    <PageShell title="Nueva suscripción" description="Contrata un plan y registra el pago. Efectivo activa al instante; transferencia queda pendiente hasta confirmar.">
      <Card>
        {searchParams?.error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</div>}
        <form action={createSubscriptionAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Socio *">
            <select name="memberId" required defaultValue={searchParams?.memberId || ""} className="input">
              <option value="">Seleccionar socio...</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.apellido}, {m.nombre} ({m.documentoNumero})</option>)}
            </select>
          </Field>
          <Field label="Plan *">
            <select name="planId" required className="input" defaultValue="">
              <option value="">Seleccionar plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} - {p.tipoVigencia} - {p.politicaAcceso}{p.politicaAcceso === "FRECUENCIA_SEMANAL" ? ` ${p.frecuenciaSemanalMax}/sem` : ""}{p.politicaAcceso === "PASES_TOTALES" ? ` ${p.pasesTotales} pases` : ""} - {formatMoney(String(p.precio))}
                </option>
              ))}
            </select>
          </Field>

          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="registrarPago" defaultChecked /> Registrar pago ahora
          </label>

          <Field label="Método de pago">
            <select name="metodo" className="input" defaultValue="EFECTIVO">
              <option value="EFECTIVO">Efectivo (confirma y activa)</option>
              <option value="TRANSFERENCIA">Transferencia (queda pendiente)</option>
            </select>
          </Field>
          <Field label="Referencia / comprobante (opcional)">
            <input name="referencia" className="input" placeholder="Nro. transferencia / recibo" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notas"><textarea name="notas" className="input min-h-20" /></Field>
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">Crear suscripción</button>
            <Link href="/suscripciones" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancelar</Link>
          </div>
        </form>
      </Card>
      <style>{`.input{width:100%;border-radius:0.375rem;border:1px solid #cbd5e1;padding:0.5rem 0.75rem;font-size:0.875rem;color:#0f172a;background:white}`}</style>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}</label>;
}
