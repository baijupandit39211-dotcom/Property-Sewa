export default function LeadsPage() {
  const leads = [
    { name: "Amit Sharma", email: "amit@gmail.com", property: "Luxury Villa" },
    { name: "Rina Karki", email: "rina@gmail.com", property: "City Apartment" },
  ];

  return (
    <div>
      <h1 className="text-4xl font-extrabold text-zinc-900">Leads & Inquiries</h1>

      <div className="mt-6 space-y-4">
        {leads.map((l, i) => (
          <div key={i} className="rounded-xl bg-white p-5 border">
            <div className="font-bold">{l.name}</div>
            <div className="text-sm text-emerald-700">{l.email}</div>
            <div className="text-xs text-emerald-600">Property: {l.property}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
