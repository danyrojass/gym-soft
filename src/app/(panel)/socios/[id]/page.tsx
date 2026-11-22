import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card, Badge, EmptyState, ButtonLink } from "@/components/ui";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { getSnapshot, getSubscriptionConsumption } from "@/lib/domain/subscriptions";
import { accessReasonLabel } from "@/lib/domain/access";
import { toggleMemberStatusAction, updateMemberAction } from "../actions";

export default async function SocioDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { edit?: string; ok?: string; error?: string };
}) {
  const session = await requireSession();
  const gymId = session.user.gymId;

  const member = await prisma.member.findFirst({
    where: { id: params.id, gymId },
    include: {
      subscriptions: { include: { plan: true, payments: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" } },
      payments: { include: { subscription: { include: { plan: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
      accessEvents: { orderBy: { fechaHora: "desc" }, take: 20 },
    },
  });
  if (!member) notFound();

  const now = new Date();
  const subs = await Promise.all(
    member.subscriptions.map(async (s) => ({
      sub: s,
      consumption: await getSubscriptionConsumption(s, now),
    }))
  );

  const edit = searchParams?.edit === "1";

  return (
    <PageShell
      title={`${member.apellido}, ${member.nombre}`}
      description={`Documento: ${member.documentoTipo} ${member.documentoNumero}`}
      action={
        <div className="flex gap-2">
          <ButtonLink href={`/suscripciones/nueva?memberId=${member.id}`} variant="secondary">Nueva suscripción</ButtonLink>
          <ButtonLink href={`/pagos?memberId=${member.id}&new=1`} variant="secondary">Registrar pago</ButtonLink>
          <ButtonLink href={`/socios/${member.id}?edit=1`}>Editar</ButtonLink>
        </div>
      }
    >
      {searchParams?.ok && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Cambios guardados.</div>}
      {searchParams?.error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{searchParams.error === "documento_duplicado" ? "Documento duplicado." : "Error en los datos."}</div>}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Datos del socio</h3>
            <Badge tone={member.estado === "ACTIVO" ? "green" : "slate"}>{member.estado}</Badge>
          </div>
          {!edit ? (
            <dl className="space-y-3 text-sm">
              <Info label="Nombre" value={`${member.nombre} ${member.apellido}`} />
              <Info label="Documento" value={`${member.documentoTipo} ${member.documentoNumero}`} />
              <Info label="Teléfono" value={member.telefono || "-"} />
              <Info label="Email" value={member.email || "-"} />
              <Info label="Nacimiento" value={formatDate(member.fechaNacimiento)} />
              <Info label="Notas" value={member.notas || "-"} />
              <form action={toggleMemberStatusAction.bind(null, member.id)}>
                <button className="mt-2 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" type="submit">
                  {member.estado === "ACTIVO" ? "Dar de baja (inactivar)" : "Reactivar socio"}
                </button>
              </form>
            </dl>
          ) : (
            <form action={updateMemberAction.bind(null, member.id)} className="space-y-3 text-sm">
              <Field label="Nombre *"><input name="nombre" defaultValue={member.nombre} required className="input" /></Field>
              <Field label="Apellido *"><input name="apellido" defaultValue={member.apellido} required className="input" /></Field>
              <Field label="Tipo documento">
                <select name="documentoTipo" defaultValue={member.documentoTipo} className="input">
                  <option value="DNI">DNI</option><option value="CEDULA">Cédula</option><option value="OTRO">Otro</option>
                </select>
              </Field>
              <Field label="Número documento *"><input name="documentoNumero" defaultValue={member.documentoNumero} required className="input" /></Field>
              <Field label="Teléfono"><input name="telefono" defaultValue={member.telefono || ""} className="input" /></Field>
              <Field label="Email"><input name="email" type="email" defaultValue={member.email || ""} className="input" /></Field>
              <Field label="Nacimiento"><input name="fechaNacimiento" type="date" defaultValue={member.fechaNacimiento ? member.fechaNacimiento.toISOString().slice(0,10) : ""} className="input" /></Field>
              <Field label="Estado">
                <select name="estado" defaultValue={member.estado} className="input"><option value="ACTIVO">ACTIVO</option><option value="INACTIVO">INACTIVO</option></select>
              </Field>
              <Field label="Notas"><textarea name="notas" defaultValue={member.notas || ""} className="input min-h-20" /></Field>
              <div className="flex gap-2">
                <button className="rounded-md bg-slate-900 px-3 py-2 text-white hover:bg-slate-800" type="submit">Guardar</button>
                <Link href={`/socios/${member.id}`} className="rounded-md border border-slate-300 px-3 py-2 hover:bg-slate-50">Cancelar</Link>
              </div>
              <style>{`.input{width:100%;border-radius:0.375rem;border:1px solid #cbd5e1;padding:0.5rem 0.75rem}`}</style>
            </form>
          )}
        </Card>

        <div className="xl:col-span-2 space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Suscripciones</h3>
            {subs.length === 0 ? <EmptyState text="Sin suscripciones registradas." /> : (
              <div className="space-y-3">
                {subs.map(({ sub, consumption }) => {
                  const snap = getSnapshot(sub);
                  const tone = consumption.effectiveStatus === "ACTIVA" ? "green" : consumption.effectiveStatus === "PENDIENTE_PAGO" ? "amber" : "red";
                  return (
                    <div key={sub.id} className="rounded-md border border-slate-200 p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900">{snap.nombre} {snap.esPromo ? <span className="text-xs text-amber-700">(Promo)</span> : null}</div>
                          <div className="text-slate-500">{formatDate(sub.fechaInicio)} → {formatDateTime(sub.fechaFin)}</div>
                        </div>
                        <Badge tone={tone as "green" | "amber" | "red"}>{consumption.effectiveStatus}</Badge>
                      </div>
                      <div className="mt-2 text-slate-600">
                        Política: {snap.politicaAcceso}
                        {snap.politicaAcceso === "PASES_TOTALES" && ` · Restantes: ${sub.pasesRestantes ?? 0}/${snap.pasesTotales ?? 0}`}
                        {snap.politicaAcceso === "FRECUENCIA_SEMANAL" && ` · Semana lun-dom: ${consumption.weeklyUsed ?? 0}/${snap.frecuenciaSemanalMax ?? 0}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Pagos recientes</h3>
            {member.payments.length === 0 ? <EmptyState text="Sin pagos registrados." /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Concepto</th><th className="py-2 pr-3">Método</th><th className="py-2 pr-3">Estado</th><th className="py-2">Monto</th></tr></thead>
                  <tbody>
                    {member.payments.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3">{formatDateTime(p.createdAt)}</td>
                        <td className="py-2 pr-3">{p.subscription?.plan?.nombre || "Pago"}</td>
                        <td className="py-2 pr-3">{p.metodo}</td>
                        <td className="py-2 pr-3"><Badge tone={p.estado === "CONFIRMADO" ? "green" : p.estado === "PENDIENTE" ? "amber" : "red"}>{p.estado}</Badge></td>
                        <td className="py-2">{formatMoney(String(p.monto))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Historial de accesos</h3>
            {member.accessEvents.length === 0 ? <EmptyState text="Sin eventos de acceso." /> : (
              <div className="space-y-2">
                {member.accessEvents.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm">
                    <div>
                      <div className="font-medium text-slate-900">{formatDateTime(e.fechaHora)}</div>
                      <div className="text-slate-500">{accessReasonLabel(e.motivo)} ({e.motivo})</div>
                    </div>
                    <Badge tone={e.resultado === "PERMITIDO" ? "green" : "red"}>{e.resultado}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="font-medium text-slate-900 break-words">{value}</dd></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}</label>;
}
