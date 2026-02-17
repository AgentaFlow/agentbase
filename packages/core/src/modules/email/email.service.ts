import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get('SMTP_HOST');
    if (host) {
      this.transporter = createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<number>('SMTP_PORT', 587) === 465,
        auth: {
          user: this.config.get('SMTP_USER'),
          pass: this.config.get('SMTP_PASSWORD'),
        },
      });
      this.logger.log(`Email service configured: ${host}:${this.config.get('SMTP_PORT', 587)}`);
    } else {
      this.logger.warn('No SMTP_HOST configured — emails will be logged to console');
    }
  }

  async send(options: EmailOptions): Promise<boolean> {
    const from = this.config.get('EMAIL_FROM', 'noreply@agentbase.dev');

    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      this.logger.debug(`[DEV EMAIL] Body: ${options.text || options.html.slice(0, 200)}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: `Agentbase <${from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Email failed to ${options.to}: ${err.message}`);
      return false;
    }
  }

  // --- Template helpers ---

  async sendWelcome(email: string, name: string) {
    return this.send({
      to: email,
      subject: 'Welcome to Agentbase',
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Welcome to Agentbase!</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Your account is ready. You can start building AI applications right away.</p>
          <a href="${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/dashboard"
             style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Go to Dashboard
          </a>
          <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">— The Agentbase Team</p>
        </div>
      `,
    });
  }

  async sendPasswordReset(email: string, resetToken: string) {
    const resetUrl = `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
    return this.send({
      to: email,
      subject: 'Reset your Agentbase password',
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset</h2>
          <p>You requested a password reset. Click the button below to choose a new password:</p>
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
          <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">
            This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  }

  async sendUsageWarning(email: string, resource: string, percent: number) {
    return this.send({
      to: email,
      subject: `Agentbase: ${resource} usage at ${percent}%`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #F59E0B;">Usage Warning</h2>
          <p>Your ${resource} usage has reached <strong>${percent}%</strong> of your plan limit.</p>
          <p>Consider upgrading your plan to avoid service interruption.</p>
          <a href="${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/dashboard/billing"
             style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
            View Plans
          </a>
        </div>
      `,
    });
  }

  async sendSubscriptionChanged(email: string, plan: string, action: 'upgraded' | 'downgraded' | 'canceled') {
    return this.send({
      to: email,
      subject: `Agentbase: Subscription ${action}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Subscription ${action.charAt(0).toUpperCase() + action.slice(1)}</h2>
          <p>Your subscription has been ${action}. ${action !== 'canceled' ? `Your new plan is <strong>${plan}</strong>.` : ''}</p>
          <a href="${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/dashboard/billing"
             style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
            View Billing
          </a>
        </div>
      `,
    });
  }
}
