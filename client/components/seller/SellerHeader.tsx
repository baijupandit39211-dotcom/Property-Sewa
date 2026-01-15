"use client";

import React from "react";
import { Bell, Search, User } from "lucide-react";

export default function SellerHeader() {
  return (
    <header className="flex h-16 items-center justify-between bg-[#2F6B4A] px-6 text-white shadow-md">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
          <div className="flex flex-col gap-[5px]">
            <span className="h-[5px] w-[18px] rounded-full bg-[#1DFF91]" />
            <span className="h-[5px] w-[18px] rounded-full bg-[#1DFF91]" />
            <span className="h-[5px] w-[18px] rounded-full bg-[#1DFF91]" />
          </div>
        </div>
        <span className="text-base font-extrabold tracking-[0.12em]">PROPERTY SEWA</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 md:flex">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            placeholder="Search"
            className="w-[220px] bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-white/30 transition hover:scale-[1.03]">
          <Bell className="h-4 w-4" />
        </button>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-white/30">
          <User className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
