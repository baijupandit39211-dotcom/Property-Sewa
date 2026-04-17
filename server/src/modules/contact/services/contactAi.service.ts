import ContactMessage from "../../../models/ContactMessage.model";
import { ApiError } from "../../../utils/apiError";
import { logger } from "../../../utils/logger";

type AiReplyResult = {
  subject: string;
  draft: string;
  model: string;
  fallback: boolean;
  fallbackReason?: string;
};

function normalizeDraftLines(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function buildFallbackDraft(contact: {
  name?: string;
  inquiryType?: string;
  subject?: string;
  message?: string;
}) {
  const name = String(contact.name || "").trim() || "there";
  const inquiryType = String(contact.inquiryType || "").trim().toLowerCase();

  let supportLine =
    "Thank you for reaching out to Property Sewa. We have reviewed your message and our team will get back to you shortly with the right next steps.";

  if (inquiryType.includes("buy")) {
    supportLine =
      "Thank you for contacting Property Sewa about buying a property. We have reviewed your message and our team will follow up shortly with the most relevant guidance.";
  } else if (inquiryType.includes("rent")) {
    supportLine =
      "Thank you for contacting Property Sewa about renting a property. We have reviewed your message and our team will get back to you shortly with the next steps.";
  } else if (inquiryType.includes("sell")) {
    supportLine =
      "Thank you for contacting Property Sewa about selling a property. We have reviewed your message and our team will follow up shortly with the right assistance.";
  } else if (inquiryType.includes("support")) {
    supportLine =
      "Thank you for reaching out to Property Sewa support. We have reviewed your message and our team will work on it and get back to you shortly.";
  }

  const subject = String(contact.subject || "").trim();
  const contextLine = subject
    ? `We have noted your inquiry regarding "${subject}" and will respond with more details as soon as possible.`
    : "We have noted your inquiry and will respond with more details as soon as possible.";

  return normalizeDraftLines(
    `Hello ${name},

${supportLine}

${contextLine}

If you would like to share any additional details in the meantime, please reply to this email and we will be happy to assist you further.

Best regards,
Property Sewa Team`
  );
}

export async function generateContactReplyDraft(contactId: string): Promise<AiReplyResult> {
  const cleanContactId = String(contactId || "").trim();
  if (!cleanContactId) {
    throw new ApiError(400, "Contact message id is required.");
  }

  const contact = await ContactMessage.findById(cleanContactId).lean();
  if (!contact) {
    throw new ApiError(404, "Contact message not found.");
  }

  const fallbackDraft = buildFallbackDraft(contact);
  const replySubject = `Re: ${contact.subject}`;

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return {
      subject: replySubject,
      draft: fallbackDraft,
      model: "rule_based",
      fallback: true,
      fallbackReason: "OPENAI_API_KEY is not configured.",
    };
  }

  const model =
    String(process.env.OPENAI_CONTACT_REPLY_MODEL || "").trim() ||
    String(process.env.OPENAI_SMART_REPLY_MODEL || "").trim() ||
    "gpt-4.1-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "You write concise, polished customer support email replies for Property Sewa. Write one strong, human-sounding reply. Keep it professional, warm, and practical. Do not use markdown, bullet points, placeholders, or exaggerated claims. Do not promise unavailable actions. Return only the reply body text.",
          },
          {
            role: "user",
            content: [
              `Customer name: ${contact.name || "Customer"}`,
              `Customer email: ${contact.email || ""}`,
              `Inquiry type: ${contact.inquiryType || ""}`,
              `Original subject: ${contact.subject || ""}`,
              `Current status: ${contact.status || "new"}`,
              contact.lastReplySubject ? `Last admin reply subject: ${contact.lastReplySubject}` : "",
              `Customer message:\n${contact.message || ""}`,
              "Write a helpful response from the Property Sewa team.",
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
        max_output_tokens: 260,
      }),
    });

    if (!response.ok) {
      const rawError = await response.text().catch(() => "");
      throw new Error(`OpenAI request failed with status ${response.status}.${rawError ? ` ${rawError}` : ""}`);
    }

    const data = (await response.json()) as { output_text?: string };
    const draft = normalizeDraftLines(String(data.output_text || ""));

    if (!draft) {
      throw new Error("AI reply generation returned an empty draft.");
    }

    return {
      subject: replySubject,
      draft,
      model,
      fallback: false,
    };
  } catch (error: any) {
    const fallbackReason =
      error instanceof Error ? error.message : "Unknown AI provider error";

    logger.error("Falling back to rule-based contact AI reply draft:", {
      contactId: cleanContactId,
      model,
      fallbackReason,
    });

    return {
      subject: replySubject,
      draft: fallbackDraft,
      model: "rule_based",
      fallback: true,
      fallbackReason,
    };
  }
}
