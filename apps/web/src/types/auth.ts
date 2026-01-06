export type UserRole = "BUYER" | "SELLER" | "ADMIN";

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	avatarUrl?: string;
}
