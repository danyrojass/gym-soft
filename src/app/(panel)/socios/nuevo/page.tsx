import Link from "next/link";
import { PageShell, Card } from "@/components/ui";
import { requireSession } from "@/lib/session";
import { createMemberAction } from "../actions";

export default async function NuevoSocioPage({ searchParams }: { searchParams?: { error?: string } }) {
  await requireSession();
  const error = searchParams?.error;
  return (
    <PageShell title="Nuevo socio" description="Registrar un socio para asignarle planes y controlar acceso por DNI.">
      <Card>
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error === "documento_duplicado" ? "Ya existe un socio con ese documento en este gimnasio." : "Completá los campos obligatorios."}
          </div>
        )}
        <form action={createMemberAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre *"><input name="nombre" required className="input" /></Field>
          <Field label="Apellido *"><input name="apellido" required className="input" /></Field>
          <Field label="Tipo documento">
            <select name="documentoTipo" className="input" defaultValue="DNI">
              <option value="DNI">DNI</option>
              <option value="CEDULA">Cédula</option>
              <option value="OTRO">Otro</option>
            </select>
          </Field>
          <Field label="Número documento *"><input name="documentoNumero" required className="input" placeholder="Ej: 12345678" /></Field>
          <Field label="Teléfono"><input name="telefono" className="input" /></Field>
          <Field label="Email"><input name="email" type="email" className="input" /></Field>
          <Field label="Fecha de nacimiento"><input name="fechaNacimiento" type="date" className="input" /></Field>
          <div className="sm:col-span-2">
            <Field label="Notas"><textarea name="notas" className="input min-h-24" /></Field>
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" type="submit">Guardar socio</button>
            <Link href="/socios" className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancelar</Link>
          </div>
        </form>
      </Card>
      <style>{`.input{width:100%;border-radius:0.375rem;border:1px solid #cbd5e1;padding:0.5rem 0.75rem;font-size:0.875rem;color:#0f172a;background:white}.input:focus{outline:2px solid #94a3b8;outline-offset:1px}`}</style>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}</label>;
}
