import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card, Badge, EmptyState } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { confirmPaymentAction, rejectPaymentAction, createPaymentAction } from "./actions";

export default async function PagosPage({
  searchParams,
}: {
  searchParams?: { memberId?: string; new?: string; ok?: string; error?: string };
}) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const memberId = searchParams?.memberId;
  const [payments, members, subscriptions] = await Promise.all([
    prisma.payment.findMany({
      where: { gymId, ...(memberId ? { memberId } : {}) },
      include: { member: true, subscription: { include: { plan: true } }, registradoPor: true, confirmadoPor: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.member.findMany({ where: { gymId, estado: "ACTIVO" }, orderBy: [{ apellido: "asc" }, { nombre: "asc" }] }),
    prisma.subscription.findMany({ where: { gymId }, include: { member: true, plan: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <PageShell title="Pagos" description="Registro y confirmación de pagos en efectivo o transferencia. Transferencia pendiente no habilita acceso hasta confirmarse.">
      {searchParams?.ok && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Operación realizada.</div>}
      {searchParams?.error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{decodeURIComponent(searchParams.error)}</div>}

      <Card>
        <details open={searchParams?.new === "1"}>
          <summary className="cursor-pointer text-sm font-medium text-slate-900">Registrar pago</summary>
          <form action={createPaymentAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Socio *">
              <select name="memberId" required defaultValue={memberId || ""} className="input">
                <option value="">Seleccionar...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.apellido}, {m.nombre} ({m.documentoNumero})</option>)}
              </select>
            </Field>
            <Field label="Suscripción (opcional)">
              <select name="subscriptionId" className="input" defaultValue="">
                <option value="">Sin vincular / nueva manual</option>
                {subscriptions.map((s) => <option key={s.id} value={s.id}>{s.member.apellido}, {s.member.nombre} - {s.plan.nombre} ({s.estado})</option>)}
              </select>
            </Field>
            <Field label="Monto (ARS) *"><input name="monto" type="number" min="0" step="0.01" required className="input" /></Field>
            <Field label="Método *">
              <select name="metodo" className="input" defaultValue="EFECTIVO">
                <option value="EFECTIVO">Efectivo (confirmado)</option>
                <option value="TRANSFERENCIA">Transferencia (pendiente)</option>
              </select>
            </Field>
            <Field label="Referencia / comprobante"><input name="referencia" className="input" /></Field>
            <Field label="Notas"><input name="notas" className="input" /></Field>
            <div className="sm:col-span-2"><button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">Guardar pago</button></div>
          </form>
        </details>
        <style>{`.input{width:100%;border-radius:0.375rem;border:1px solid #cbd5e1;padding:0.5rem 0.75rem;font-size:0.875rem;color:#0f172a;background:white}`}</style>
      </Card>

      <Card>
        {payments.length === 0 ? <EmptyState text="No hay pagos registrados." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Socio</th><th className="py-2 pr-3">Concepto</th><th className="py-2 pr-3">Método</th><th className="py-2 pr-3">Estado</th><th className="py-2 pr-3">Monto</th><th className="py-2">Acciones</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-3">{formatDateTime(p.createdAt)}<div className="text-xs text-slate-500">Reg: {p.registradoPor?.nombre || "-"}</div></td>
                    <td className="py-3 pr-3"><Link href={`/socios/${p.memberId}`} className="font-medium text-slate-900 hover:underline">{p.member.apellido}, {p.member.nombre}</Link><div className="text-xs text-slate-500">{p.member.documentoNumero}</div></td>
                    <td className="py-3 pr-3">{p.subscription?.plan?.nombre || "-"}{p.referencia ? <div className="text-xs text-slate-500">Ref: {p.referencia}</div> : null}</td>
                    <td className="py-3 pr-3">{p.metodo}</td>
                    <td className="py-3 pr-3">
                      <Badge tone={p.estado === "CONFIRMADO" ? "green" : p.estado === "PENDIENTE" ? "amber" : "red"}>{p.estado}</Badge>
                      {p.confirmadoPor && <div className="text-xs text-slate-500 mt-1">Por: {p.confirmadoPor.nombre}</div>}
                    </td>
                    <td className="py-3 pr-3">{formatMoney(String(p.monto))}</td>
                    <td className="py-3">
                      {p.metodo === "TRANSFERENCIA" && p.estado === "PENDIENTE" ? (
                        <div className="flex gap-2">
                          <form action={confirmPaymentAction.bind(null, p.id)}><button className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700" type="submit">Confirmar</button></form>
                          <form action={rejectPaymentAction.bind(null, p.id)}><button className="rounded-md border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50" type="submit">Rechazar</button></form>
                        </div>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}</label>;
}
