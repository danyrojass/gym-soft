import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card, ButtonLink, Badge, EmptyState } from "@/components/ui";
import { normalizeDocumento } from "@/lib/format";
import { computeEffectiveSubscriptionStatus } from "@/lib/domain/subscriptions";

export default async function SociosPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const q = (searchParams?.q ?? "").trim();
  const qDoc = normalizeDocumento(q);

  const members = await prisma.member.findMany({
    where: {
      gymId,
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { apellido: { contains: q, mode: "insensitive" } },
              { documentoNumero: { contains: qDoc || q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      subscriptions: { orderBy: { fechaFin: "desc" }, take: 1, include: { plan: true } },
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    take: 100,
  });

  return (
    <PageShell
      title="Socios"
      description="Alta, edición, búsqueda y ficha de socios."
      action={<ButtonLink href="/socios/nuevo">Nuevo socio</ButtonLink>}
    >
      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" action="/socios" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por DNI, nombre o apellido"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">
            Buscar
          </button>
          {q && <Link href="/socios" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-center">Limpiar</Link>}
        </form>
      </Card>

      <Card>
        {members.length === 0 ? (
          <EmptyState text="No se encontraron socios." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3">Socio</th>
                  <th className="py-2 pr-3">Documento</th>
                  <th className="py-2 pr-3">Contacto</th>
                  <th className="py-2 pr-3">Suscripción</th>
                  <th className="py-2 pr-3">Estado socio</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const sub = m.subscriptions[0];
                  const effective = sub ? computeEffectiveSubscriptionStatus(sub, new Date()) : null;
                  return (
                    <tr key={m.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900">{m.apellido}, {m.nombre}</div>
                      </td>
                      <td className="py-3 pr-3 text-slate-700">{m.documentoTipo} {m.documentoNumero}</td>
                      <td className="py-3 pr-3 text-slate-600">{m.telefono || m.email || "-"}</td>
                      <td className="py-3 pr-3">
                        {sub ? (
                          <div className="space-y-1">
                            <div className="text-slate-800">{sub.plan.nombre}</div>
                            <Badge tone={effective === "ACTIVA" ? "green" : effective === "PENDIENTE_PAGO" ? "amber" : "red"}>{effective}</Badge>
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin suscripción</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge tone={m.estado === "ACTIVO" ? "green" : "slate"}>{m.estado}</Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Link href={`/socios/${m.id}`} className="text-slate-900 hover:underline">Ver</Link>
                          <Link href={`/socios/${m.id}?edit=1`} className="text-slate-600 hover:underline">Editar</Link>
                        </div>
                      </td>
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
