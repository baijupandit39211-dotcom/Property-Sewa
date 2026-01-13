export default function AdminUsersPage() {
  const users = [
    { name: "Sarah", email: "sarah@gmail.com", role: "Buyer", status: "Active" },
    { name: "David", email: "david@gmail.com", role: "Seller", status: "Active" },
    { name: "Emily", email: "emily@gmail.com", role: "Agent", status: "Inactive" },
  ];

  return (
    <div>
      <h1 className="text-4xl font-extrabold text-zinc-900">Users Management</h1>

      <div className="mt-8 overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-emerald-50">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i} className="border-t">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-900 px-4 py-1 text-white text-xs">
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
