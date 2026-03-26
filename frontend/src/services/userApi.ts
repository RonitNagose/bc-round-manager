import { apiFetch } from "../lib/http";

export type UserRole = "admin" | "member";

export type AdminUser = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
};

export async function createAdminUser(
  token: string,
  input: { name: string; phone: string; password: string; role: UserRole },
) {
  return apiFetch<{ user: AdminUser }>("/api/admin/users", {
    method: "POST",
    token,
    body: input,
  });
}

export async function listAdminUsers(token: string) {
  return apiFetch<{ users: AdminUser[] }>("/api/admin/users", { token });
}

