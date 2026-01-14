/**
 * Email Service for Cloud Functions
 *
 * This service handles sending email notifications.
 * It uses Firestore as a queue that can be processed by:
 * - Firebase Extension: Trigger Email from Firestore
 * - Custom email sending function (if configured)
 */

import {
  onDocumentCreated,
  FirestoreEvent,
  QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { NotificationType } from "../notifications";

const db = getFirestore();

// Note: For direct SendGrid integration, add:
// import { defineSecret } from "firebase-functions/params";
// const sendgridApiKey = defineSecret("SENDGRID_API_KEY");

/**
 * Email template types
 */
type EmailTemplate =
  | "application_submitted"
  | "application_status_change"
  | "document_requested"
  | "application_approved"
  | "application_rejected"
  | "welcome";

/**
 * Email queue document structure
 * Compatible with Firebase "Trigger Email" extension
 */
interface EmailQueueDocument {
  to: string | string[];
  from?: string;
  replyTo?: string;
  message: {
    subject: string;
    text?: string;
    html?: string;
  };
  template?: {
    name: EmailTemplate;
    data: Record<string, unknown>;
  };
  createdAt: Timestamp;
  delivery?: {
    state: string;
    attempts: number;
    error?: string;
    endTime?: Timestamp;
  };
}

/**
 * Email content configuration
 */
const EMAIL_TEMPLATES: Record<EmailTemplate, {
  subject: (data: Record<string, unknown>) => string;
  text: (data: Record<string, unknown>) => string;
  html: (data: Record<string, unknown>) => string;
}> = {
  application_submitted: {
    subject: (data) =>
      `Application ${data.applicationNumber} Submitted Successfully`,
    text: (data) => `
Dear ${data.applicantName},

Your Zakat application (${data.applicationNumber}) has been successfully submitted.

What happens next:
1. Your application will be reviewed by our team
2. You may be contacted if additional documents are needed
3. You will be notified of the decision via email

You can check your application status at any time by logging into your account.

Thank you for your application.

Best regards,
Zakat Management Team
    `.trim(),
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header {
      background-color: #1a56db;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 0 0 8px 8px;
    }
    .highlight {
      background-color: #e0e7ff;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .steps {
      background-color: white;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .steps li { margin: 10px 0; }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Submitted</h1>
    </div>
    <div class="content">
      <p>Dear ${data.applicantName},</p>
      <div class="highlight">
        <p><strong>Your Zakat application (${data.applicationNumber})
        has been successfully submitted.</strong></p>
      </div>
      <div class="steps">
        <h3>What happens next:</h3>
        <ol>
          <li>Your application will be reviewed by our team</li>
          <li>You may be contacted if additional documents are needed</li>
          <li>You will be notified of the decision via email</li>
        </ol>
      </div>
      <p>You can check your application status at any time.</p>
      <p>Thank you for your application.</p>
      <p>Best regards,<br>Zakat Management Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },

  application_status_change: {
    subject: (data) =>
      `Application ${data.applicationNumber} Status Update: ${data.newStatus}`,
    text: (data) => `
Dear ${data.applicantName},

Your Zakat application (${data.applicationNumber}) status has been updated.

Previous Status: ${data.previousStatus}
New Status: ${data.newStatus}

${data.message || ""}

Please log in to your account to view more details.

Best regards,
Zakat Management Team
    `.trim(),
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header {
      background-color: #1a56db;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 0 0 8px 8px;
    }
    .status-box {
      background-color: #fef3c7;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      border-left: 4px solid #f59e0b;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Status Update</h1>
    </div>
    <div class="content">
      <p>Dear ${data.applicantName},</p>
      <p>Your Zakat application <strong>(${data.applicationNumber})</strong>
      status has been updated.</p>
      <div class="status-box">
        <p><strong>Previous Status:</strong> ${data.previousStatus}</p>
        <p><strong>New Status:</strong> ${data.newStatus}</p>
      </div>
      ${data.message ? `<p>${data.message}</p>` : ""}
      <p>Please log in to your account to view more details.</p>
      <p>Best regards,<br>Zakat Management Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },

  document_requested: {
    subject: (data) =>
      `Action Required: Documents Needed for Application ${data.applicationNumber}`,
    text: (data) => `
Dear ${data.applicantName},

Additional documents are needed for your Zakat application (${data.applicationNumber}).

Documents Requested:
${data.documentTypes}

${data.message || "Please upload these documents as soon as possible."}

Please log in to your account to upload the required documents.

Best regards,
Zakat Management Team
    `.trim(),
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header {
      background-color: #dc2626;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 0 0 8px 8px;
    }
    .alert-box {
      background-color: #fef2f2;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      border-left: 4px solid #dc2626;
    }
    .cta-button {
      display: inline-block;
      background-color: #1a56db;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 15px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Action Required</h1>
    </div>
    <div class="content">
      <p>Dear ${data.applicantName},</p>
      <div class="alert-box">
        <p><strong>Additional documents are needed for your application
        (${data.applicationNumber}).</strong></p>
      </div>
      <h3>Documents Requested:</h3>
      <p>${data.documentTypes}</p>
      <p>${data.message || "Please upload these documents as soon as possible."}</p>
      <p>Please log in to your account to upload the required documents.</p>
      <p>Best regards,<br>Zakat Management Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },

  application_approved: {
    subject: (data) =>
      `Congratulations! Application ${data.applicationNumber} Approved`,
    text: (data) => `
Dear ${data.applicantName},

Great news! Your Zakat application (${data.applicationNumber}) has been approved.

${data.amountApproved ? `Approved Amount: $${data.amountApproved}` : ""}

${data.message || "You will receive further instructions about disbursement."}

Thank you for your patience during the review process.

Best regards,
Zakat Management Team
    `.trim(),
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header {
      background-color: #059669;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 0 0 8px 8px;
    }
    .success-box {
      background-color: #d1fae5;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      border-left: 4px solid #059669;
      text-align: center;
    }
    .amount { font-size: 24px; font-weight: bold; color: #059669; }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Approved!</h1>
    </div>
    <div class="content">
      <p>Dear ${data.applicantName},</p>
      <div class="success-box">
        <p><strong>Great news! Your application (${data.applicationNumber})
        has been approved.</strong></p>
        ${data.amountApproved ? `<p class="amount">$${data.amountApproved}</p>` : ""}
      </div>
      <p>${data.message || "You will receive further instructions about disbursement."}</p>
      <p>Thank you for your patience during the review process.</p>
      <p>Best regards,<br>Zakat Management Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },

  application_rejected: {
    subject: (data) =>
      `Application ${data.applicationNumber} - Decision Update`,
    text: (data) => `
Dear ${data.applicantName},

Thank you for submitting your Zakat application (${data.applicationNumber}).

After careful review, we regret to inform you that your application has not been approved at this time.

${data.reason ? `Reason: ${data.reason}` : ""}

${data.message || "You may reapply after 6 months if your circumstances change."}

If you have questions about this decision, please contact us.

Best regards,
Zakat Management Team
    `.trim(),
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header {
      background-color: #6b7280;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 0 0 8px 8px;
    }
    .info-box {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
      border-left: 4px solid #6b7280;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Decision</h1>
    </div>
    <div class="content">
      <p>Dear ${data.applicantName},</p>
      <p>Thank you for submitting your Zakat application
      <strong>(${data.applicationNumber})</strong>.</p>
      <div class="info-box">
        <p>After careful review, we regret to inform you that your
        application has not been approved at this time.</p>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
      </div>
      <p>${data.message || "You may reapply after 6 months if circumstances change."}</p>
      <p>If you have questions about this decision, please contact us.</p>
      <p>Best regards,<br>Zakat Management Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },

  welcome: {
    subject: () => "Welcome to Zakat Management Platform",
    text: (data) => `
Dear ${data.name},

Welcome to the Zakat Management Platform!

Your account has been successfully created. You can now:
- Apply for Zakat assistance
- Track your application status
- Upload required documents
- Receive updates on your application

Log in to get started.

Best regards,
Zakat Management Team
    `.trim(),
    html: (data) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header {
      background-color: #1a56db;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 0 0 8px 8px;
    }
    .feature-list {
      background-color: white;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .feature-list li { margin: 10px 0; }
    .cta-button {
      display: inline-block;
      background-color: #1a56db;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 15px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome!</h1>
    </div>
    <div class="content">
      <p>Dear ${data.name},</p>
      <p>Welcome to the <strong>Zakat Management Platform</strong>!</p>
      <p>Your account has been successfully created. You can now:</p>
      <div class="feature-list">
        <ul>
          <li>Apply for Zakat assistance</li>
          <li>Track your application status</li>
          <li>Upload required documents</li>
          <li>Receive updates on your application</li>
        </ul>
      </div>
      <p>Best regards,<br>Zakat Management Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },
};

/**
 * Queue an email for sending
 */
export async function queueEmail(
  to: string | string[],
  template: EmailTemplate,
  data: Record<string, unknown>,
  options: {
    from?: string;
    replyTo?: string;
  } = {}
): Promise<string> {
  const templateConfig = EMAIL_TEMPLATES[template];

  if (!templateConfig) {
    throw new Error(`Unknown email template: ${template}`);
  }

  const emailDoc: EmailQueueDocument = {
    to,
    from: options.from || "noreply@zakatplatform.org",
    replyTo: options.replyTo,
    message: {
      subject: templateConfig.subject(data),
      text: templateConfig.text(data),
      html: templateConfig.html(data),
    },
    template: {
      name: template,
      data,
    },
    createdAt: Timestamp.now(),
  };

  const docRef = await db.collection("mail").add(emailDoc);
  logger.info(`Email queued: ${docRef.id}`, { template, to });

  return docRef.id;
}

/**
 * Map notification type to email template
 */
function getEmailTemplateForNotificationType(
  type: NotificationType
): EmailTemplate | null {
  switch (type) {
  case "application_submitted":
    return "application_submitted";
  case "status_update":
    return "application_status_change";
  case "document_requested":
    return "document_requested";
  case "application_approved":
    return "application_approved";
  case "application_rejected":
    return "application_rejected";
  default:
    return null;
  }
}

/**
 * Trigger: Send email when notification is created
 * Listens for new notifications and queues appropriate emails
 */
export const onNotificationCreated = onDocumentCreated(
  "notifications/{notificationId}",
  async (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, { notificationId: string }>
  ) => {
    const notification = event.data?.data();

    if (!notification) {
      logger.warn("No notification data found");
      return;
    }

    const { userId, type, title, message, applicationId } = notification;

    // Determine if this notification type should trigger an email
    const emailTemplate = getEmailTemplateForNotificationType(type);

    if (!emailTemplate) {
      logger.info(`No email template for notification type: ${type}`);
      return;
    }

    // Get user's email
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      logger.warn(`User not found: ${userId}`);
      return;
    }

    const user = userDoc.data();
    if (!user?.email) {
      logger.warn(`User has no email: ${userId}`);
      return;
    }

    // Check user's email preferences (if they exist)
    if (user.emailPreferences?.disableAll) {
      logger.info(`User has disabled all emails: ${userId}`);
      return;
    }

    // Get application data if needed
    let applicationData: Record<string, unknown> = {};
    if (applicationId) {
      const appDoc = await db
        .collection("applications")
        .doc(applicationId)
        .get();
      if (appDoc.exists) {
        const app = appDoc.data();
        applicationData = {
          applicationNumber: app?.applicationNumber,
          amountApproved: app?.resolution?.amountApproved,
          reason: app?.resolution?.rejectionReason,
        };
      }
    }

    // Queue the email
    try {
      await queueEmail(user.email, emailTemplate, {
        applicantName: `${user.firstName} ${user.lastName}`,
        title,
        message,
        ...applicationData,
      });

      logger.info(`Email queued for notification: ${event.params.notificationId}`);
    } catch (error) {
      logger.error("Failed to queue email:", error);
    }
  }
);

/**
 * Send welcome email when user is created
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  await queueEmail(email, "welcome", { name });
}
