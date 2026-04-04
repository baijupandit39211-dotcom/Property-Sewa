"use client";

import * as React from "react";

type RoleApi = "buyer" | "seller" | "agent" | "admin" | "superadmin";
type StatusApi = "active" | "archived" | "suspended";

export type AddUserValues = {
  name: string;
  email: string;
  role: RoleApi;
  status: StatusApi;
};

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: AddUserValues) => void | Promise<void>;
  allowAdminRoles?: boolean;
};

const INITIAL_VALUES: AddUserValues = {
  name: "",
  email: "",
  role: "buyer",
  status: "active",
};

export default function AddUserModal({
  open,
  loading,
  onClose,
  onSubmit,
  allowAdminRoles = false,
}: Props) {
  const [values, setValues] = React.useState<AddUserValues>(INITIAL_VALUES);

  React.useEffect(() => {
    if (!open) return;
    setValues(INITIAL_VALUES);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl overflow-hidden rounded-[24px] border border-[#cfd8d4] bg-[linear-gradient(180deg,#f7faf8_0%,#eef3f0_100%)] shadow-[0_36px_100px_-32px_rgba(15,23,42,0.55)]">
        <div className="border-b border-[#d8e1dc] bg-[linear-gradient(180deg,#fbfdfc_0%,#eff4f1_100%)] px-6 py-5">
          <h3 className="text-xl font-bold text-[#172132]">Add new user</h3>
          <p className="mt-1 text-sm text-[#55677a]">
            Create a new admin-managed account and add it to the directory.
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
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a6d80]">
                Full name
              </span>
              <input
                required
                value={values.name}
                onChange={(event) =>
                  setValues((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-[#cfd9d4] bg-white px-4 py-3 text-sm font-medium text-[#1e293b] outline-none placeholder:text-[#8b98a7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="User name"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a6d80]">
                Email
              </span>
              <input
                type="email"
                required
                value={values.email}
                onChange={(event) =>
                  setValues((current) => ({ ...current, email: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-[#cfd9d4] bg-white px-4 py-3 text-sm font-medium text-[#1e293b] outline-none placeholder:text-[#8b98a7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="email@example.com"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a6d80]">
                Role
              </span>
              <select
                value={values.role}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    role: event.target.value as RoleApi,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-[#cfd9d4] bg-white px-4 py-3 text-sm font-medium text-[#1e293b] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="agent">Agent</option>
                {allowAdminRoles ? <option value="admin">Admin</option> : null}
                {allowAdminRoles ? <option value="superadmin">SuperAdmin</option> : null}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a6d80]">
                Status
              </span>
              <select
                value={values.status}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    status: event.target.value as StatusApi,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-[#cfd9d4] bg-white px-4 py-3 text-sm font-medium text-[#1e293b] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#d8e1dc] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-[#cfd9d4] bg-white px-4 py-2 text-sm font-semibold text-[#334559] transition hover:bg-[#f2f6f4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-70"
            >
              {loading ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
