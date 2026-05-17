import dynamic from "next/dynamic";

const AdminListingsApprovalWorkspace = dynamic(
  () => import("@/components/admin/AdminListingsApprovalWorkspace"),
  {
    loading: () => (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-56 rounded-[32px] bg-slate-200/80" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-[28px] bg-white shadow-sm" />
            ))}
          </div>
          <div className="h-[520px] rounded-[28px] bg-white shadow-sm" />
        </div>
      </main>
    ),
  }
);

export default AdminListingsApprovalWorkspace;
