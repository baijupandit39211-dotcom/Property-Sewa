"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Eye,
  Home,
  Inbox,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";

const pageEnter = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as any } },
};

const quickActions = [
  {
    title: "Add New Property",
    desc: "List a new property on PropertySewa",
    image: "/images/dashboard-house-1.png",
  },
  {
    title: "Manage Listings",
    desc: "Edit or update your existing listings",
    image: "/images/dashboard-interior-1.png",
  },
  {
    title: "View Leads",
    desc: "See and manage potential buyer inquiries",
    image: "/images/dashboard-house-2.png",
  },
];

const activities = [
  {
    title: "New inquiry for 3BHK apartment in Downtown",
    time: "2 hours ago",
  },
  {
    title: "Scheduled visit for 2BHK villa in Suburbia",
    time: "Yesterday",
  },
  {
    title: "Listing performance alert for 1BHK condo in Uptown",
    time: "2 days ago",
  },
];

export default function SellerDashboardPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await apiFetch<{success: boolean; items: any[]}>("/properties/mine");
        
        if (response.success) {
          // Normalize data to ensure safe defaults
          const normalizedProperties = (response.items || []).map(property => ({
            ...property,
            views: property.views || 0,
            leads: property.leads || 0,
            status: property.status || 'pending'
          }));
          setProperties(normalizedProperties);
        }
      } catch (err) {
        console.error("Failed to fetch properties for dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Compute stats from real data
  const totalListings = properties.length;
  const pendingCount = properties.filter(p => p.status === "pending").length;
  const approvedCount = properties.filter(p => p.status === "active").length;
  const rejectedCount = properties.filter(p => p.status === "rejected").length;
  const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalLeads = properties.reduce((sum, p) => sum + (p.leads || 0), 0);

  const statCards = [
    { title: "Total Listings", value: totalListings.toString(), change: "+0%", icon: Home },
    { title: "Active Listings", value: approvedCount.toString(), change: "+0%", icon: TrendingUp },
    { title: "Total Views", value: totalViews.toLocaleString(), change: "+0%", icon: Eye },
    { title: "Total Leads", value: totalLeads.toString(), change: "+0%", icon: Users },
  ];
  return (
    <motion.main
      initial="hidden"
      animate="show"
      variants={pageEnter}
      className="w-full min-w-0 max-w-6xl space-y-10 mx-auto"
    >
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Welcome back, Sarah
        </h1>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.18 }}
              className="flex h-full flex-col justify-between rounded-xl bg-[#2C6B45] px-4 py-4 text-white shadow-[0_12px_32px_rgba(10,76,49,0.18)]"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white/80">{card.title}</div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold">{card.value}</div>
              <div className="mt-1 text-sm font-semibold text-emerald-100">{card.change}</div>
            </motion.div>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900">Quick Actions</h2>
          </div>
          <div className="space-y-6">
            {quickActions.map((action) => (
              <motion.div
                key={action.title}
                whileHover={{ y: -3 }}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900">{action.title}</div>
                  <div className="text-xs font-semibold text-emerald-700">{action.desc}</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <Plus className="h-4 w-4" />
                    Start now
                  </div>
                </div>
                <div className="ml-4 h-[92px] w-[140px] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">
                  <img
                    src={action.image}
                    alt={action.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-extrabold text-slate-900">Recent Activity Feed</h3>
          <div className="mt-4 space-y-4">
            {activities.map((item, idx) => (
              <div key={item.title} className="relative pl-8">
                <div className="absolute left-[7px] top-0 flex flex-col items-center">
                  <div className="grid h-4 w-4 place-items-center rounded-full bg-emerald-600">
                    <TrendingUp className="h-2.5 w-2.5 text-white" />
                  </div>
                  {idx !== activities.length - 1 && (
                    <div className="mt-1 h-full w-[2px] bg-emerald-100" />
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="text-xs font-semibold text-emerald-700">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white px-5 py-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Inbox className="h-4 w-4 text-emerald-700" />
          Messages / Chat
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Keep track of buyer inquiries and coordinate visit schedules seamlessly.
        </p>
      </section>
    </motion.main>
  );
}
