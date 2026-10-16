const path = require('path');
const fs = require('fs');

/**
 * Return local logo attachment for inline email embedding (CID)
 */
const getLogoAttachment = () => {
    const localLogoPath = path.join(__dirname, '../assets/logo-dark.png');
    if (fs.existsSync(localLogoPath)) {
        return [
            {
                filename: 'attendance-shield-logo.png',
                path: localLogoPath,
                cid: 'attendance_shield_logo'
            }
        ];
    }
    return [];
};

/**
 * Common wrapper styling for consistent, enterprise-grade emails without emojis
 */
const renderEmailLayout = ({ title, content, footerNote = '' }) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                        <!-- Header with Brand Logo -->
                        <tr>
                            <td align="center" style="padding: 36px 32px 24px; border-bottom: 1px solid #f1f5f9;">
                                <img src="cid:attendance_shield_logo" alt="Attendance Shield" style="height: 40px; width: auto; display: block;" />
                            </td>
                        </tr>

                        <!-- Main Body Content -->
                        <tr>
                            <td style="padding: 32px 36px;">
                                ${content}
                            </td>
                        </tr>

                        <!-- Professional Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 22px 36px; text-align: center; border-top: 1px solid #f1f5f9;">
                                ${footerNote ? `<p style="margin: 0 0 8px; font-size: 11px; color: #94a3b8; line-height: 1.4;">${footerNote}</p>` : ''}
                                <p style="margin: 0; font-size: 11px; color: #94a3b8; letter-spacing: 0.02em;">
                                    &copy; ${new Date().getFullYear()} Attendance Shield Platform. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

/**
 * 1. Signup OTP Verification Email
 */
const getSignupOtpEmail = ({ name, otp }) => {
    const displayName = name ? name.trim().split(' ')[0] : 'there';

    const content = `
        <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center; letter-spacing: -0.01em;">
            Verify Your Email Address
        </h1>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #64748b; text-align: center;">
            Hi ${displayName}, use the verification code below to complete your registration on Attendance Shield.
        </p>

        <!-- OTP Code Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
            <tr>
                <td align="center">
                    <div style="display: inline-block; padding: 16px 32px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #0f172a; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;">
                        ${otp}
                    </div>
                </td>
            </tr>
        </table>

        <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.6; color: #64748b; text-align: center;">
            This verification code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
        </p>
        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
            If you did not attempt to sign up for an Attendance Shield account, you can safely ignore this email.
        </p>
    `;

    return renderEmailLayout({
        title: 'Verify Your Email Address',
        content
    });
};

/**
 * 2. Welcome Email (Professional, Clean, Zero Emojis)
 */
const getWelcomeEmail = ({ name, email }) => {
    const displayName = name ? name.trim().split(' ')[0] : 'there';
    const clientUrl = process.env.CLIENT_URL || 'https://localhost:5173';
    const dashboardUrl = `${clientUrl}/app/dashboard`;

    const content = `
        <h1 style="margin: 0 0 12px; font-size: 21px; font-weight: 700; color: #0f172a; text-align: center; letter-spacing: -0.01em;">
            Welcome to Attendance Shield, ${displayName}
        </h1>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #64748b; text-align: center;">
            Your account has been successfully verified and created. You are now ready to launch and manage your organization's attendance workspaces.
        </p>

        <!-- Features list (Professional typography, no emojis) -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0 28px; background-color: #f8fafc; border-radius: 12px; padding: 18px 20px; border: 1px solid #e2e8f0;">
            <tr>
                <td style="padding-bottom: 14px;">
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">
                        Workspace Management
                    </div>
                    <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                        Create organizations, configure academic batches and terms, and manage member enrollments.
                    </div>
                </td>
            </tr>
            <tr>
                <td style="padding-bottom: 14px;">
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">
                        Anti-Proxy Verification
                    </div>
                    <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                        Host dynamic QR code sessions with real-time rotation, device validation, and GPS geofencing.
                    </div>
                </td>
            </tr>
            <tr>
                <td>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">
                        Audit-Ready Reporting
                    </div>
                    <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                        Generate formal, audit-compliant PDF attendance reports with 1-click administrative exports.
                    </div>
                </td>
            </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <a href="${dashboardUrl}" style="background-color: #0f172a; color: #ffffff; padding: 13px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                        Go to Dashboard
                    </a>
                </td>
            </tr>
        </table>
    `;

    return renderEmailLayout({
        title: 'Welcome to Attendance Shield',
        content,
        footerNote: `Signed in as: <strong>${email}</strong>`
    });
};

/**
 * 3. Password Reset OTP Email (Forgot Password & Settings)
 */
const getPasswordResetOtpEmail = ({ name, otp }) => {
    const displayName = name ? name.trim().split(' ')[0] : 'there';

    const content = `
        <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center; letter-spacing: -0.01em;">
            Password Reset Code
        </h1>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #64748b; text-align: center;">
            Hi ${displayName}, we received a request to reset the password for your Attendance Shield account. Use the code below to complete the request:
        </p>

        <!-- OTP Code Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
            <tr>
                <td align="center">
                    <div style="display: inline-block; padding: 16px 32px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #0f172a; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;">
                        ${otp}
                    </div>
                </td>
            </tr>
        </table>

        <p style="margin: 0 0 10px; font-size: 13px; line-height: 1.6; color: #64748b; text-align: center;">
            This verification code is valid for <strong>10 minutes</strong>.
        </p>
        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
            If you did not request a password reset, please ignore this email. Your account remains secure and no changes have been made.
        </p>
    `;

    return renderEmailLayout({
        title: 'Attendance Shield - Password Reset Code',
        content
    });
};

/**
 * 4. Password Successfully Changed Email
 */
const getPasswordChangedEmail = ({ name, email }) => {
    const displayName = name ? name.trim().split(' ')[0] : 'there';
    const clientUrl = process.env.CLIENT_URL || 'https://localhost:5173';
    const loginUrl = `${clientUrl}/login`;

    const content = `
        <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center; letter-spacing: -0.01em;">
            Password Changed Successfully
        </h1>
        <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #64748b; text-align: center;">
            Hi ${displayName}, the password for your Attendance Shield account has been updated successfully.
        </p>

        <!-- Security Notice Box -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 24px 0 28px; text-align: left;">
            <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">
                Account Security Notice
            </div>
            <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                If you initiated this change, no further action is necessary.<br/>
                If you did not request or make this change, please reset your password immediately or contact your administrator.
            </div>
        </div>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <a href="${loginUrl}" style="background-color: #0f172a; color: #ffffff; padding: 13px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                        Sign In to Your Account
                    </a>
                </td>
            </tr>
        </table>
    `;

    return renderEmailLayout({
        title: 'Attendance Shield - Password Changed',
        content,
        footerNote: `Account: <strong>${email}</strong>`
    });
};

/**
 * 5. Organization Invitation Email
 */
const getOrganizationInvitationEmail = ({ orgName, role, inviteLink }) => {
    const roleDisplay = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'Instructor';

    const content = `
        <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center; letter-spacing: -0.01em;">
            Organization Invitation
        </h1>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #64748b; text-align: center;">
            You have been invited to join <strong>${orgName}</strong> on the Attendance Shield platform.
        </p>

        <!-- Invitation Details Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0 28px; background-color: #f8fafc; border-radius: 12px; padding: 18px 20px; border: 1px solid #e2e8f0;">
            <tr>
                <td style="padding-bottom: 8px;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b;">Organization</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${orgName}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div style="font-size: 12px; font-weight: 600; color: #64748b;">Assigned Role</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${roleDisplay}</div>
                </td>
            </tr>
        </table>

        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
            <tr>
                <td align="center">
                    <a href="${inviteLink}" style="background-color: #0f172a; color: #ffffff; padding: 13px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                        Accept Invitation
                    </a>
                </td>
            </tr>
        </table>

        <p style="margin: 0 0 8px; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
            This invitation link is valid for 7 days.
        </p>
        <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #94a3b8; text-align: center; word-break: break-all;">
            If the button above does not work, copy and paste this link into your browser:<br/>
            <a href="${inviteLink}" style="color: #475569; text-decoration: underline;">${inviteLink}</a>
        </p>
    `;

    return renderEmailLayout({
        title: `Invitation to join ${orgName}`,
        content
    });
};

module.exports = {
    getLogoAttachment,
    getSignupOtpEmail,
    getWelcomeEmail,
    getPasswordResetOtpEmail,
    getPasswordChangedEmail,
    getOrganizationInvitationEmail
};
