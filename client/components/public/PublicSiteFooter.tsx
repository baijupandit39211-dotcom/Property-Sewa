"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Facebook, Instagram, Twitter } from "lucide-react";
import PropertySewaLogoMark from "@/components/brand/PropertySewaLogoMark";
import { getDashboardPath } from "@/app/lib/auth";
import { getCachedPublicSessionUser, getPublicSessionUser } from "@/app/lib/publicSessionCache";

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
};

export default function PublicSiteFooter() {
  const router = useRouter();
  const [user, setUser] = React.useState<SessionUser | null>(null);

  React.useEffect(() => {
    let active = true;
    const cached = getCachedPublicSessionUser();
    if (cached) setUser(cached);

    (async () => {
      const sessionUser = await getPublicSessionUser();
      if (active) setUser(sessionUser);
    })();

    return () => {
      active = false;
    };
  }, []);

  const addPropertyHref =
    user?.role === "seller" || user?.role === "agent"
      ? "/seller/add-property"
      : user?.role === "admin" || user?.role === "superadmin"
        ? "/admin/add-property"
        : "/register";

  const handleAlertsClick = () => {
    if (user?.role === "buyer") {
      router.push("/buyer/alerts");
      return;
    }

    router.push("/login");
  };

  return (
    <section
      className="relative overflow-hidden py-8 sm:py-10"
      style={{ background: "linear-gradient(135deg, #b8f6d8 0%, #5be89b 45%, #2fda80 100%)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(rgba(11,31,22,0.14) 0.8px, transparent 0.8px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:gap-7">
        <div>
          <h3 className="text-[28px] font-extrabold tracking-[-0.01em] text-[#0b1f16] sm:text-[32px] lg:text-[36px] lg:leading-[1.08]">
            Get Property Alerts
          </h3>
          <p className="mt-2.5 text-[14px] font-medium text-[#5f7f72] sm:text-[15px] sm:leading-[1.35]">
            Be the first to know about new listings that match your criteria.
          </p>

          <div className="mt-5 flex max-w-[520px] flex-col gap-2.5 sm:flex-row">
            <input
              className="h-10 flex-1 rounded-xl bg-[#e5ebe8] px-4 text-[14px] text-[#496c5f] outline-none ring-1 ring-[#d1ddd7] placeholder:text-[#7f9a8f] sm:h-11 sm:text-[15px]"
              placeholder="Enter your email address"
            />
            <button
              type="button"
              onClick={handleAlertsClick}
              className="h-10 rounded-xl bg-[#00f078] px-6 text-[15px] font-bold text-[#04140c] transition hover:bg-[#00e06f] active:scale-[0.98] sm:h-11 sm:text-[16px]"
            >
              Get Alerts
            </button>
          </div>

          <p className="mt-2 text-[12px] text-[#6f8f82]">No spam. Unsubscribe anytime.</p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[215px] sm:max-w-[250px] lg:ml-auto">
          <motion.div
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="relative h-full w-full"
          >
            <Image
              src="/house-3d.png"
              alt="House"
              fill
              className="object-contain drop-shadow-[0_16px_20px_rgba(12,40,24,0.18)]"
            />
          </motion.div>
        </div>
      </div>

      <div className="relative mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-5 pt-3 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1bdf7f] ring-1 ring-[#1bdf7f]/60">
                <PropertySewaLogoMark className="h-[22px] w-[22px] text-[#0b1f16]" />
              </div>
              <span className="text-[20px] font-bold text-[#071a12]">Property Sewa</span>
            </div>
            <p className="mt-2 max-w-[210px] text-[12px] leading-5 text-[#153627]">
              The modern way to find, buy, and sell your home.
            </p>
          </div>

          <FooterCol
            title="Company"
            links={[
              { label: "Home", href: "/" },
              { label: "Login", href: "/login" },
              { label: "Register", href: "/register" },
              { label: "Dashboard", href: user ? getDashboardPath(user.role) : "/login" },
            ]}
          />
          <FooterCol
            title="Explore"
            links={[
              { label: "Buy", href: "/properties?type=sale" },
              { label: "Rent", href: "/properties?type=rent" },
              { label: "Sell", href: addPropertyHref },
              { label: "Offers", href: "/properties?offersOnly=true" },
            ]}
          />
          <FooterCol
            title="Support"
            links={[
              { label: "Search Properties", href: "/properties" },
              { label: "Contact Us", href: "/contact" },
              { label: "Forgot Password", href: "/forgot-password" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: "FAQ", href: "/faq" },
              { label: "Contact", href: "/contact" },
              { label: "Dashboard", href: user ? getDashboardPath(user.role) : "/login" },
            ]}
          />
        </div>

        <div className="mt-7 border-t border-[#d8efe2]/90 pt-3.5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] text-[#0e2c1f]">
              © {new Date().getFullYear()} Property Sewa. All rights reserved.
            </p>
            <div className="inline-flex items-center gap-4 text-[#0b2519]">
              <Link href="#" aria-label="Twitter" className="transition hover:text-[#071a12]">
                <Twitter className="h-4 w-4" />
              </Link>
              <Link href="#" aria-label="Facebook" className="transition hover:text-[#071a12]">
                <Facebook className="h-4 w-4" />
              </Link>
              <Link href="#" aria-label="Instagram" className="transition hover:text-[#071a12]">
                <Instagram className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <p className="text-[14px] font-bold text-[#0b1f16]">{title}</p>
      <ul className="mt-2.5 space-y-1.5 text-[13px] leading-5 text-[#0d2a1e]/85">
        {links.map((link) => (
          <li key={link.label}>
            <Link className="transition hover:text-[#0b1f16]" href={link.href} prefetch={true}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
