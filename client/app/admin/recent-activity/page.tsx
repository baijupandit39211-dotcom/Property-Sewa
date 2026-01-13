export default function RecentActivityPage() {
  const data = [
    { user: "Sarah", action: "Listing Created", time: "10:30 AM", status: "Active" },
    { user: "David", action: "Listing Updated", time: "11:45 AM", status: "Active" },
    { user: "Emily", action: "Listing Deleted", time: "12:20 PM", status: "Inactive" },
  ];

  return (
    <div>
      <h1 className="text-4xl font-extrabold text-zinc-900">Recent Activity</h1>

      <div className="mt-6 space-y-4">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl bg-white p-4 border">
            <div>
              <div className="font-bold">{d.user}</div>
              <div className="text-sm text-emerald-700">{d.action}</div>
            </div>
            <div className="text-sm">{d.time}</div>
            <span className="rounded-full bg-emerald-900 px-4 py-1 text-white text-xs">
              {d.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
