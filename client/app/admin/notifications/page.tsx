"use client";

import NotificationsPageContent from "@/components/notifications/NotificationsPageContent";

export default function AdminNotificationsPage() {
  return (
    <NotificationsPageContent
      roleLabel="Admin"
      endpointBase="/api/admin/notifications"
      authMode="admin"
    />
  );
}
