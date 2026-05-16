"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  PhoneCall,
} from "lucide-react";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import PublicSiteHeader from "@/components/public/PublicSiteHeader";

const CONTACT_TITLE = "Contact Us";
const CONTACT_SUBTITLE =
  "Connect with Property Sewa for buying, renting, selling, partnerships, or support. We reply with clear guidance and practical next steps.";

const SUPPORT_ADDRESS = "Janakpur, Nepal";
const SUPPORT_EMAIL = "propertysewa123@gmail.com";
const SUPPORT_PHONE = "9819601008";
const CONTACT_HOURS = "Sun-Fri: 9:00 AM - 6:00 PM";

const HERO_BADGES = ["Quick replies", "Trusted guidance", "Friendly support"];

const QUICK_NOTES = [
  "Replies within one business day in most cases",
  "Support for buyers, renters, owners, and agents",
  "Clear help at every stage of your property journey",
];

const INQUIRY_OPTIONS = [
  "Buy Property",
  "Rent Property",
  "Sell Property",
  "Agent Partnership",
  "Account Support",
  "General Inquiry",
] as const;

const fadeUp: Variants = {
  hidden: { opacity: 1, y: 0 },
  show: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * index,
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const contactItems = [
  {
    icon: MapPin,
    label: "Address",
    value: SUPPORT_ADDRESS,
    href: undefined,
  },
  {
    icon: PhoneCall,
    label: "Phone",
    value: SUPPORT_PHONE,
    href: `tel:${SUPPORT_PHONE}`,
  },
  {
    icon: Mail,
    label: "Email",
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
  },
  {
    icon: Clock3,
    label: "Hours",
    value: CONTACT_HOURS,
    href: undefined,
  },
];

type InquiryType = (typeof INQUIRY_OPTIONS)[number];

type FormState = {
  name: string;
  email: string;
  phone: string;
  inquiryType: InquiryType | "";
  subject: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  inquiryType: "",
  subject: "",
  message: "",
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return /^[0-9+\-\s()]{7,20}$/.test(phone);
}

function validateForm(values: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Please enter your full name.";
  }

  if (!values.email.trim()) {
    errors.email = "Please enter your email address.";
  } else if (!isValidEmail(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!values.phone.trim()) {
    errors.phone = "Please enter your phone number.";
  } else if (!isValidPhone(values.phone.trim())) {
    errors.phone = "Please enter a valid phone number.";
  }

  if (!values.inquiryType) {
    errors.inquiryType = "Please select an inquiry type.";
  }

  if (!values.subject.trim()) {
    errors.subject = "Please enter a subject.";
  } else if (values.subject.trim().length < 4) {
    errors.subject = "Subject should be at least 4 characters.";
  }

  if (!values.message.trim()) {
    errors.message = "Please write your message.";
  } else if (values.message.trim().length < 12) {
    errors.message = "Message should be at least 12 characters.";
  }

  return errors;
}

export default function ContactPage() {
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState("");
  const [submitError, setSubmitError] = React.useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    if (submitSuccess) setSubmitSuccess("");
    if (submitError) setSubmitError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess("");
    setSubmitError("");

    try {
      const API_BASE =
        (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          "http://localhost:5000"
        ).replace(/\/+$/, "");

      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          inquiryType: form.inquiryType,
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Failed to send your message.");
      }

      setSubmitSuccess("Your message has been sent successfully.");
      setForm(INITIAL_FORM);
      setErrors({});
    } catch (error: any) {
      setSubmitError(
        error?.message ||
          "Something went wrong while sending your message. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PublicSiteHeader />

      <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,_#f6fbf8_0%,_#ffffff_24%,_#ffffff_100%)] text-slate-900">
        <section className="relative border-b border-emerald-100/70">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_35%),radial-gradient(circle_at_20%_35%,_rgba(56,189,248,0.08),_transparent_22%),linear-gradient(180deg,_#f2fbf7_0%,_#ffffff_78%)]" />

          <motion.div
            aria-hidden="true"
            animate={{ y: [0, -18, 0], opacity: [0.45, 0.7, 0.45] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-[-6rem] top-24 h-52 w-52 rounded-full bg-emerald-200/50 blur-3xl"
          />

          <motion.div
            aria-hidden="true"
            animate={{ y: [0, 24, 0], x: [0, -12, 0], opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-[-4rem] top-10 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl"
          />

          <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-12 text-center sm:px-8 sm:pb-18 sm:pt-14 lg:px-12 lg:pb-20 lg:pt-16">
            <motion.h1
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mx-auto max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl"
            >
              {CONTACT_TITLE}
            </motion.h1>

            <motion.p
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg"
            >
              {CONTACT_SUBTITLE}
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
            >
              {HERO_BADGES.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur sm:text-sm sm:normal-case sm:tracking-normal"
                >
                  {badge}
                </span>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-8 sm:pb-18 sm:pt-10 lg:px-12 lg:pb-20 lg:pt-12">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="max-w-lg"
            >
              <span className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800 sm:text-sm sm:normal-case sm:tracking-normal">
                Reach the team directly
              </span>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                Get in Touch
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                Need help with a listing, account issue, rental question, or property search?
                Our team is here with direct answers and fast follow-up.
              </p>

              <div className="mt-8 grid gap-3">
                {QUICK_NOTES.map((note, index) => (
                  <motion.div
                    key={note}
                    custom={index + 1}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.3 }}
                    whileHover={{ x: 6 }}
                    className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white/80 px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.04)] backdrop-blur"
                  >
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <p className="text-sm font-medium leading-6 text-slate-700">{note}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10 space-y-4">
                {contactItems.map(({ icon: Icon, label, value, href }, index) => (
                  <motion.div
                    key={label}
                    custom={index + 2}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.22 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className="group rounded-[24px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)] backdrop-blur transition-colors hover:border-emerald-200 hover:bg-white"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 transition duration-300 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white">
                        <Icon className="h-6 w-6" strokeWidth={2} />
                      </div>

                      <div className="pt-1">
                        <h3 className="text-base font-semibold leading-none text-slate-950 sm:text-lg">
                          {label}
                        </h3>

                        {href ? (
                          <a
                            href={href}
                            className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-emerald-700 sm:text-base"
                          >
                            {value}
                            <ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                          </a>
                        ) : (
                          <p className="mt-3 text-sm text-slate-600 sm:text-base">{value}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.18 }}
              whileHover={{ y: -4 }}
              className="relative rounded-[32px] border border-slate-200/80 bg-white/90 p-7 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-10"
            >
              <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent" />

              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
                  Contact Form
                </p>

                <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
                  Send us a message
                </h3>

                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                  Share your details below and we&apos;ll get back to you with the right next step.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                <div className="grid gap-6 md:grid-cols-2">
                  <motion.div whileHover={{ y: -2 }} className="block">
                    <label
                      htmlFor="name"
                      className="mb-3 block text-sm font-semibold text-slate-950 sm:text-base"
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "name-error" : undefined}
                      className={`h-14 w-full rounded-2xl border bg-white px-4 text-base text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${
                        errors.name ? "border-red-300" : "border-slate-200"
                      }`}
                    />
                    {errors.name ? (
                      <p id="name-error" className="mt-2 text-sm text-red-600">
                        {errors.name}
                      </p>
                    ) : null}
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="block">
                    <label
                      htmlFor="email"
                      className="mb-3 block text-sm font-semibold text-slate-950 sm:text-base"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@email.com"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      className={`h-14 w-full rounded-2xl border bg-white px-4 text-base text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${
                        errors.email ? "border-red-300" : "border-slate-200"
                      }`}
                    />
                    {errors.email ? (
                      <p id="email-error" className="mt-2 text-sm text-red-600">
                        {errors.email}
                      </p>
                    ) : null}
                  </motion.div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <motion.div whileHover={{ y: -2 }} className="block">
                    <label
                      htmlFor="phone"
                      className="mb-3 block text-sm font-semibold text-slate-950 sm:text-base"
                    >
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="98XXXXXXXX"
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? "phone-error" : undefined}
                      className={`h-14 w-full rounded-2xl border bg-white px-4 text-base text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${
                        errors.phone ? "border-red-300" : "border-slate-200"
                      }`}
                    />
                    {errors.phone ? (
                      <p id="phone-error" className="mt-2 text-sm text-red-600">
                        {errors.phone}
                      </p>
                    ) : null}
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="block">
                    <label
                      htmlFor="inquiryType"
                      className="mb-3 block text-sm font-semibold text-slate-950 sm:text-base"
                    >
                      Inquiry Type
                    </label>
                    <select
                      id="inquiryType"
                      name="inquiryType"
                      value={form.inquiryType}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.inquiryType)}
                      aria-describedby={errors.inquiryType ? "inquiry-error" : undefined}
                      className={`h-14 w-full rounded-2xl border bg-white px-4 text-base text-slate-800 outline-none transition duration-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${
                        errors.inquiryType ? "border-red-300" : "border-slate-200"
                      }`}
                    >
                      <option value="">Select inquiry type</option>
                      {INQUIRY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.inquiryType ? (
                      <p id="inquiry-error" className="mt-2 text-sm text-red-600">
                        {errors.inquiryType}
                      </p>
                    ) : null}
                  </motion.div>
                </div>

                <motion.div whileHover={{ y: -2 }} className="block">
                  <label
                    htmlFor="subject"
                    className="mb-3 block text-sm font-semibold text-slate-950 sm:text-base"
                  >
                    Subject
                  </label>
                  <input
                    id="subject"
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="Tell us what you need help with"
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={errors.subject ? "subject-error" : undefined}
                    className={`h-14 w-full rounded-2xl border bg-white px-4 text-base text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${
                      errors.subject ? "border-red-300" : "border-slate-200"
                    }`}
                  />
                  {errors.subject ? (
                    <p id="subject-error" className="mt-2 text-sm text-red-600">
                      {errors.subject}
                    </p>
                  ) : null}
                </motion.div>

                <motion.div whileHover={{ y: -2 }} className="block">
                  <label
                    htmlFor="message"
                    className="mb-3 block text-sm font-semibold text-slate-950 sm:text-base"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Write your message here and include any property, area, or service details that matter."
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? "message-error" : undefined}
                    className={`min-h-[180px] w-full rounded-2xl border bg-white px-4 py-4 text-base text-slate-800 outline-none transition duration-300 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${
                      errors.message ? "border-red-300" : "border-slate-200"
                    }`}
                  />
                  {errors.message ? (
                    <p id="message-error" className="mt-2 text-sm text-red-600">
                      {errors.message}
                    </p>
                  ) : null}
                </motion.div>

                {submitSuccess ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {submitSuccess}
                  </div>
                ) : null}

                {submitError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {submitError}
                  </div>
                ) : null}

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  disabled={isSubmitting}
                  className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 text-base font-semibold text-white shadow-[0_16px_40px_rgba(16,185,129,0.28)] transition hover:from-emerald-700 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-70 sm:text-lg"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </motion.button>
              </form>
            </motion.div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </>
  );
}
