import { requireSession } from "@/lib/session";
import { PanelNav } from "@/components/panel-nav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="min-h-screen bg-slate-100">
      <PanelNav user={session.user} />
      {children}
    </div>
  );
}
