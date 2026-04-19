"use client";

import * as React from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ChevronDown, HelpCircle, ShieldCheck } from "lucide-react";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import PublicSiteHeader from "@/components/public/PublicSiteHeader";

const FAQ_ITEMS = [
  {
    question: "How do I list my property on Property Sewa?",
    answer:
      'Create a seller account, go to your dashboard, and click "Add Property". Fill in the details, upload images, and submit for review. Our team will approve your listing within 24 hours.',
  },
  {
    question: "Is Property Sewa free for buyers?",
    answer:
      "Yes. Browsing listings, exploring property details, and using buyer-side discovery tools on Property Sewa are free for buyers.",
  },
  {
    question: "How are listings verified?",
    answer:
      "Our team reviews submitted listing details, images, and seller information before approval. Verified listings are checked for completeness, clarity, and platform compliance.",
  },
  {
    question: "Can I schedule a property visit?",
    answer:
      "Yes. You can contact the listing owner or agent through the platform and coordinate a suitable time for a visit based on availability.",
  },
  {
    question: "What areas does Property Sewa cover?",
    answer:
      "Property Sewa supports listings across major cities and growing real estate areas in Nepal, with coverage continuing to expand as more verified listings are added.",
  },
  {
    question: "How do I become a verified agent?",
    answer:
      "Create an agent account, complete your profile with valid professional details, and submit the required verification information. Our team will review and confirm your status.",
  },
  {
    question: "Is my personal information safe?",
    answer:
      "Yes. We handle personal information with care and use secure platform practices to protect account details, contact data, and essential user activity.",
  },
  {
    question: "How can I report a suspicious listing?",
    answer:
      "If you notice a suspicious listing, contact Property Sewa support with the listing details and your concern. Our team will review it and take appropriate action.",
  },
] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * index,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export default function FaqPage() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fdf9_0%,#ffffff_26%,#f4fff8_100%)]">
      <PublicSiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,217,123,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(18,57,43,0.1),transparent_24%)]" />

          <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-16">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
              className="mx-auto flex max-w-3xl flex-col items-center text-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm backdrop-blur">
                <HelpCircle className="h-4 w-4" />
                Help Center
              </div>

              <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Frequently Asked Questions
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Everything you need to know about Property Sewa
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                Clear answers for buyers, sellers, agents, and renters
              </div>
            </motion.div>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="space-y-4"
            >
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openIndex === index;
                const panelId = `faq-panel-${index}`;
                const buttonId = `faq-button-${index}`;

                return (
                  <div
                    key={item.question}
                    className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                  >
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleItem(index)}
                      className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                    >
                      <span className="text-base font-semibold leading-7 text-slate-900 sm:text-lg">
                        {item.question}
                      </span>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200 transition-colors duration-300 group-hover:text-emerald-700">
                        <ChevronDown
                          className={[
                            "h-5 w-5 transition-transform duration-300",
                            isOpen ? "rotate-180 text-emerald-700" : "",
                          ].join(" ")}
                        />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div
                          id={panelId}
                          role="region"
                          aria-labelledby={buttonId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-500 sm:px-6 sm:py-5 sm:text-[15px]">
                            {item.answer}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
