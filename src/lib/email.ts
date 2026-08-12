import nodemailer from 'nodemailer';
import path from 'path';

// Initialize Nodemailer transporter
let transporterInstance: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporterInstance) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error('SMTP environment variables are not fully set');
    }

    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }
  return transporterInstance;
}

export const mailer = {
  async send(params: { to: string; subject: string; html: string; from?: string; attachments?: any[] }) {
    const transporter = getTransporter();
    const from = params.from || process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || 'Beam Affiliate <noreply@beamaffiliate.com>';

    try {
      const info = await transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Nodemailer send error:', error);
      throw error;
    }
  }
};

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface TeamInvitationData {
  name: string;
  email: string;
  role: string;
  invitedBy: string;
  inviteUrl: string;
}

export interface WelcomeEmailData {
  name: string;
  email: string;
  role: 'affiliate' | 'admin';
  loginUrl: string;
  password?: string;
  resellerId?: string;
  referralCode?: string;
}

export interface ReferralNotificationData {
  affiliateName: string;
  leadName: string;
  leadEmail: string;
  company?: string;
  estimatedValue?: number;
}

export interface ApprovalEmailData {
  affiliateName: string;
  referralId: string;
  leadName: string;
  commissionAmount: number;
  status: 'approved' | 'rejected';
  notes?: string;
}

export interface PayoutNotificationData {
  affiliateName: string;
  affiliateEmail: string;
  amount: number;
  method: 'bank_csv' | 'stripe_connect';
  processingDate: string;
}

export interface ConversionNotificationData {
  affiliateName: string;
  affiliateEmail: string;
  leadName: string;
  leadEmail: string;
  company?: string;
  convertedAmountCents: number;
  commissionCents: number;
}

export interface CommissionNotificationData {
  affiliateName: string;
  affiliateEmail: string;
  customerName: string;
  amountCents: number;
  commissionCents: number;
  commissionRate: number;
  transactionId: string;
}

export interface PaymentConfirmationEmailData {
  customerName: string;
  customerEmail: string;
  productName: string;
  amountCents: number;
  paymentMethod: string;
  reference: string;
}

export interface TransactionCreatedData {
  affiliateName: string;
  customerName: string;
  amountCents: number;
  commissionCents: number;
  commissionRate: number;
  transactionId: string;
}

export interface PayoutCreatedData {
  affiliateName: string;
  amountCents: number;
  commissionCount: number;
  payoutId: string;
  method: string;
}

export interface PayoutCompletedData {
  affiliateName: string;
  amountCents: number;
  payoutId: string;
  method: string;
  processedAt: string;
  commissionCount?: number;
}

class EmailService {
  private defaultFrom = process.env.SMTP_FROM || 'beam <noreply@beamwallet.com>';

  /** Escape HTML special characters to prevent XSS in email templates */
  private escapeHtml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async getCurrencySymbol(): Promise<string> {
    const { getCurrencySymbol } = await import('./currency');
    return await getCurrencySymbol();
  }

  private formatAmount(cents: number, symbol: string): string {
    const { formatCurrency } = require('./currency');
    return formatCurrency(cents, symbol);
  }

  private getBaseTemplate(content: string, brandColor: string = '#ff2069'): string {
    const black = '#000000';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Nunito', Arial, sans-serif; line-height: 1.6; color: ${black}; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7f8; }
        .wrapper { background-color: #ffffff; margin: 20px auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(6, 48, 58, 0.08); }
        .header { background-color: ${black}; padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0; }
        .logo-container { display: inline-block; text-align: center; text-decoration: none; }
        .logo-img { height: 48px; width: auto; display: block; margin: 0 auto; }
        .content { padding: 40px 30px; }
        .affiliate-summary { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eef2f3; }
        .affiliate-summary p { font-size: 14px; color: ${black}; opacity: 0.7; font-style: italic; }
        h1 { color: ${brandColor}; font-size: 22px; font-weight: 800; margin-top: 0; }
        h2 { color: ${brandColor}; font-size: 18px; font-weight: 700; margin-top: 0; }
        p { margin-bottom: 16px; color: ${black}; opacity: 0.9; }
        .button { display: inline-block; background-color: ${brandColor}; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 20px 0; text-align: center; }
        .footer { text-align: center; padding: 30px; color: ${black}; opacity: 0.6; font-size: 12px; background-color: #f9fafb; }
        .summary-card { background: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin: 20px 0; }
        .summary-title { font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; color: ${brandColor}; margin-bottom: 12px; display: block; }
        .summary-item { margin-bottom: 8px; }
        .summary-label { font-size: 11px; font-weight: 600; color: ${black}; opacity: 0.6; display: block; }
        .summary-value { font-size: 14px; font-weight: 700; color: ${black}; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="logo-container">
            <img src="cid:beamlogo" alt="Beam Logo" class="logo-img" height="48">
          </div>
        </div>
        <div class="content">
          ${content}
          <div class="affiliate-summary">
            <p><strong>About Beam Affiliate:</strong> Our partner program empowers businesses and individuals to earn rewards by referring high-quality leads. Track your performance, manage commissions, and grow with Beam.</p>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Beam. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private async getTemplateFromDb(type: string) {
    try {
      const { prisma } = await import('./prisma');
      return await prisma.emailTemplate.findFirst({
        where: { type: type as any, isActive: true }
      });
    } catch (error) {
      console.error(`Failed to fetch email template ${type}:`, error);
      return null;
    }
  }

  private replaceVariables(content: string, variables: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  async sendTeamInvitationEmail(data: TeamInvitationData): Promise<{ success: boolean; message: string }> {
    const content = `
      <h1>You've been invited to join the team! 🤝</h1>
      <p>Hello ${this.escapeHtml(data.name)},</p>
      <p>You have been invited by <strong>${this.escapeHtml(data.invitedBy)}</strong> to join the admin dashboard as a <strong>${data.role}</strong>.</p>
      
      <div class="summary-card">
        <span class="summary-title">Invitation Details</span>
        <div class="summary-item">
          <span class="summary-label">Role</span>
          <span class="summary-value">${data.role}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Invited By</span>
          <span class="summary-value">${this.escapeHtml(data.invitedBy)}</span>
        </div>
      </div>
      
      <p>Click the button below to accept the invitation and set up your account.</p>
      <a href="${data.inviteUrl}" class="button">Accept Invitation</a>
      
      <p style="font-size: 12px; opacity: 0.7; margin-top: 20px;">If you didn't expect this invitation, you can safely ignore this email.</p>
    `;

    return this.sendEmail({ 
      to: data.email, 
      subject: `Invitation to join the team on Beam Affiliate Program`, 
      html: this.getBaseTemplate(content) 
    });
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; message: string }> {
    const dashboardUrl = data.loginUrl;
    const safeName = this.escapeHtml(data.name);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7fa;padding:30px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="background:#06303A;padding:40px 30px;">
              <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:bold;">
                Welcome to Beam 🚀
              </h1>
              <p style="margin:12px 0 0;color:#c8d6da;font-size:16px;line-height:1.5;">
                Your affiliate journey starts here.
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:40px 35px 10px 35px;color:#333333;">

              <p style="margin:0 0 20px;font-size:16px;line-height:1.8;">
                Hi <strong>${safeName}</strong>,
              </p>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#555555;">
                Thank you for joining the <strong>Beam Affiliate Program</strong>.
                We're excited to have you as part of our growing community of partners.
              </p>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#555555;">
                Your dashboard is now ready, where you can:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:25px;">
                <tr>
                  <td style="padding:6px 0;font-size:15px;color:#444444;">
                    ✅ Track referrals &amp; commissions
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:15px;color:#444444;">
                    ✅ Access your affiliate links
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:15px;color:#444444;">
                    ✅ Monitor performance analytics
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:15px;color:#444444;">
                    ✅ Manage payouts and rewards
                  </td>
                </tr>
              </table>

              ${data.referralCode ? `
              <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#555555;">
                Your referral code: <strong style="color:#FF2069;">${this.escapeHtml(data.referralCode)}</strong>
              </p>` : ''}

            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:10px 35px 40px 35px;">
              <a href="${dashboardUrl}"
                 style="background:#FF2069;
                        color:#ffffff;
                        text-decoration:none;
                        padding:15px 34px;
                        border-radius:8px;
                        font-size:15px;
                        font-weight:bold;
                        display:inline-block;
                        box-shadow:0 4px 12px rgba(255,32,105,0.25);">
                Open Dashboard
              </a>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding:0 35px 35px 35px;">
              <div style="background:#f8fafc;border-radius:10px;padding:18px;">
                <p style="margin:0;font-size:14px;line-height:1.7;color:#666666;">
                  Need help getting started? Our team is always here to support you.
                  Simply reply to this email and we'll assist you.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background:#fafafa;padding:25px 20px;border-top:1px solid #eeeeee;">
              <p style="margin:0 0 8px;font-size:13px;color:#777777;">
                &copy; ${new Date().getFullYear()} Beam. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#aaaaaa;">
                Beam Affiliate Program
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

    return this.sendEmail({ to: data.email, subject: 'Welcome to Beam 🚀', html });
  }


  async sendTransactionCreatedEmail(to: string, data: TransactionCreatedData): Promise<{ success: boolean; message: string }> {
    const symbol = await this.getCurrencySymbol();
    const content = `
      <h1>New Transaction Recorded! 📈</h1>
      <p>Hello ${this.escapeHtml(data.affiliateName)},</p>
      <p>A new transaction from <strong>${this.escapeHtml(data.customerName)}</strong> has been recorded and is currently pending validation.</p>
      
      <div class="summary-card">
        <span class="summary-title">Transaction Summary</span>
        <div class="summary-item">
          <span class="summary-label">Sale Amount</span>
          <span class="summary-value">${this.formatAmount(data.amountCents, symbol)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Estimated Commission</span>
          <span class="summary-value" style="color: #10b981;">${this.formatAmount(data.commissionCents, symbol)} (${data.commissionRate}%)</span>
        </div>
      </div>
      
      <p>Once the payment is fully validated, your commission will be confirmed.</p>
    `;

    return this.sendEmail({ to, subject: 'New Transaction Recorded', html: this.getBaseTemplate(content) });
  }

  async sendPaymentConfirmationEmail(data: PaymentConfirmationEmailData): Promise<{ success: boolean; message: string }> {
    const symbol = await this.getCurrencySymbol();
    const content = `
      <h1>Payment Confirmation</h1>
      <p>Hello ${this.escapeHtml(data.customerName)},</p>
      <p>Thank you for your purchase of <strong>${this.escapeHtml(data.productName)}</strong>.</p>
      
      <div class="summary-card">
        <span class="summary-title">Order Summary</span>
        <div class="summary-item">
          <span class="summary-label">Product</span>
          <span class="summary-value">${this.escapeHtml(data.productName)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Amount Paid</span>
          <span class="summary-value">${this.formatAmount(data.amountCents, symbol)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Method</span>
          <span class="summary-value">${this.escapeHtml(data.paymentMethod)}</span>
        </div>
      </div>
      
      <p>Order Reference: <code style="font-size: 12px; opacity: 0.7;">${this.escapeHtml(data.reference)}</code></p>
    `;

    return this.sendEmail({ to: data.customerEmail, subject: `Payment Confirmation: ${data.productName}`, html: this.getBaseTemplate(content) });
  }

  async sendPayoutCreatedEmail(to: string, data: PayoutCreatedData): Promise<{ success: boolean; message: string }> {
    const symbol = await this.getCurrencySymbol();
    const content = `
      <h1>Payout Request Created 💸</h1>
      <p>Hello ${this.escapeHtml(data.affiliateName)},</p>
      <p>A new payout request has been created for your accumulated commissions.</p>
      
      <div class="summary-card">
        <span class="summary-title">Payout Details</span>
        <div class="summary-item">
          <span class="summary-label">Amount</span>
          <span class="summary-value">${this.formatAmount(data.amountCents, symbol)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Commissions Included</span>
          <span class="summary-value">${data.commissionCount}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Method</span>
          <span class="summary-value">${data.method}</span>
        </div>
      </div>
      
      <p>Our team will review and process your payout shortly.</p>
    `;

    return this.sendEmail({ to, subject: 'Payout Request Created', html: this.getBaseTemplate(content) });
  }

  async sendPayoutCompletedEmail(to: string, data: PayoutCompletedData): Promise<{ success: boolean; message: string }> {
    const symbol = await this.getCurrencySymbol();
    const content = `
      <h1>Payout Processed 💳</h1>
      <p>Hello ${this.escapeHtml(data.affiliateName)},</p>
      <p>Great news! Your payout has been successfully processed.</p>
      
      <div class="summary-card">
        <span class="summary-title">Transaction Details</span>
        <div class="summary-item">
          <span class="summary-label">Amount</span>
          <span class="summary-value">${this.formatAmount(data.amountCents, symbol)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Method</span>
          <span class="summary-value">${data.method}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Date</span>
          <span class="summary-value">${data.processedAt}</span>
        </div>
        ${data.commissionCount ? `
        <div class="summary-item">
          <span class="summary-label">Commissions Included</span>
          <span class="summary-value">${data.commissionCount}</span>
        </div>` : ''}
      </div>
      
      <p>The funds should reach your account shortly. Thank you for being a valued partner!</p>
    `;

    return this.sendEmail({ to, subject: 'Your Payout has been Processed', html: this.getBaseTemplate(content) });
  }

  async sendGenericEmail(to: string, data: { subject: string; body: string }): Promise<{ success: boolean; message: string }> {
    const content = `
      <h1>Notification</h1>
      <p>${this.escapeHtml(data.body)}</p>
    `;

    return this.sendEmail({ to, subject: data.subject, html: this.getBaseTemplate(content) });
  }

  async sendCustomEmail(to: string, subject: string, html: string): Promise<{ success: boolean; message: string }> {
    return this.sendEmail({ to, subject, html });
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'beamlogo.png');
      
      await mailer.send({
        to: params.to,
        subject: params.subject,
        html: params.html,
        from: this.defaultFrom,
        attachments: [
          {
            filename: 'beamlogo.png',
            path: logoPath,
            cid: 'beamlogo'
          }
        ]
      });

      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, message: 'Failed to send email' };
    }
  }

  private async sendTemplatedEmail(params: {
    to: string;
    templateType: string;
    fallbackSubject: string;
    variables: Record<string, any>;
    generateFallbackHtml: () => Promise<string> | string;
  }): Promise<{ success: boolean; message: string }> {
    const dbTemplate = await this.getTemplateFromDb(params.templateType);

    let subject = params.fallbackSubject;
    let html = '';

    if (dbTemplate) {
      subject = this.replaceVariables(dbTemplate.subject, params.variables);
      html = this.replaceVariables(dbTemplate.body, params.variables);
    } else {
      html = await Promise.resolve(params.generateFallbackHtml());
    }

    return this.sendEmail({
      to: params.to,
      subject,
      html,
    });
  }

  async sendReferralNotification(to: string, data: ReferralNotificationData): Promise<{ success: boolean; message: string }> {
    const content = `
      <h1>New Lead Submitted</h1>
      <p>Partner <strong>${this.escapeHtml(data.affiliateName)}</strong> has submitted a new referral:</p>
      
      <div class="summary-card">
        <span class="summary-title">Lead Details</span>
        <div class="summary-item">
          <span class="summary-label">Name</span>
          <span class="summary-value">${this.escapeHtml(data.leadName)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Email</span>
          <span class="summary-value">${this.escapeHtml(data.leadEmail)}</span>
        </div>
        ${data.company ? `
        <div class="summary-item">
          <span class="summary-label">Company</span>
          <span class="summary-value">${this.escapeHtml(data.company)}</span>
        </div>` : ''}
        ${data.estimatedValue ? `
        <div class="summary-item">
          <span class="summary-label">Estimated Value</span>
          <span class="summary-value">€${data.estimatedValue}</span>
        </div>` : ''}
      </div>
      <p>Please review this lead in your admin dashboard.</p>
    `;

    return this.sendEmail({ to, subject: 'New Referral Submitted', html: this.getBaseTemplate(content) });
  }

  async sendReferralApprovalEmail(to: string, data: ApprovalEmailData): Promise<{ success: boolean; message: string }> {
    const symbol = await this.getCurrencySymbol();
    const isApproved = data.status === 'approved';
    const brandColor = isApproved ? '#10b981' : '#ef4444';

    const content = `
      <h1>Lead ${isApproved ? 'Approved' : 'Rejected'}</h1>
      <p>Hello ${this.escapeHtml(data.affiliateName)},</p>
      <p>Your referral for <strong>${this.escapeHtml(data.leadName)}</strong> has been ${data.status}.</p>
      
      ${isApproved ? `
      <div class="summary-card">
        <span class="summary-title">Commission Summary</span>
        <div class="summary-item">
          <span class="summary-label">Earned Amount</span>
          <span class="summary-value">${this.formatAmount(data.commissionAmount, symbol)}</span>
        </div>
      </div>
      ` : ''}
      
      ${data.notes ? `
      <div style="background: #fff5f5; padding: 15px; border-radius: 8px; border: 1px solid #feb2b2; margin: 15px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #c53030; text-transform: uppercase;">Admin Notes</span>
        <p style="margin: 5px 0 0 0; font-size: 14px;">${this.escapeHtml(data.notes)}</p>
      </div>
      ` : ''}
      
      <p>Login to your dashboard to see more details.</p>
    `;

    return this.sendEmail({ 
      to, 
      subject: `Referral ${isApproved ? 'Approved' : 'Rejected'}: ${data.leadName}`, 
      html: this.getBaseTemplate(content, brandColor)
    });
  }

  async sendCommissionNotification(to: string, data: CommissionNotificationData): Promise<{ success: boolean; message: string }> {
    const symbol = await this.getCurrencySymbol();
    const content = `
      <h1>New Commission! 💰</h1>
      <p>Hello ${this.escapeHtml(data.affiliateName)},</p>
      <p>You have earned a new commission from a purchase by <strong>${this.escapeHtml(data.customerName)}</strong>.</p>
      
      <div class="summary-card">
        <span class="summary-title">Commission Details</span>
        <div class="summary-item">
          <span class="summary-label">Sale Amount</span>
          <span class="summary-value">${this.formatAmount(data.amountCents, symbol)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Commission Rate</span>
          <span class="summary-value">${data.commissionRate}%</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Your Earnings</span>
          <span class="summary-value" style="color: #10b981;">${this.formatAmount(data.commissionCents, symbol)}</span>
        </div>
      </div>
      
      <p>Transaction ID: <code style="font-size: 12px; opacity: 0.7;">${data.transactionId}</code></p>
    `;

    return this.sendEmail({ to, subject: 'New Commission Earned!', html: this.getBaseTemplate(content) });
  }
}

export const emailService = new EmailService();
