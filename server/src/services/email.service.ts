// ✅ FILE: server/src/services/email.service.ts
import nodemailer from "nodemailer";

function mustEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function boolEnv(key: string, fallback: boolean) {
  const v = process.env[key];
  if (v == null) return fallback;
  return v === "true" || v === "1";
}

function numEnv(key: string, fallback: number) {
  const v = process.env[key];
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.MAIL_HOST || "smtp.gmail.com";
  const port = numEnv("MAIL_PORT", 465);
  const secure = boolEnv("MAIL_SECURE", true);

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: mustEnv("MAIL_USER"),
      pass: mustEnv("MAIL_PASS"),
    },
  });

  return transporter;
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendWelcomeEmail(args: {
  to: string;
  name?: string;
  dashboardUrl?: string;
}) {
  const t = getTransporter();

  const fromName = process.env.MAIL_FROM_NAME || "Property Sewa";
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER || "";
  if (!fromEmail) throw new Error("Missing env: MAIL_FROM_EMAIL (or MAIL_USER)");

  const name = args.name?.trim() ? escapeHtml(args.name.trim()) : "there";
  const dashboardUrl =
    args.dashboardUrl ||
    process.env.APP_DASHBOARD_URL ||
    "http://localhost:3000/dashboard";

  const subject = "Welcome to Property Sewa 🎉";

  const text = `Welcome to Property Sewa!

Hello ${args.name?.trim() || "there"},

Thanks for registering with Property Sewa. Your account has been successfully created.

Go to your dashboard: ${dashboardUrl}

If you did not create this account, please contact support.

— Team Property Sewa
`;

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
    <div style="max-width: 620px; margin: 0 auto; background:#fff; border:1px solid #e9e9ef; border-radius: 12px; overflow:hidden;">
      <div style="padding:18px 22px; background:#0f172a; color:#fff;">
        <div style="font-weight:700; font-size:18px;">Property Sewa</div>
        <div style="opacity:.85; font-size:13px; margin-top:2px;">Buy • Sell • Rent with confidence</div>
      </div>
      <div style="padding:22px;">
        <h2 style="margin:0 0 10px; font-size:20px; color:#0f172a;">Welcome, ${name}!</h2>
        <p style="margin:0 0 14px; color:#334155; line-height:1.6;">
          Thanks for registering with Property Sewa. Your account has been successfully created.
        </p>

        <ul style="margin:0 0 18px 18px; color:#334155; line-height:1.6;">
          <li>Explore verified property listings</li>
          <li>Use smart search & filters</li>
          <li>Save favorites and contact securely</li>
        </ul>

        <a href="${dashboardUrl}" style="display:inline-block; background:#16a34a; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:600;">
          Go to Dashboard
        </a>

        <p style="margin:18px 0 0; color:#64748b; font-size:13px; line-height:1.6;">
          If you did not create this account, please contact support.
        </p>
      </div>
      <div style="padding:14px 22px; background:#f8fafc; color:#64748b; font-size:12px;">
        You received this email because you signed up on Property Sewa.
      </div>
    </div>
  </div>
  `;

  const info = await t.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: args.to,
    subject,
    text,
    html,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("✅ Welcome email sent:", {
      to: args.to,
      messageId: info.messageId,
    });
  }
}

// ✅ NEW: Reset Password Email
export async function sendResetPasswordEmail(args: {
  to: string;
  name?: string;
  resetUrl: string;
  expiresMinutes?: number;
}) {
  const t = getTransporter();

  const fromName = process.env.MAIL_FROM_NAME || "Property Sewa";
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER || "";
  if (!fromEmail) throw new Error("Missing env: MAIL_FROM_EMAIL (or MAIL_USER)");

  const safeName = args.name?.trim() ? escapeHtml(args.name.trim()) : "there";
  const resetUrl = args.resetUrl;
  const expires = args.expiresMinutes ?? Number(process.env.RESET_PASSWORD_EXPIRES_MIN || 15);

  const subject = "Reset your Property Sewa password";

  const text = `Hello ${args.name?.trim() || "there"},

We received a request to reset your Property Sewa password.

Reset link (expires in ${expires} minutes):
${resetUrl}

If you didn't request this, ignore this email.

— Team Property Sewa
`;

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7fb; padding:24px;">
    <div style="max-width: 620px; margin: 0 auto; background:#fff; border:1px solid #e9e9ef; border-radius: 12px; overflow:hidden;">
      <div style="padding:18px 22px; background:#0f172a; color:#fff;">
        <div style="font-weight:700; font-size:18px;">Property Sewa</div>
        <div style="opacity:.85; font-size:13px; margin-top:2px;">Password reset</div>
      </div>
      <div style="padding:22px;">
        <h2 style="margin:0 0 10px; font-size:20px; color:#0f172a;">Hi, ${safeName}</h2>
        <p style="margin:0 0 14px; color:#334155; line-height:1.6;">
          We received a request to reset your password.
        </p>

        <a href="${resetUrl}" style="display:inline-block; background:#16a34a; color:#fff; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:700;">
          Reset Password
        </a>

        <p style="margin:14px 0 0; color:#64748b; font-size:13px; line-height:1.6;">
          This link expires in ${expires} minutes. If you didn’t request this, you can ignore this email.
        </p>

        <p style="margin:14px 0 0; color:#64748b; font-size:12px; line-height:1.6;">
          If the button doesn't work, copy this link:
          <br />
          <span style="word-break:break-all;">${escapeHtml(resetUrl)}</span>
        </p>
      </div>

      <div style="padding:14px 22px; background:#f8fafc; color:#64748b; font-size:12px;">
        Security notice: we never ask for your password by email.
      </div>
    </div>
  </div>
  `;

  const info = await t.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: args.to,
    subject,
    text,
    html,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("✅ Reset email sent:", { to: args.to, messageId: info.messageId });
  }
}
