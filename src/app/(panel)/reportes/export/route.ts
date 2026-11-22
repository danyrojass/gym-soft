import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { parseDateRange } from "@/lib/domain/cash";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const url = new URL(request.url);
  const { from, to } = parseDateRange(url.searchParams.get("from"), url.searchParams.get("to"));

  const rows = await prisma.cashMovement.findMany({
    where: { gymId, fecha: { gte: from, lte: to } },
    include: { registradoPor: true, payment: { include: { member: true } } },
    orderBy: { fecha: "desc" },
  });

  const header = ["fecha", "tipo", "categoria", "metodo", "monto", "descripcion", "socio", "registradoPor", "paymentId"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      r.fecha.toISOString(),
      r.tipo,
      r.categoria,
      r.metodo,
      String(r.monto),
      r.descripcion ?? "",
      r.payment?.member ? `${r.payment.member.apellido} ${r.payment.member.nombre}` : "",
      r.registradoPor?.nombre ?? "",
      r.paymentId ?? "",
    ].map(csvEscape).join(","));
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="caja-${url.searchParams.get("from") || "periodo"}.csv"`,
    },
  });
}
