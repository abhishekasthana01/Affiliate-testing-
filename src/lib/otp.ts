import { prisma } from './prisma';
import crypto from 'crypto';

export class OTPService {
  // Generate a cryptographically secure 6-digit OTP
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Generate and send OTP via email
  async sendOTP(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return {
          success: false,
          message: 'No account found with this email address'
        };
      }

      // Check user status
      if (user.status === 'PENDING') {
        return {
          success: false,
          message: 'Your account is pending approval. Please wait for admin activation.'
        };
      }
      if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
        return {
          success: false,
          message: 'Your account is not active. Please contact support.'
        };
      }

      const isDev = process.env.NODE_ENV === 'development';
      
      // Check for recent OTP attempts (rate limiting) - ONLY IN PRODUCTION
      if (!isDev) {
        const recentOTP = await (prisma as any).oTP.findFirst({
          where: {
            email: email.toLowerCase(),
            createdAt: {
              gte: new Date(Date.now() - 60000) // Within last minute
            }
          }
        });

        if (recentOTP) {
          return {
            success: false,
            message: 'Please wait 1 minute before requesting another OTP'
          };
        }
      }

      // Invalidate any existing unused OTPs for this email
      await (prisma as any).oTP.updateMany({
        where: {
          email: email.toLowerCase(),
          isUsed: false
        },
        data: {
          isUsed: true
        }
      });

      // Generate new OTP
      const code = this.generateOTP();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour for dev/testing

      // Store OTP in database
      await (prisma as any).oTP.create({
        data: {
          email: email.toLowerCase(),
          code,
          expiresAt
        }
      });

      // Send OTP email
      const hasMailerConfig = process.env.SMTP_HOST && 
                             process.env.SMTP_USER && 
                             process.env.SMTP_PASS;

      if (!hasMailerConfig) {
        if (isDev) {
          console.log('-----------------------------------------');
          console.log(`DEV MODE: OTP for ${email} is ${code}`);
          console.log('-----------------------------------------');
          
          return {
            success: true,
            message: 'OTP logged to console (Dev Mode)'
          };
        } else {
          return {
            success: false,
            message: 'Email service not configured'
          };
        }
      }

      const { mailer } = await import('./email');
      const path = await import('path');
      const logoPath = path.join(process.cwd(), 'public', 'images', 'beamlogo.png');

      const emailResult = await mailer.send({
        to: email,
        subject: 'Your Login Code',
        html: this.generateOTPEmailTemplate(code, user.name || 'User'),
        attachments: [
          {
            filename: 'beamlogo.png',
            path: logoPath,
            cid: 'beamlogo'
          }
        ]
      });

      return {
        success: true,
        message: 'OTP sent successfully to your email'
      };

    } catch (error: any) {
      console.error('Error sending OTP:', error);
      return {
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? `Error: ${error.message || 'Unknown error'}` 
          : 'An error occurred while sending OTP'
      };
    }
  }

  // Verify OTP and return user if valid
  async verifyOTP(email: string, code: string): Promise<{
    success: boolean;
    user?: any;
    message: string;
  }> {
    try {
      // Find the OTP
      const otp = await (prisma as any).oTP.findFirst({
        where: {
          email: email.toLowerCase(),
          code,
          isUsed: false,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (!otp) {
        // Increment attempts for any existing OTP
        await (prisma as any).oTP.updateMany({
          where: {
            email: email.toLowerCase(),
            code,
            isUsed: false
          },
          data: {
            attempts: {
              increment: 1
            }
          }
        });

        return {
          success: false,
          message: 'Invalid or expired OTP'
        };
      }

      // Check attempts limit
      if (otp.attempts >= 3) {
        await (prisma as any).oTP.update({
          where: { id: otp.id },
          data: { isUsed: true }
        });

        return {
          success: false,
          message: 'Too many invalid attempts. Please request a new OTP.'
        };
      }

      // Mark OTP as used
      await (prisma as any).oTP.update({
        where: { id: otp.id },
        data: { isUsed: true }
      });

      // Get user details
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          affiliate: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      return {
        success: true,
        user,
        message: 'OTP verified successfully'
      };

    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: process.env.NODE_ENV === 'development'
          ? `Error: ${error.message || 'Unknown error'}`
          : 'An error occurred while verifying OTP'
      };
    }
  }

  // Clean up expired OTPs (should be run periodically)
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      await (prisma as any).oTP.deleteMany({
        where: {
          OR: [
            {
              expiresAt: {
                lt: new Date()
              }
            },
            {
              isUsed: true,
              createdAt: {
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours old
              }
            }
          ]
        }
      });
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  // Generate OTP email template using Beam brand guidelines
  private generateOTPEmailTemplate(code: string, name: string): string {
    const accentColor = '#ff2069'; // Beam Pink
    const brandColor = '#ff2069'; // Beam Pink
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
        .content { padding: 40px 30px; text-align: center; }
        h1 { color: ${brandColor}; font-size: 26px; font-weight: 800; margin-top: 0; margin-bottom: 10px; }
        .otp-container { background-color: #f9fafb; padding: 40px; border-radius: 16px; border: 2px dashed ${brandColor}40; margin: 30px 0; }
        .otp-code { font-size: 48px; font-weight: 800; letter-spacing: 12px; color: ${accentColor}; margin: 0; line-height: 1; }
        .footer { text-align: center; padding: 30px; color: ${black}; opacity: 0.6; font-size: 12px; background-color: #f9fafb; }
        .affiliate-summary { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eef2f3; text-align: left; }
        .affiliate-summary p { font-size: 14px; color: ${black}; opacity: 0.7; font-style: italic; }
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
          <h1>Login Verification</h1>
          <p style="font-size: 16px; margin-bottom: 0;">Hello ${name},</p>
          <p style="font-size: 16px; margin-top: 5px; opacity: 0.8;">Use the code below to securely sign in to your Beam dashboard.</p>
          <div class="otp-container">
            <p class="otp-code">${code}</p>
          </div>
          <p style="font-size: 14px; opacity: 0.7;">This code will expire in 60 minutes. If you didn't request this, please ignore this email.</p>
          
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
}

export const otpService = new OTPService();