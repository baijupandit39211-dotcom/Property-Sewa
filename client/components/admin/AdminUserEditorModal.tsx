"use client";

import * as React from "react";

export type AdminUserEditorValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  bio: string;
};

type Props = {
  open: boolean;
  loading?: boolean;
  initialValues: AdminUserEditorValues;
  onClose: () => void;
  onSubmit: (values: AdminUserEditorValues) => void | Promise<void>;
};

function emptyToString(value?: string) {
  return value || "";
}

export default function AdminUserEditorModal({
  open,
  loading,
  initialValues,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = React.useState<AdminUserEditorValues>(initialValues);

  React.useEffect(() => {
    if (!open) return;
    setValues({
      name: emptyToString(initialValues.name),
      email: emptyToString(initialValues.email),
      phone: emptyToString(initialValues.phone),
      address: emptyToString(initialValues.address),
      company: emptyToString(initialValues.company),
      bio: emptyToString(initialValues.bio),
    });
  }, [initialValues, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.4)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-xl font-bold text-slate-900">Edit user</h3>
          <p className="mt-1 text-sm text-slate-500">
            Update the account profile details used in the admin directory.
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(values);
          }}
          className="space-y-5 px-6 py-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Full name
              </span>
              <input
                value={values.name}
                onChange={(event) =>
                  setValues((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="User name"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Email
              </span>
              <input
                type="email"
                required
                value={values.email}
                onChange={(event) =>
                  setValues((current) => ({ ...current, email: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="email@example.com"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Phone
              </span>
              <input
                value={values.phone}
                onChange={(event) =>
                  setValues((current) => ({ ...current, phone: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="Phone number"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Company
              </span>
              <input
                value={values.company}
                onChange={(event) =>
                  setValues((current) => ({ ...current, company: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="Agency or company"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Address
            </span>
            <input
              value={values.address}
              onChange={(event) =>
                setValues((current) => ({ ...current, address: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="Address"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Bio
            </span>
            <textarea
              rows={4}
              value={values.bio}
              onChange={(event) =>
                setValues((current) => ({ ...current, bio: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="Short profile summary"
            />
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-70"
            >
              {loading ? "Saving..." : "Confirm changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
