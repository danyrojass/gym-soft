import Link from "next/link";
import { requireAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PanelNav } from "@/components/panel-nav";
import { PageShell, Card, Badge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { createStaffUserAction, toggleStaffUserAction } from "./users/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams?: { ok?: string; error?: string } }) {
  const session = await requireAdminSession();
  const gymId = session.user.gymId;

  const [users, audits, gym] = await Promise.all([
    prisma.user.findMany({ where: { gymId }, orderBy: [{ activo: "desc" }, { rol: "asc" }, { nombre: "asc" }] }),
    prisma.auditLog.findMany({ where: { gymId }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.gym.findUnique({ where: { id: gymId }, select: { nombre: true, config: true } }),
  ]);

  return (
    <main className="min-h-screen bg-slate-100">
      <PanelNav user={session.user} />
      <PageShell title="Administración" description="Gestión de staff, auditoría y configuración (solo ADMIN).">
        {searchParams?.ok && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.ok}</div>}
        {searchParams?.error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{decodeURIComponent(searchParams.error)}</div>}

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-1">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Crear usuario staff</h2>
            <form action={createStaffUserAction} className="space-y-3 text-sm">
              <Field label="Nombre"><input name="nombre" required className="input" /></Field>
              <Field label="Email"><input name="email" type="email" required className="input" /></Field>
              <Field label="Contraseña (min 8)"><input name="password" type="password" minLength={8} required className="input" /></Field>
              <Field label="Rol">
                <select name="rol" className="input" defaultValue="RECEPCION">
                  <option value="RECEPCION">RECEPCION</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </Field>
              <button className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800" type="submit">Crear usuario</button>
            </form>
            <style>{`.input{width:100%;border-radius:0.375rem;border:1px solid #cbd5e1;padding:0.5rem 0.75rem}`}</style>
          </Card>

          <Card className="xl:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Usuarios del gimnasio</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3">Nombre</th><th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Rol</th><th className="py-2 pr-3">Estado</th><th className="py-2">Acción</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{u.nombre}</td>
                      <td className="py-2 pr-3">{u.email}</td>
                      <td className="py-2 pr-3">{u.rol}</td>
                      <td className="py-2 pr-3"><Badge tone={u.activo ? "green" : "slate"}>{u.activo ? "ACTIVO" : "INACTIVO"}</Badge></td>
                      <td className="py-2">
                        {u.id === session.user.id ? <span className="text-slate-400">Actual</span> : (
                          <form action={toggleStaffUserAction.bind(null, u.id)}><button className="text-slate-900 hover:underline" type="submit">{u.activo ? "Desactivar" : "Activar"}</button></form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Auditoría reciente</h2>
          {audits.length === 0 ? <EmptyState text="Sin eventos de auditoría." /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Usuario</th><th className="py-2 pr-3">Acción</th><th className="py-2 pr-3">Entidad</th><th className="py-2">Detalle</th></tr></thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
                      <td className="py-2 pr-3">{a.user?.nombre || a.user?.email || "-"}</td>
                      <td className="py-2 pr-3">{a.accion}</td>
                      <td className="py-2 pr-3">{a.entidad}{a.entidadId ? <div className="text-xs text-slate-400">{a.entidadId}</div> : null}</td>
                      <td className="py-2 text-xs text-slate-500 break-all">{a.detalle ? JSON.stringify(a.detalle) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Configuración del gimnasio</h2>
          <p className="text-sm text-slate-600 mb-3">Configuración actual (lectura). Turnstile/caja se parametrizan en `Gym.config`.</p>
          <pre className="rounded-md bg-slate-50 p-4 text-xs overflow-auto">{JSON.stringify({ nombre: gym?.nombre, config: gym?.config }, null, 2)}</pre>
          <Link href="/dashboard" className="inline-block mt-4 text-sm text-slate-700 hover:underline">Volver al inicio</Link>
        </Card>
      </PageShell>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}</label>;
}
