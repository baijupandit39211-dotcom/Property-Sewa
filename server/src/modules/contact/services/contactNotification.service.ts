import User from "../../../models/User.model";
import notificationService from "../../notifications/services/notification.services";
import { logger } from "../../../utils/logger";

type ContactNotificationInput = {
  contactId: string;
  name: string;
  email: string;
  inquiryType: string;
  subject: string;
};

export async function createAdminContactNotifications(input: ContactNotificationInput) {
  const admins = await User.find({
    role: { $in: ["admin", "superadmin"] },
    status: { $nin: ["suspended", "inactive", "archived"] },
  })
    .select("_id")
    .lean();

  if (!admins.length) {
    logger.warn("No active admins found for contact notification", {
      contactId: input.contactId,
    });
    return [];
  }

  return notificationService.createBulkNotifications(
    admins.map((admin) => ({
      recipientId: String(admin._id),
      recipientRole: "admin",
      type: "contact.created",
      category: "contact",
      title: `New contact from ${input.name}`,
      body: `${input.inquiryType}: ${input.subject}`,
      entityType: "contact_message",
      entityId: input.contactId,
      link: `/admin/contact-messages?contactId=${input.contactId}`,
      priority: "high",
      data: {
        contactId: input.contactId,
        senderName: input.name,
        senderEmail: input.email,
        inquiryType: input.inquiryType,
        subject: input.subject,
      },
    }))
  );
}
