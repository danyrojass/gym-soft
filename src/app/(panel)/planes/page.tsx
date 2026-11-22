import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card, ButtonLink, Badge, EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export default async function PlanesPage() {
  const session = await requireSession();
  const plans = await prisma.plan.findMany({
    where: { gymId: session.user.gymId },
    orderBy: [{ activo: "desc" }, { esPromo: "desc" }, { nombre: "asc" }],
  });

  return (
    <PageShell
      title="Planes y promos"
      description="Configurar vigencia, precio y política de acceso. Los cambios no alteran suscripciones ya creadas (snapshot)."
      action={<ButtonLink href="/planes/nuevo">Nuevo plan</ButtonLink>}
    >
      <Card>
        {plans.length === 0 ? <EmptyState text="No hay planes creados." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3">Nombre</th><th className="py-2 pr-3">Vigencia</th><th className="py-2 pr-3">Política</th><th className="py-2 pr-3">Precio</th><th className="py-2 pr-3">Estado</th><th className="py-2">Acción</th></tr></thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3"><div className="font-medium text-slate-900">{p.nombre}</div>{p.esPromo && <span className="text-xs text-amber-700">Promo</span>}</td>
                    <td className="py-3 pr-3">{p.tipoVigencia} ({p.duracionDias} días)</td>
                    <td className="py-3 pr-3">
                      {p.politicaAcceso}
                      {p.politicaAcceso === "PASES_TOTALES" ? ` (${p.pasesTotales})` : ""}
                      {p.politicaAcceso === "FRECUENCIA_SEMANAL" ? ` (${p.frecuenciaSemanalMax}/sem)` : ""}
                    </td>
                    <td className="py-3 pr-3">{formatMoney(String(p.precio))}</td>
                    <td className="py-3 pr-3"><Badge tone={p.activo ? "green" : "slate"}>{p.activo ? "ACTIVO" : "INACTIVO"}</Badge></td>
                    <td className="py-3"><Link href={`/planes/nuevo?edit=${p.id}`} className="text-slate-900 hover:underline">Editar</Link></td>
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
