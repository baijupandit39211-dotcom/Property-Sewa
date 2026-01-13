import BuyerSidebar from "../../../components/buyer/BuyerSidebar";


export default function PropertyDetailsPage() {
  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="flex">
        <BuyerSidebar />

        <main className="w-full px-10 py-8">
          {/* top action buttons */}
          <div className="flex justify-end gap-3">
            <button className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">
              Add to Wishlist
            </button>
            <button className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white">
              Share
            </button>
          </div>

          {/* banner image */}
          <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
              alt="property"
              className="h-[240px] w-full object-cover"
            />
          </div>

          {/* title + price */}
          <h1 className="mt-8 text-3xl font-extrabold text-zinc-900">
            Charming 3-Bedroom Home in Serene Suburb
          </h1>

          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            $1,250,000
          </div>

          <div className="mt-2 text-sm text-emerald-700">Rs 12,500/sq ft</div>

          <div className="mt-4 text-sm text-emerald-700">
            Verified · New Listing · Popular Area
          </div>

          <p className="mt-6 max-w-[760px] text-sm leading-6 text-zinc-700">
            This stunning 3-bedroom, 2-bathroom apartment spans 2,000 sq ft and is
            located on the 15th floor. It comes fully furnished and offers
            breathtaking city views.
          </p>

          {/* tabs */}
          <div className="mt-6 flex flex-wrap gap-6 border-b border-emerald-200 text-sm">
            <button className="border-b-2 border-emerald-700 pb-3 font-semibold text-emerald-900">
              Overview
            </button>
            <button className="pb-3 text-emerald-700 hover:text-emerald-900">
              Amenities & Floor Plans
            </button>
            <button className="pb-3 text-emerald-700 hover:text-emerald-900">
              Photos
            </button>
            <button className="pb-3 text-emerald-700 hover:text-emerald-900">
              Location & Insights
            </button>

            <div className="ml-auto flex gap-3 pb-3">
              <button className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white">
                Schedule Visit
              </button>
              <button className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-black/5 hover:bg-emerald-50">
                Contact Agent
              </button>
            </div>
          </div>

          {/* overview content */}
          <h2 className="mt-10 text-3xl font-extrabold text-zinc-900">
            Overview
          </h2>

          <h3 className="mt-6 text-lg font-bold text-zinc-900">Details</h3>
          <p className="mt-3 max-w-[900px] text-sm leading-6 text-zinc-700">
            Welcome to this stunning 4-bedroom, 3-bathroom home nestled in the heart
            of the desirable Willow Creek neighborhood. This meticulously maintained
            residence offers a perfect blend of modern amenities and classic charm,
            making it an ideal sanctuary for families and individuals alike...
          </p>

          {/* similar properties */}
          <h3 className="mt-14 text-lg font-bold text-zinc-900">
            Similar Properties
          </h3>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80"
                  alt="similar"
                  className="h-[150px] w-full object-cover"
                />
                <div className="p-4">
                  <div className="text-sm font-semibold text-zinc-900">
                    Charming 3-Bedroom Home
                  </div>
                  <div className="mt-2 text-xs text-emerald-700">
                    $750,000 | 3 Beds | 2 Baths | 1800 sq ft | San Francisco
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
