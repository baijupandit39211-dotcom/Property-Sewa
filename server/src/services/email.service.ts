import nodemailer from "nodemailer";
import { logger } from "../utils/logger";

type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

type ContactEmailPayload = {
  name: string;
  email: string;
  phone: string;
  inquiryType: string;
  subject: string;
  message: string;
};

type ContactStatusEmailPayload = {
  name: string;
  email: string;
  inquiryType: string;
  subject: string;
};

type ContactReplyEmailPayload = ContactStatusEmailPayload & {
  replySubject: string;
  replyMessage: string;
};

type SendEmailArgs = {
  to: string;
  template: EmailTemplate;
  replyTo?: string;
};

let transporter: nodemailer.Transporter | null = null;

function readEnv(keys: string[], fallback = "") {
  for (const key of keys) {
    const value = process.env[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function readBoolEnv(keys: string[], fallback: boolean) {
  const value = readEnv(keys);
  if (!value) return fallback;
  return value === "true" || value === "1";
}

function readNumberEnv(keys: string[], fallback: number) {
  const value = Number(readEnv(keys));
  return Number.isFinite(value) ? value : fallback;
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFromName() {
  return readEnv(["EMAIL_FROM_NAME", "MAIL_FROM_NAME"], "Property Sewa");
}

function getFromEmail() {
  return readEnv(
    ["EMAIL_FROM", "SMTP_FROM", "MAIL_FROM_EMAIL", "SMTP_USER", "MAIL_USER"],
    ""
  );
}

function getAdminRecipient() {
  return readEnv(["EMAIL_ADMIN_TO", "CONTACT_ADMIN_EMAIL", "MAIL_ADMIN_TO"], "");
}

function getReplyToEmail() {
  return readEnv(
    ["EMAIL_REPLY_TO", "CONTACT_REPLY_TO", "SUPPORT_EMAIL", "EMAIL_FROM", "SMTP_USER", "MAIL_USER"],
    ""
  );
}

function isEmailEnabled() {
  return readBoolEnv(["EMAIL_ENABLED"], true);
}

function getTransporter() {
  if (transporter) return transporter;

  const host = readEnv(["SMTP_HOST", "MAIL_HOST"], "smtp.gmail.com");
  const port = readNumberEnv(["SMTP_PORT", "MAIL_PORT"], 465);
  const secure = readBoolEnv(["SMTP_SECURE", "MAIL_SECURE"], port === 465);
  const user = readEnv(["SMTP_USER", "MAIL_USER"], "");
  const pass = readEnv(["SMTP_PASS", "MAIL_PASS"], "");

  if (!user || !pass) {
    throw new Error("Missing SMTP credentials. Set SMTP_USER and SMTP_PASS.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

async function sendEmail(args: SendEmailArgs) {
  if (!isEmailEnabled()) {
    logger.info("Email sending skipped because EMAIL_ENABLED is false.", {
      to: args.to,
      subject: args.template.subject,
    });
    return;
  }

  const fromEmail = getFromEmail();
  if (!fromEmail) {
    throw new Error("Missing sender email. Set EMAIL_FROM or SMTP_USER.");
  }

  const info = await getTransporter().sendMail({
    from: `"${getFromName()}" <${fromEmail}>`,
    to: args.to,
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    subject: args.template.subject,
    text: args.template.text,
    html: args.template.html,
  });

  if (process.env.NODE_ENV !== "production") {
    logger.info("Email sent:", {
      to: args.to,
      subject: args.template.subject,
      messageId: info.messageId,
    });
  }
}

function buildWelcomeTemplate(args: {
  name?: string;
  dashboardUrl?: string;
}): EmailTemplate {
  const safeName = args.name?.trim() ? escapeHtml(args.name.trim()) : "there";
  const dashboardUrl =
    args.dashboardUrl || process.env.APP_DASHBOARD_URL || "http://localhost:3000/dashboard";

  return {
    subject: "Welcome to Property Sewa",
    text: `Welcome to Property Sewa!

Hello ${args.name?.trim() || "there"},

Thanks for registering with Property Sewa. Your account has been successfully created.

Go to your dashboard: ${dashboardUrl}

If you did not create this account, please contact support.

- Team Property Sewa
`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
        <div style="max-width:620px; margin:0 auto; background:#fff; border:1px solid #e9e9ef; border-radius:12px; overflow:hidden;">
          <div style="padding:18px 22px; background:#0f172a; color:#fff;">
            <div style="font-weight:700; font-size:18px;">Property Sewa</div>
            <div style="opacity:.85; font-size:13px; margin-top:2px;">Buy | Sell | Rent with confidence</div>
          </div>
          <div style="padding:22px;">
            <h2 style="margin:0 0 10px; font-size:20px; color:#0f172a;">Welcome, ${safeName}!</h2>
            <p style="margin:0 0 14px; color:#334155; line-height:1.6;">
              Thanks for registering with Property Sewa. Your account has been successfully created.
            </p>
            <a href="${dashboardUrl}" style="display:inline-block; background:#16a34a; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:600;">
              Go to Dashboard
            </a>
            <p style="margin:18px 0 0; color:#64748b; font-size:13px; line-height:1.6;">
              If you did not create this account, please contact support.
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

function buildResetPasswordTemplate(args: {
  name?: string;
  resetUrl: string;
  expiresMinutes?: number;
}): EmailTemplate {
  const safeName = args.name?.trim() ? escapeHtml(args.name.trim()) : "there";
  const expires = args.expiresMinutes ?? Number(process.env.RESET_PASSWORD_EXPIRES_MIN || 15);

  return {
    subject: "Reset your Property Sewa password",
    text: `Hello ${args.name?.trim() || "there"},

We received a request to reset your Property Sewa password.

Reset link (expires in ${expires} minutes):
${args.resetUrl}

If you didn't request this, ignore this email.

- Team Property Sewa
`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
        <div style="max-width:620px; margin:0 auto; background:#fff; border:1px solid #e9e9ef; border-radius:12px; overflow:hidden;">
          <div style="padding:18px 22px; background:#0f172a; color:#fff;">
            <div style="font-weight:700; font-size:18px;">Property Sewa</div>
            <div style="opacity:.85; font-size:13px; margin-top:2px;">Password reset</div>
          </div>
          <div style="padding:22px;">
            <h2 style="margin:0 0 10px; font-size:20px; color:#0f172a;">Hi, ${safeName}</h2>
            <p style="margin:0 0 14px; color:#334155; line-height:1.6;">
              We received a request to reset your password.
            </p>
            <a href="${args.resetUrl}" style="display:inline-block; background:#16a34a; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:700;">
              Reset Password
            </a>
            <p style="margin:14px 0 0; color:#64748b; font-size:13px; line-height:1.6;">
              This link expires in ${expires} minutes. If you did not request this, you can ignore this email.
            </p>
            <p style="margin:14px 0 0; color:#64748b; font-size:12px; line-height:1.6;">
              If the button does not work, copy this link:
              <br />
              <span style="word-break:break-all;">${escapeHtml(args.resetUrl)}</span>
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

function buildContactAdminTemplate(payload: ContactEmailPayload): EmailTemplate {
  const safeName = escapeHtml(payload.name);
  const safeEmail = escapeHtml(payload.email);
  const safePhone = escapeHtml(payload.phone);
  const safeInquiryType = escapeHtml(payload.inquiryType);
  const safeSubject = escapeHtml(payload.subject);
  const safeMessage = escapeHtml(payload.message).replaceAll("\n", "<br />");

  return {
    subject: `New contact form submission: ${payload.subject}`,
    text: `A new contact form has been submitted on Property Sewa.

Name: ${payload.name}
Email: ${payload.email}
Phone: ${payload.phone}
Inquiry Type: ${payload.inquiryType}
Subject: ${payload.subject}

Message:
${payload.message}
`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
        <div style="max-width:680px; margin:0 auto; background:#fff; border:1px solid #e9e9ef; border-radius:12px; overflow:hidden;">
          <div style="padding:18px 22px; background:#12392B; color:#fff;">
            <div style="font-weight:700; font-size:18px;">Property Sewa</div>
            <div style="opacity:.9; font-size:13px; margin-top:2px;">New contact form submission</div>
          </div>
          <div style="padding:22px;">
            <h2 style="margin:0 0 16px; font-size:20px; color:#0f172a;">New contact request received</h2>
            <table style="width:100%; border-collapse:collapse; font-size:14px; color:#334155;">
              <tr><td style="padding:8px 0; font-weight:700; width:140px;">Name</td><td style="padding:8px 0;">${safeName}</td></tr>
              <tr><td style="padding:8px 0; font-weight:700;">Email</td><td style="padding:8px 0;">${safeEmail}</td></tr>
              <tr><td style="padding:8px 0; font-weight:700;">Phone</td><td style="padding:8px 0;">${safePhone}</td></tr>
              <tr><td style="padding:8px 0; font-weight:700;">Inquiry Type</td><td style="padding:8px 0;">${safeInquiryType}</td></tr>
              <tr><td style="padding:8px 0; font-weight:700;">Subject</td><td style="padding:8px 0;">${safeSubject}</td></tr>
            </table>
            <div style="margin-top:18px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; padding:16px;">
              <div style="font-size:13px; font-weight:700; color:#0f172a; margin-bottom:8px;">Message</div>
              <div style="font-size:14px; line-height:1.7; color:#334155;">${safeMessage}</div>
            </div>
          </div>
        </div>
      </div>
    `,
  };
}

function buildContactConfirmationTemplate(payload: ContactEmailPayload): EmailTemplate {
  const safeName = escapeHtml(payload.name);
  const safeSubject = escapeHtml(payload.subject);
  const safeInquiryType = escapeHtml(payload.inquiryType);

  return {
    subject: "We received your message - Property Sewa",
    text: `Hello ${payload.name},

Thank you for contacting Property Sewa. We have received your message and our team will review it shortly.

Your inquiry details:
- Inquiry Type: ${payload.inquiryType}
- Subject: ${payload.subject}

We usually respond within one business day.

- Team Property Sewa
`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
        <div style="max-width:620px; margin:0 auto; background:#fff; border:1px solid #e9e9ef; border-radius:12px; overflow:hidden;">
          <div style="padding:18px 22px; background:#12392B; color:#fff;">
            <div style="font-weight:700; font-size:18px;">Property Sewa</div>
            <div style="opacity:.9; font-size:13px; margin-top:2px;">Contact confirmation</div>
          </div>
          <div style="padding:22px;">
            <h2 style="margin:0 0 10px; font-size:20px; color:#0f172a;">Thanks for reaching out, ${safeName}</h2>
            <p style="margin:0 0 14px; color:#334155; line-height:1.7;">
              We received your message and our team will review it shortly. In most cases, you can expect a reply within one business day.
            </p>
            <div style="margin-top:16px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; padding:16px;">
              <div style="font-size:13px; font-weight:700; color:#0f172a; margin-bottom:8px;">Your submission</div>
              <div style="font-size:14px; color:#334155; line-height:1.7;">
                <div><strong>Inquiry Type:</strong> ${safeInquiryType}</div>
                <div><strong>Subject:</strong> ${safeSubject}</div>
              </div>
            </div>
            <p style="margin:18px 0 0; color:#64748b; font-size:13px; line-height:1.6;">
              If you need to add more details, reply to this email or contact us again.
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

function buildContactReviewedTemplate(payload: ContactStatusEmailPayload): EmailTemplate {
  const safeName = payload.name?.trim() ? escapeHtml(payload.name.trim()) : "there";
  const safeInquiryType = escapeHtml(payload.inquiryType);
  const safeSubject = escapeHtml(payload.subject);

  return {
    subject: "Your Property Sewa message is under review",
    text: `Hello ${payload.name || "there"},

Your message has been reviewed by the Property Sewa team.

Inquiry Type: ${payload.inquiryType}
Subject: ${payload.subject}

We are checking the details and will follow up if anything else is needed.

- Team Property Sewa
`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
        <div style="max-width:620px; margin:0 auto; background:#fff; border:1px solid #e9e9ef; border-radius:12px; overflow:hidden;">
          <div style="padding:18px 22px; background:#12392B; color:#fff;">
            <div style="font-weight:700; font-size:18px;">Property Sewa</div>
            <div style="opacity:.9; font-size:13px; margin-top:2px;">Message reviewed</div>
          </div>
          <div style="padding:22px;">
            <h2 style="margin:0 0 10px; font-size:20px; color:#0f172a;">Hello, ${safeName}</h2>
            <p style="margin:0 0 14px; color:#334155; line-height:1.7;">
              Your message has been reviewed by the Property Sewa team.
            </p>
            <div style="margin-top:16px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; padding:16px;">
              <div style="font-size:14px; color:#334155; line-height:1.7;">
                <div><strong>Inquiry Type:</strong> ${safeInquiryType}</div>
                <div><strong>Subject:</strong> ${safeSubject}</div>
              </div>
            </div>
            <p style="margin:18px 0 0; color:#64748b; font-size:13px; line-height:1.6;">
              We are checking the details and will follow up if anything else is needed.
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

function buildContactResolvedTemplate(payload: ContactStatusEmailPayload): EmailTemplate {
  const safeName = payload.name?.trim() ? escapeHtml(payload.name.trim()) : "there";
  const safeInquiryType = escapeHtml(payload.inquiryType);
  const safeSubject = escapeHtml(payload.subject);

  return {
    subject: "Your Property Sewa message has been resolved",
    text: `Hello ${payload.name || "there"},

Your message has been marked as resolved by the Property Sewa team.

Inquiry Type: ${payload.inquiryType}
Subject: ${payload.subject}

If you still need help, you can reply to this email or contact us again.

- Team Property Sewa
`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
        <div style="max-width:620px; margin:0 auto; background:#fff; border:1px solid #e9e9ef; border-radius:12px; overflow:hidden;">
          <div style="padding:18px 22px; background:#12392B; color:#fff;">
            <div style="font-weight:700; font-size:18px;">Property Sewa</div>
            <div style="opacity:.9; font-size:13px; margin-top:2px;">Message resolved</div>
          </div>
          <div style="padding:22px;">
            <h2 style="margin:0 0 10px; font-size:20px; color:#0f172a;">Hello, ${safeName}</h2>
            <p style="margin:0 0 14px; color:#334155; line-height:1.7;">
              Your message has been marked as resolved by the Property Sewa team.
            </p>
            <div style="margin-top:16px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; padding:16px;">
              <div style="font-size:14px; color:#334155; line-height:1.7;">
                <div><strong>Inquiry Type:</strong> ${safeInquiryType}</div>
                <div><strong>Subject:</strong> ${safeSubject}</div>
              </div>
            </div>
            <p style="margin:18px 0 0; color:#64748b; font-size:13px; line-height:1.6;">
              If you still need help, you can reply to this email or contact us again.
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

function buildContactAdminReplyTemplate(payload: ContactReplyEmailPayload): EmailTemplate {
  const safeName = payload.name?.trim() ? escapeHtml(payload.name.trim()) : "there";
  const safeInquiryType = escapeHtml(payload.inquiryType);
  const safeOriginalSubject = escapeHtml(payload.subject);
  const safeReplySubject = escapeHtml(payload.replySubject);
  const safeReplyMessage = escapeHtml(payload.replyMessage).replaceAll("\n", "<br />");

  return {
    subject: payload.replySubject,
    text: `Hello ${payload.name || "there"},

${payload.replyMessage}

Original inquiry:
- Inquiry Type: ${payload.inquiryType}
- Subject: ${payload.subject}

- Team Property Sewa
`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
        <div style="max-width:680px; margin:0 auto; background:#fff; border:1px solid #e9e9ef; border-radius:12px; overflow:hidden;">
          <div style="padding:18px 22px; background:#12392B; color:#fff;">
            <div style="font-weight:700; font-size:18px;">Property Sewa</div>
            <div style="opacity:.9; font-size:13px; margin-top:2px;">Support reply</div>
          </div>
          <div style="padding:22px;">
            <h2 style="margin:0 0 10px; font-size:20px; color:#0f172a;">Hello, ${safeName}</h2>
            <p style="margin:0 0 8px; color:#0f172a; font-size:16px; font-weight:700;">${safeReplySubject}</p>
            <div style="margin-top:12px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc; padding:16px;">
              <div style="font-size:14px; line-height:1.8; color:#334155;">${safeReplyMessage}</div>
            </div>
            <div style="margin-top:18px; border-top:1px solid #e2e8f0; padding-top:16px;">
              <div style="font-size:13px; font-weight:700; color:#0f172a; margin-bottom:8px;">Original inquiry</div>
              <div style="font-size:14px; color:#334155; line-height:1.7;">
                <div><strong>Inquiry Type:</strong> ${safeInquiryType}</div>
                <div><strong>Subject:</strong> ${safeOriginalSubject}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  };
}

export async function sendWelcomeEmail(args: {
  to: string;
  name?: string;
  dashboardUrl?: string;
}) {
  return sendEmail({
    to: args.to,
    template: buildWelcomeTemplate(args),
  });
}

export async function sendResetPasswordEmail(args: {
  to: string;
  name?: string;
  resetUrl: string;
  expiresMinutes?: number;
}) {
  return sendEmail({
    to: args.to,
    template: buildResetPasswordTemplate(args),
  });
}

export async function sendContactAdminNotificationEmail(payload: ContactEmailPayload) {
  const adminRecipient = getAdminRecipient();
  if (!adminRecipient) {
    throw new Error("Missing admin recipient. Set EMAIL_ADMIN_TO.");
  }

  return sendEmail({
    to: adminRecipient,
    template: buildContactAdminTemplate(payload),
    replyTo: payload.email,
  });
}

export async function sendContactConfirmationEmail(payload: ContactEmailPayload) {
  return sendEmail({
    to: payload.email,
    template: buildContactConfirmationTemplate(payload),
    replyTo: getReplyToEmail() || undefined,
  });
}

export async function sendContactReviewedStatusEmail(payload: ContactStatusEmailPayload) {
  return sendEmail({
    to: payload.email,
    template: buildContactReviewedTemplate(payload),
    replyTo: getReplyToEmail() || undefined,
  });
}

export async function sendContactResolvedStatusEmail(payload: ContactStatusEmailPayload) {
  return sendEmail({
    to: payload.email,
    template: buildContactResolvedTemplate(payload),
    replyTo: getReplyToEmail() || undefined,
  });
}

export async function sendContactAdminReplyEmail(payload: ContactReplyEmailPayload) {
  return sendEmail({
    to: payload.email,
    template: buildContactAdminReplyTemplate(payload),
    replyTo: getReplyToEmail() || undefined,
  });
}
