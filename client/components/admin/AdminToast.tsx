"use client";

type Props = {
  show: boolean;
  message: string;
  tone?: "success" | "error";
};

export default function AdminToast({
  show,
  message,
  tone = "success",
}: Props) {
  const colors =
    tone === "success"
      ? "bg-emerald-600 text-white ring-emerald-500/40"
      : "bg-rose-600 text-white ring-rose-500/40";

  return (
    <div
      className={[
        "fixed right-6 top-6 z-[9999] transition-all duration-200",
        show ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <div
        className={[
          "rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ring-1",
          colors,
        ].join(" ")}
      >
        {message}
      </div>
    </div>
  );
}
