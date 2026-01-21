// Rate limiting storage (in-memory for simplicity)
const emailRateLimit = new Map<string, { count: number; lastSent: number }>();

// Check if email can be sent (rate limit: 1 email per lead every 5 minutes)
const canSendEmail = (leadId: string): boolean => {
  const now = Date.now();
  const rateLimit = emailRateLimit.get(leadId);
  
  if (!rateLimit) {
    emailRateLimit.set(leadId, { count: 1, lastSent: now });
    return true;
  }
  
  const timeSinceLastEmail = now - rateLimit.lastSent;
  const fiveMinutesInMs = 5 * 60 * 1000;
  
  if (timeSinceLastEmail < fiveMinutesInMs && rateLimit.count >= 1) {
    return false;
  }
  
  if (timeSinceLastEmail >= fiveMinutesInMs) {
    emailRateLimit.set(leadId, { count: 1, lastSent: now });
    return true;
  }
  
  emailRateLimit.set(leadId, { count: rateLimit.count + 1, lastSent: now });
  return false;
};

// Send email notification for new message
export const sendNewMessageNotification = async ({ to, subject, body, leadId }: {
  to: string;
  subject: string;
  body: string;
  leadId?: string;
}) => {
  try {
    // Check rate limiting if leadId is provided
    if (leadId && !canSendEmail(leadId)) {
      return;
    }

    // Check email configuration
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return;
    }

    // Lazy load nodemailer only when needed
    const nodemailer = require('nodemailer');
    
    // Create transporter with error handling
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: body,
    });
    
  } catch (error) {
    // Silent failure - never throw errors
  }
};

export default {
  sendNewMessageNotification,
};
