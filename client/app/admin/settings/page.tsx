export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-4xl font-extrabold text-zinc-900">Settings</h1>

      <div className="mt-8 space-y-6">
        <div className="rounded-xl bg-white p-6 border">
          <h2 className="font-bold">General Settings</h2>
          <input
            placeholder="Platform Name"
            className="mt-4 w-full rounded-lg border px-4 py-2"
          />
          <input
            placeholder="Support Email"
            className="mt-4 w-full rounded-lg border px-4 py-2"
          />
        </div>

        <div className="rounded-xl bg-white p-6 border">
          <h2 className="font-bold">Security</h2>
          <button className="mt-4 rounded-xl bg-emerald-900 px-6 py-3 text-white">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
