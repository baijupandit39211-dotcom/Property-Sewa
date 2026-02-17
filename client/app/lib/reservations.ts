import { apiFetch } from "@/app/lib/api";

export type CodReservationPayload = {
  propertyId: string;
  fullName: string;
  phone: string;
  message?: string;
  preferredVisitDate?: string | null;
};

export async function reserveCod(payload: CodReservationPayload) {
  return apiFetch<{ success?: boolean; data?: any; message?: string }>("/api/reservations/cod", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
