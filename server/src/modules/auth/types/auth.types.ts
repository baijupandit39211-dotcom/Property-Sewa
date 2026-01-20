export type Role = "buyer" | "seller" | "agent" | "admin" | "superadmin";

export type RegisterInput = {
  name?: string;
  email?: string;
  password?: string;
  address?: string;
  phone?: string;
  role?: Role; // buyer/seller/agent/admin allowed in register
};

export type LoginInput = {
  email?: string;
  password?: string;
};

export type GoogleLoginInput = {
  credential?: string;
  role?: Role; // Include role for Google signup
};

export type ChangePasswordInput = {
  currentPassword?: string;
  newPassword?: string;
};
