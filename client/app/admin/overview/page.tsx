import dynamic from "next/dynamic";

const AdminOverviewWorkspace = dynamic(
  () => import("@/components/admin/AdminOverviewWorkspace"),
  {
    loading: () => (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.10),transparent_22%),linear-gradient(180deg,#f6fffa_0%,#edf8f1_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-56 rounded-[34px] bg-slate-200/70" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
          <div className="h-[360px] rounded-2xl bg-white shadow-sm" />
        </div>
      </main>
    ),
  }
);

export default AdminOverviewWorkspace;
