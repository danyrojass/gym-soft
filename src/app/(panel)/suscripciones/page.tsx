import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card, ButtonLink, Badge, EmptyState } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { getSubscriptionConsumption } from "@/lib/domain/subscriptions";

export default async function SuscripcionesPage() {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const now = new Date();
  const subs = await prisma.subscription.findMany({
    where: { gymId },
    include: { member: true, plan: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  const enriched = await Promise.all(subs.map(async (s) => ({ s, c: await getSubscriptionConsumption(s, now) })));

  return (
    <PageShell
      title="Suscripciones"
      description="Suscripciones con snapshot de plan, vigencia y consumo."
      action={<ButtonLink href="/suscripciones/nueva">Nueva suscripción</ButtonLink>}
    >
      <Card>
        {enriched.length === 0 ? <EmptyState text="No hay suscripciones." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3">Socio</th><th className="py-2 pr-3">Plan</th><th className="py-2 pr-3">Vigencia</th><th className="py-2 pr-3">Consumo</th><th className="py-2 pr-3">Estado</th></tr></thead>
              <tbody>
                {enriched.map(({ s, c }) => {
                  const tone = c.effectiveStatus === "ACTIVA" ? "green" : c.effectiveStatus === "PENDIENTE_PAGO" ? "amber" : "red";
                  return (
                    <tr key={s.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3"><div className="font-medium text-slate-900">{s.member.apellido}, {s.member.nombre}</div><div className="text-slate-500">{s.member.documentoNumero}</div></td>
                      <td className="py-3 pr-3">{c.snapshot.nombre}</td>
                      <td className="py-3 pr-3">{formatDate(s.fechaInicio)} → {formatDateTime(s.fechaFin)}</td>
                      <td className="py-3 pr-3">
                        {c.snapshot.politicaAcceso === "ILIMITADO" && "Ilimitado"}
                        {c.snapshot.politicaAcceso === "PASES_TOTALES" && `${s.pasesRestantes ?? 0}/${c.snapshot.pasesTotales ?? 0} pases`}
                        {c.snapshot.politicaAcceso === "FRECUENCIA_SEMANAL" && `${c.weeklyUsed ?? 0}/${c.snapshot.frecuenciaSemanalMax ?? 0} esta semana`}
                      </td>
                      <td className="py-3 pr-3"><Badge tone={tone as "green" | "amber" | "red"}>{c.effectiveStatus}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
