import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PageShell, Card } from "@/components/ui";
import { createPlanAction, updatePlanAction } from "../actions";

export default async function PlanFormPage({ searchParams }: { searchParams?: { edit?: string; error?: string } }) {
  const session = await requireSession();
  const editId = searchParams?.edit;
  const plan = editId ? await prisma.plan.findFirst({ where: { id: editId, gymId: session.user.gymId } }) : null;

  const action = plan ? updatePlanAction.bind(null, plan.id) : createPlanAction;

  return (
    <PageShell title={plan ? "Editar plan" : "Nuevo plan"} description="Configurar vigencia y política de acceso. Ej: mensual 30 días, 3 veces por semana lun-dom.">
      <Card>
        {searchParams?.error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</div>}
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre *"><input name="nombre" required defaultValue={plan?.nombre || ""} className="input" /></Field>
          <Field label="Precio (ARS) *"><input name="precio" type="number" step="0.01" min="0" required defaultValue={plan ? String(plan.precio) : "0"} className="input" /></Field>
          <Field label="Tipo de vigencia">
            <select name="tipoVigencia" defaultValue={plan?.tipoVigencia || "MENSUAL"} className="input">
              <option value="DIARIO">Diario (1 día)</option>
              <option value="SEMANAL">Semanal (7 días)</option>
              <option value="MENSUAL">Mensual (30 días corridos)</option>
            </select>
          </Field>
          <Field label="Política de acceso">
            <select name="politicaAcceso" defaultValue={plan?.politicaAcceso || "ILIMITADO"} className="input">
              <option value="ILIMITADO">Ilimitado</option>
              <option value="PASES_TOTALES">Pases totales</option>
              <option value="FRECUENCIA_SEMANAL">Frecuencia semanal (lun-dom)</option>
            </select>
          </Field>
          <Field label="Pases totales (si aplica)"><input name="pasesTotales" type="number" min="1" defaultValue={plan?.pasesTotales ?? ""} className="input" /></Field>
          <Field label="Máx. por semana lun-dom (si aplica)"><input name="frecuenciaSemanalMax" type="number" min="1" defaultValue={plan?.frecuenciaSemanalMax ?? ""} className="input" /></Field>
          <div className="sm:col-span-2"><Field label="Descripción"><textarea name="descripcion" defaultValue={plan?.descripcion || ""} className="input min-h-20" /></Field></div>
          <Field label="Promo inicio (opcional)"><input name="promoInicio" type="date" defaultValue={plan?.promoInicio ? plan.promoInicio.toISOString().slice(0,10) : ""} className="input" /></Field>
          <Field label="Promo fin (opcional)"><input name="promoFin" type="date" defaultValue={plan?.promoFin ? plan.promoFin.toISOString().slice(0,10) : ""} className="input" /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="esPromo" defaultChecked={plan?.esPromo ?? false} /> Es promo</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="activo" defaultChecked={plan?.activo ?? true} /> Plan activo</label>
          <div className="sm:col-span-2 flex gap-3">
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">Guardar</button>
            <Link href="/planes" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancelar</Link>
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
