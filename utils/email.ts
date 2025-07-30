import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error('Email transporter error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

interface EmailPayload {
    to: string;
    subject: string;
    template: 'welcome_email' | 'reset_password' | 'permission_updated' | 'invite_staff' |
        'shift_reminder' | 'staff_registration_success' | 'shift_schedule_created' |
        'shift_updated' | 'shift_cancelled' | 'shift_rejected' | 'verify_email' |
        'verify_email_staff' | 'account_deleted' | 'leave_request_submitted' | 'leave_request_approved' |
        'leave_request_rejected' | 'leave_request_modified' | 'leave_assigned' | 'new_leave_request'|
        'leave_status_update' | 'notification_alert';
    context: Record<string, any>;
}

// Base email template with modern design
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hwil Email</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7fafc; line-height: 1.6;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="min-width: 100%; background-color: #f7fafc;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 48px 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Hwil</h1>
                            <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">Workforce Management Made Simple</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 48px 40px;">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 48px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                            <p style="margin: 0 0 8px; font-size: 12px; color: #718096; text-align: center;">
                                © ${new Date().getFullYear()} Hwil. All rights reserved.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #a0aec0; text-align: center;">
                                This is an automated message. Please do not reply to this email.
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

const buttonStyle = (color: 'primary' | 'success' | 'danger' = 'primary') => {
    const colors = {
        primary: { bg: '#667eea', hover: '#5a67d8' },
        success: { bg: '#48bb78', hover: '#38a169' },
        danger: { bg: '#f56565', hover: '#e53e3e' }
    };

    return `display: inline-block; padding: 14px 32px; background-color: ${colors[color].bg}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; transition: background-color 0.3s ease;`;
};

const alertBoxStyle = (type: 'info' | 'warning' | 'success' | 'danger' = 'info') => {
    const styles = {
        info: { bg: '#ebf8ff', border: '#4299e1', text: '#2b6cb0' },
        warning: { bg: '#fefcbf', border: '#ecc94b', text: '#744210' },
        success: { bg: '#f0fff4', border: '#48bb78', text: '#276749' },
        danger: { bg: '#fff5f5', border: '#f56565', text: '#c53030' }
    };

    return `background-color: ${styles[type].bg}; border-left: 4px solid ${styles[type].border}; padding: 16px 20px; margin: 24px 0; border-radius: 6px; color: ${styles[type].text};`;
};

export async function sendEmail({ to, subject, template, context }: EmailPayload) {
    let content: string;

    switch (template) {
        case 'welcome_email':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Welcome aboard, ${context.username}! 🎉</h2>
                <p style="margin: 0 0 16px; color: #4a5568; font-size: 16px;">
                    We're thrilled to have you join the Hwil community. Your manager account has been successfully created, and you're now the proud administrator of <strong style="color: #2d3748;">${context.organizationName}</strong>.
                </p>
                <div style="${alertBoxStyle('info')}">
                    <p style="margin: 0; font-weight: 600;">⚡ Action Required</p>
                    <p style="margin: 8px 0 0;">Please check your inbox for a verification email. You'll need to verify your email address before accessing your account.</p>
                </div>
                <h3 style="margin: 32px 0 16px; color: #2d3748; font-size: 18px; font-weight: 600;">What's next?</h3>
                <ul style="margin: 0 0 24px; padding-left: 24px; color: #4a5568;">
                    <li style="margin-bottom: 8px;">Verify your email address</li>
                    <li style="margin-bottom: 8px;">Set up your organization profile</li>
                    <li style="margin-bottom: 8px;">Invite your team members</li>
                    <li style="margin-bottom: 8px;">Create your first shift schedule</li>
                </ul>
                <p style="margin: 0; color: #4a5568; font-size: 16px;">
                    If you need any assistance, our support team is here to help you every step of the way.
                </p>
            `;
            break;

        case 'verify_email':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Verify Your Email Address</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, you're just one click away from accessing your Hwil account! Please verify your email address to complete your registration.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${context.verificationLink}" style="${buttonStyle('primary')}">Verify Email Address</a>
                </div>
                <p style="margin: 24px 0 16px; color: #718096; font-size: 14px; text-align: center;">
                    Or copy and paste this link into your browser:
                </p>
                <div style="background-color: #f7fafc; padding: 16px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 14px; color: #4a5568;">
                    ${context.verificationLink}
                </div>
                <div style="${alertBoxStyle('warning')}">
                    <p style="margin: 0;">This verification link will expire in <strong>1 hour</strong> for security reasons.</p>
                </div>
                <p style="margin: 24px 0 0; color: #718096; font-size: 14px;">
                    If you didn't create an account with Hwil, you can safely ignore this email.
                </p>
            `;
            break;

        case 'verify_email_staff':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Welcome to ${context.Organization}!</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, you've been invited to join the team! To access your staff account and view your schedule, please verify your email address.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${context.verificationLink}" style="${buttonStyle('success')}">Verify Email & Join Team</a>
                </div>
                <p style="margin: 24px 0 16px; color: #718096; font-size: 14px; text-align: center;">
                    Or copy and paste this link into your browser:
                </p>
                <div style="background-color: #f7fafc; padding: 16px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 14px; color: #4a5568;">
                    ${context.verificationLink}
                </div>
                <div style="${alertBoxStyle('info')}">
                    <p style="margin: 0; font-weight: 600;">What happens next?</p>
                    <p style="margin: 8px 0 0;">Once verified, you'll be able to log in, view your assigned shifts, and manage your work schedule.</p>
                </div>
                <p style="margin: 24px 0 0; color: #718096; font-size: 14px;">
                    This link expires in 1 hour. If you didn't expect this invitation, please ignore this email.
                </p>
            `;
            break;

        case 'reset_password':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Reset Your Password</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, we received a request to reset your password. Click the button below to create a new password:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${context.resetLink}" style="${buttonStyle('primary')}">Reset Password</a>
                </div>
                <p style="margin: 24px 0 16px; color: #718096; font-size: 14px; text-align: center;">
                    Or copy and paste this link into your browser:
                </p>
                <div style="background-color: #f7fafc; padding: 16px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 14px; color: #4a5568;">
                    ${context.resetLink}
                </div>
                <div style="${alertBoxStyle('warning')}">
                    <p style="margin: 0;"><strong>Security Notice:</strong> This link will expire in 1 hour.</p>
                </div>
                <p style="margin: 24px 0 0; color: #718096; font-size: 14px;">
                    If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                </p>
            `;
            break;

        case 'account_deleted':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Account Deletion Confirmation</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Dear ${context.username},
                </p>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    We're writing to confirm that your staff account at <strong>${context.organizationName}</strong> has been permanently deleted by your manager.
                </p>
                <div style="${alertBoxStyle('danger')}">
                    <p style="margin: 0; font-weight: 600;">What this means:</p>
                    <ul style="margin: 8px 0 0; padding-left: 20px;">
                        <li>You no longer have access to the Hwil platform</li>
                        <li>All your shift history and data have been removed</li>
                        <li>You won't receive any further work-related notifications</li>
                    </ul>
                </div>
                <h3 style="margin: 32px 0 16px; color: #2d3748; font-size: 18px; font-weight: 600;">Need to get back?</h3>
                <p style="margin: 0 0 16px; color: #4a5568; font-size: 16px;">
                    If you believe this was done in error or have questions about this action, please contact your manager or organization administrator directly.
                </p>
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin-top: 24px;">
                    <p style="margin: 0 0 8px; color: #2d3748; font-weight: 600;">Thank you for your service</p>
                    <p style="margin: 0; color: #4a5568; font-size: 14px;">
                        We appreciate the time you spent as part of ${context.organizationName}. We wish you all the best in your future endeavors.
                    </p>
                </div>
            `;
            break;

        case 'permission_updated':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Permission Update Notification</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, your account permissions have been updated.
                </p>
                <div style="${alertBoxStyle('info')}">
                    <p style="margin: 0; font-weight: 600;">What changed?</p>
                    <p style="margin: 8px 0 0;">Your account access levels have been modified by your system administrator. You may notice changes in the features available to you.</p>
                </div>
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    If you believe this change was made in error or have questions about your new permissions, please contact your administrator immediately.
                </p>
            `;
            break;

        case 'invite_staff':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">You're Invited to Join ${context.Organization}! 🎊</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, great news! You've been invited to join the team at <strong>${context.Organization}</strong> on Hwil.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${context.inviteLink}" style="${buttonStyle('success')}">Accept Invitation</a>
                </div>
                <div style="${alertBoxStyle('info')}">
                    <p style="margin: 0; font-weight: 600;">What is Hwil?</p>
                    <p style="margin: 8px 0 0;">Hwil is a modern workforce management platform that helps you track your shifts, manage your schedule, and stay connected with your team.</p>
                </div>
                <h3 style="margin: 32px 0 16px; color: #2d3748; font-size: 18px; font-weight: 600;">Next Steps:</h3>
                <ol style="margin: 0 0 24px; padding-left: 24px; color: #4a5568;">
                    <li style="margin-bottom: 8px;">Click the button above to accept the invitation</li>
                    <li style="margin-bottom: 8px;">Create your password</li>
                    <li style="margin-bottom: 8px;">Complete your profile</li>
                    <li style="margin-bottom: 8px;">Start viewing your shifts!</li>
                </ol>
                <p style="margin: 0; color: #718096; font-size: 14px;">
                    If you weren't expecting this invitation, you can safely ignore this email.
                </p>
            `;
            break;

        case 'shift_reminder':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Upcoming Shift Reminder ⏰</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, this is a friendly reminder about your upcoming shift.
                </p>
                <div style="background-color: #667eea; color: white; padding: 24px; border-radius: 8px; margin: 24px 0;">
                    <h3 style="margin: 0 0 16px; font-size: 20px;">📅 ${context.date}</h3>
                    <div style="display: flex; gap: 24px;">
                        <div>
                            <p style="margin: 0 0 4px; opacity: 0.9; font-size: 14px;">Time</p>
                            <p style="margin: 0; font-weight: 600; font-size: 18px;">${context.startTime} - ${context.endTime}</p>
                        </div>
                        <div>
                            <p style="margin: 0 0 4px; opacity: 0.9; font-size: 14px;">Location</p>
                            <p style="margin: 0; font-weight: 600; font-size: 18px;">${context.location || 'Main Office'}</p>
                        </div>
                    </div>
                </div>
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    Please ensure you arrive on time and are prepared for your shift. If you have any questions or concerns, contact your manager.
                </p>
            `;
            break;

        case 'staff_registration_success':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Welcome to the Team! 🎉</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Congratulations ${context.username}! You've successfully joined <strong>${context.Organization}</strong> as a team member.
                </p>
                <div style="${alertBoxStyle('success')}">
                    <p style="margin: 0; font-weight: 600;">✅ Registration Complete!</p>
                    <p style="margin: 8px 0 0;">Your account has been created. Check your inbox for an email verification link to activate your account.</p>
                </div>
                <h3 style="margin: 32px 0 16px; color: #2d3748; font-size: 18px; font-weight: 600;">What's Next?</h3>
                <ul style="margin: 0 0 24px; padding-left: 24px; color: #4a5568;">
                    <li style="margin-bottom: 8px;">Verify your email address (check your inbox)</li>
                    <li style="margin-bottom: 8px;">Log in to view your dashboard</li>
                    <li style="margin-bottom: 8px;">Check your assigned shifts</li>
                    <li style="margin-bottom: 8px;">Set up your profile preferences</li>
                </ul>
                <p style="margin: 0; color: #4a5568; font-size: 16px;">
                    We're excited to have you on the team! If you need any help getting started, don't hesitate to reach out to your manager.
                </p>
            `;
            break;

        case 'shift_schedule_created':
            const shiftsCount = context.shifts.length;
            const dateRange = shiftsCount > 1 ?
                `${context.shifts[0].date} to ${context.shifts[shiftsCount - 1].date}` :
                context.shifts[0].date;

            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">New Shift Schedule 📋</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, ${shiftsCount > 1 ?
                `you have ${shiftsCount} new shifts scheduled for ${dateRange}` :
                `you have a new shift scheduled on ${context.shifts[0].date}`}.
                </p>
                <div style="background-color: #f7fafc; border-radius: 8px; overflow: hidden; margin: 24px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #edf2f7;">
                                <th style="padding: 12px 16px; text-align: left; color: #4a5568; font-weight: 600; font-size: 14px;">Date</th>
                                <th style="padding: 12px 16px; text-align: left; color: #4a5568; font-weight: 600; font-size: 14px;">Time</th>
                                <th style="padding: 12px 16px; text-align: left; color: #4a5568; font-weight: 600; font-size: 14px;">Location</th>
                                ${context.shifts.some((s: any) => s.notes) ? '<th style="padding: 12px 16px; text-align: left; color: #4a5568; font-weight: 600; font-size: 14px;">Notes</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${context.shifts
                .map((s: any, index: number) => `
                                    <tr style="border-top: 1px solid #e2e8f0;">
                                        <td style="padding: 12px 16px; color: #2d3748;">${s.date}</td>
                                        <td style="padding: 12px 16px; color: #2d3748;">${s.startTime} - ${s.endTime}</td>
                                        <td style="padding: 12px 16px; color: #2d3748;">${s.location || 'Main Office'}</td>
                                        ${context.shifts.some((shift: any) => shift.notes) ?
                    `<td style="padding: 12px 16px; color: #718096; font-size: 14px;">${s.notes || '-'}</td>` : ''}
                                    </tr>
                                `)
                .join('')}
                        </tbody>
                    </table>
                </div>
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    Log in to your Hwil account to view full details, request changes, or sync with your calendar.
                </p>
            `;
            break;

        case 'shift_updated':
            const shiftsArray = Array.isArray(context.shifts) ? context.shifts : [context.shifts];
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Shift Update Notification 🔄</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, your shift schedule has been updated. Please review the changes below:
                </p>
                ${shiftsArray
                .map((s: any) => `
                        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                            <h3 style="margin: 0 0 16px; color: #2d3748; font-size: 18px; font-weight: 600;">Updated Shift Details</h3>
                            <div style="display: grid; gap: 12px;">
                                <div style="display: flex; align-items: center;">
                                    <span style="color: #718096; min-width: 80px;">Date:</span>
                                    <strong style="color: #2d3748;">${s.newDate || s.date}</strong>
                                </div>
                                <div style="display: flex; align-items: center;">
                                    <span style="color: #718096; min-width: 80px;">Time:</span>
                                    <strong style="color: #2d3748;">${s.newStartTime} - ${s.newEndTime}</strong>
                                </div>
                                <div style="display: flex; align-items: center;">
                                    <span style="color: #718096; min-width: 80px;">Location:</span>
                                    <strong style="color: #2d3748;">${s.newLocation || 'Main Office'}</strong>
                                </div>
                            </div>
                            
                            ${(s.oldStartTime !== s.newStartTime || s.oldEndTime !== s.newEndTime ||
                    s.oldLocation !== s.newLocation || s.oldDate !== s.newDate) ? `
                            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0 0 8px; color: #e53e3e; font-weight: 600; font-size: 14px;">Changes made:</p>
                                <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px;">
                                    ${s.oldDate !== s.newDate ? `<li style="margin-bottom: 4px;">Date: <s style="color: #a0aec0;">${s.oldDate}</s> → <strong>${s.newDate}</strong></li>` : ''}
                                    ${(s.oldStartTime !== s.newStartTime || s.oldEndTime !== s.newEndTime) ?
                    `<li style="margin-bottom: 4px;">Time: <s style="color: #a0aec0;">${s.oldStartTime} - ${s.oldEndTime}</s> → <strong>${s.newStartTime} - ${s.newEndTime}</strong></li>` : ''}
                                    ${s.oldLocation !== s.newLocation ?
                    `<li style="margin-bottom: 4px;">Location: <s style="color: #a0aec0;">${s.oldLocation || 'Main Office'}</s> → <strong>${s.newLocation || 'Main Office'}</strong></li>` : ''}
                                </ul>
                            </div>
                            ` : ''}
                        </div>
                    `)
                .join('')}
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    Please update your personal schedule accordingly. If you have any conflicts with these changes, contact your manager immediately.
                </p>
            `;
            break;

        case 'shift_cancelled':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Shift Cancellation Notice ❌</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, we regret to inform you that your scheduled shift has been cancelled.
                </p>
                <div style="${alertBoxStyle('danger')}">
                    <h3 style="margin: 0 0 12px; font-size: 16px;">Cancelled Shift Details:</h3>
                    <div style="background-color: white; padding: 16px; border-radius: 6px; margin-top: 12px;">
                        <div style="display: grid; gap: 8px;">
                            <div><strong>Date:</strong> ${context.date}</div>
                            <div><strong>Time:</strong> ${context.startTime} - ${context.endTime}</div>
                            ${context.location ? `<div><strong>Location:</strong> ${context.location}</div>` : ''}
                            ${context.reason ? `<div><strong>Reason:</strong> ${context.reason}</div>` : ''}
                        </div>
                    </div>
                </div>
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    We apologize for any inconvenience this may cause. Your manager will be in touch if there are any replacement shifts available.
                </p>
                <p style="margin: 16px 0 0; color: #718096; font-size: 14px;">
                    If you have questions about this cancellation, please contact your manager directly.
                </p>
            `;
            break;

        case 'shift_rejected':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Shift Submission Requires Revision 📝</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, your submitted shift needs some adjustments before it can be approved.
                </p>
                
                <div style="${alertBoxStyle('warning')}">
                    <h3 style="margin: 0 0 12px; color: #744210; font-size: 16px;">Shift Details:</h3>
                    <div style="background-color: white; padding: 16px; border-radius: 6px;">
                        <p style="margin: 0 0 8px;"><strong>Date:</strong> ${context.date}</p>
                        <p style="margin: 0 0 8px;"><strong>Time:</strong> ${context.startTime} - ${context.endTime}</p>
                        <p style="margin: 0;"><strong>Status:</strong> <span style="color: #d69e2e;">Requires Revision</span></p>
                    </div>
                </div>
                
                <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
                    <h4 style="margin: 0 0 8px; color: #c53030; font-size: 16px;">Manager's Feedback from ${context.managerName}:</h4>
                    <p style="margin: 0; color: #742a2a; font-style: italic; font-size: 15px;">
                        "${context.reason}"
                    </p>
                </div>
                
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <h4 style="margin: 0 0 12px; color: #2d3748; font-size: 16px;">What to do next:</h4>
                    <ol style="margin: 0; padding-left: 20px; color: #4a5568;">
                        <li style="margin-bottom: 8px;">Log in to your Hwil account</li>
                        <li style="margin-bottom: 8px;">Navigate to the rejected shift</li>
                        <li style="margin-bottom: 8px;">Make the requested changes</li>
                        <li style="margin-bottom: 8px;">Resubmit for approval</li>
                    </ol>
                </div>
                
                <p style="margin: 0; color: #4a5568; font-size: 16px;">
                    If you need clarification about the requested changes, please contact ${context.managerName} directly.
                </p>
            `;
            break;


        case 'leave_request_submitted':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Leave Request Submitted ✅</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, your ${context.leaveType} leave request has been submitted successfully and is awaiting manager approval.
                </p>
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <h3 style="margin: 0 0 16px; color: #2d3748; font-size: 18px; font-weight: 600;">Request Details:</h3>
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; align-items: center;">
                            <span style="color: #718096; min-width: 120px;">Leave Type:</span>
                            <strong style="color: #2d3748;">${context.leaveType === 'annual' ? 'Annual Leave' : 'Sick Leave'}</strong>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="color: #718096; min-width: 120px;">Start Date:</span>
                            <strong style="color: #2d3748;">${context.startDate}</strong>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="color: #718096; min-width: 120px;">End Date:</span>
                            <strong style="color: #2d3748;">${context.endDate}</strong>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="color: #718096; min-width: 120px;">Total Days:</span>
                            <strong style="color: #2d3748;">${context.daysRequested}</strong>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="color: #718096; min-width: 120px;">Reason:</span>
                            <strong style="color: #2d3748;">${context.reason}</strong>
                        </div>
                    </div>
                </div>
                <div style="${alertBoxStyle('info')}">
                    <p style="margin: 0;">Your remaining ${context.leaveType} leave balance after approval will be: <strong>${context.remainingBalance} days</strong></p>
                </div>
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    You'll receive an email notification once your manager reviews this request.
                </p>
            `;
            break;

        case 'leave_request_approved':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Leave Request Approved! 🎉</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Great news ${context.username}! Your ${context.leaveType} leave request has been approved by ${context.managerName}.
                </p>
                <div style="${alertBoxStyle('success')}">
                    <h3 style="margin: 0 0 12px; font-size: 16px;">Approved Leave Details:</h3>
                    <div style="background-color: white; padding: 16px; border-radius: 6px; margin-top: 12px;">
                        <div style="display: grid; gap: 8px;">
                            <div><strong>Leave Type:</strong> ${context.leaveType === 'annual' ? 'Annual Leave' : 'Sick Leave'}</div>
                            <div><strong>Dates:</strong> ${context.startDate} to ${context.endDate}</div>
                            <div><strong>Total Days:</strong> ${context.daysRequested}</div>
                            <div><strong>Approved on:</strong> ${context.approvedDate}</div>
                        </div>
                    </div>
                </div>
                ${context.managerComments ? `
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <h4 style="margin: 0 0 8px; color: #2d3748; font-size: 16px;">Manager's Comments:</h4>
                    <p style="margin: 0; color: #4a5568; font-style: italic;">
                        "${context.managerComments}"
                    </p>
                </div>
                ` : ''}
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    Your leave balance has been updated. Enjoy your time off!
                </p>
            `;
            break;

        case 'leave_request_rejected':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Leave Request Update ❌</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, unfortunately your ${context.leaveType} leave request has been declined by ${context.managerName}.
                </p>
                <div style="${alertBoxStyle('danger')}">
                    <h3 style="margin: 0 0 12px; font-size: 16px;">Request Details:</h3>
                    <div style="background-color: white; padding: 16px; border-radius: 6px; margin-top: 12px;">
                        <div style="display: grid; gap: 8px;">
                            <div><strong>Leave Type:</strong> ${context.leaveType === 'annual' ? 'Annual Leave' : 'Sick Leave'}</div>
                            <div><strong>Requested Dates:</strong> ${context.startDate} to ${context.endDate}</div>
                            <div><strong>Days Requested:</strong> ${context.daysRequested}</div>
                        </div>
                    </div>
                </div>
                <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
                    <h4 style="margin: 0 0 8px; color: #c53030; font-size: 16px;">Manager's Reason:</h4>
                    <p style="margin: 0; color: #742a2a; font-style: italic;">
                        "${context.managerComments || 'No specific reason provided'}"
                    </p>
                </div>
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    If you'd like to discuss this decision or submit a new request, please contact ${context.managerName} directly.
                </p>
            `;
            break;

        case 'leave_request_modified':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Leave Request Modified 📝</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, your ${context.leaveType} leave request has been modified by ${context.managerName}.
                </p>
                <div style="${alertBoxStyle('warning')}">
                    <h3 style="margin: 0 0 12px; font-size: 16px;">Modified Leave Details:</h3>
                    <div style="background-color: white; padding: 16px; border-radius: 6px; margin-top: 12px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #718096; width: 40%;"></td>
                                <td style="padding: 8px; color: #718096; text-align: center;"><strong>Original</strong></td>
                                <td style="padding: 8px; color: #2d3748; text-align: center;"><strong>Modified</strong></td>
                            </tr>
                            <tr style="border-top: 1px solid #e2e8f0;">
                                <td style="padding: 8px 0; color: #4a5568;">Start Date:</td>
                                <td style="padding: 8px; text-align: center;"><s style="color: #a0aec0;">${context.originalStartDate}</s></td>
                                <td style="padding: 8px; text-align: center; color: #2d3748; font-weight: 600;">${context.modifiedStartDate}</td>
                            </tr>
                            <tr style="border-top: 1px solid #e2e8f0;">
                                <td style="padding: 8px 0; color: #4a5568;">End Date:</td>
                                <td style="padding: 8px; text-align: center;"><s style="color: #a0aec0;">${context.originalEndDate}</s></td>
                                <td style="padding: 8px; text-align: center; color: #2d3748; font-weight: 600;">${context.modifiedEndDate}</td>
                            </tr>
                            <tr style="border-top: 1px solid #e2e8f0;">
                                <td style="padding: 8px 0; color: #4a5568;">Total Days:</td>
                                <td style="padding: 8px; text-align: center;"><s style="color: #a0aec0;">${context.originalDays}</s></td>
                                <td style="padding: 8px; text-align: center; color: #2d3748; font-weight: 600;">${context.modifiedDays}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                ${context.managerComments ? `
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <h4 style="margin: 0 0 8px; color: #2d3748; font-size: 16px;">Manager's Comments:</h4>
                    <p style="margin: 0; color: #4a5568; font-style: italic;">
                        "${context.managerComments}"
                    </p>
                </div>
                ` : ''}
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    The modified dates have been approved. Please update your personal calendar accordingly.
                </p>
            `;
            break;

        case 'leave_assigned':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Leave Assigned to You 📅</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, ${context.managerName} has assigned ${context.daysRequested} days of ${context.leaveType} leave to you.
                </p>
                <div style="${alertBoxStyle('info')}">
                    <h3 style="margin: 0 0 12px; font-size: 16px;">Assigned Leave Details:</h3>
                    <div style="background-color: white; padding: 16px; border-radius: 6px; margin-top: 12px;">
                        <div style="display: grid; gap: 8px;">
                            <div><strong>Leave Type:</strong> ${context.leaveType === 'annual' ? 'Annual Leave' : 'Compensatory Leave'}</div>
                            <div><strong>Start Date:</strong> ${context.startDate}</div>
                            <div><strong>End Date:</strong> ${context.endDate}</div>
                            <div><strong>Total Days:</strong> ${context.daysRequested}</div>
                            <div><strong>Reason:</strong> ${context.reason}</div>
                        </div>
                    </div>
                </div>
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    This leave has been automatically approved and added to your leave balance. No further action is required from your side.
                </p>
            `;
            break;

        case 'new_leave_request':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">New Leave Request to Review 📋</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.managerName}, ${context.staffName} has submitted a new leave request that requires your review.
                </p>
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <h3 style="margin: 0 0 16px; color: #2d3748; font-size: 18px; font-weight: 600;">Request Details:</h3>
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; align-items: center;">
                            <span style="color: #718096; min-width: 120px;">Employee:</span>
                            <strong style="color: #2d3748;">${context.staffName}</strong>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="color: #718096; min-width: 120px;">Leave Type:</span>
                            <strong style="color: #2d3748;">${context.leaveType === 'annual' ? 'Annual Leave' : 'Sick Leave'}</strong>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="color: #718096; min-width: 120px;">Dates:</span>
                            <strong style="color: #2d3748;">${context.startDate} to ${context.endDate}</strong>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="color: #718096; min-width: 120px;">Days:</span>
                            <strong style="color: #2d3748;">${context.daysRequested}</strong>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="color: #718096; min-width: 120px;">Remaining Balance:</span>
                            <strong style="color: #2d3748;">${context.remainingBalance} days</strong>
                        </div>
                    </div>
                </div>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${context.reviewLink}" style="${buttonStyle('primary')}">Review Request</a>
                </div>
                <p style="margin: 24px 0 0; color: #718096; font-size: 14px; text-align: center;">
                    Please review this request at your earliest convenience.
                </p>
            `;
            break;
        case 'leave_status_update':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">Leave Request ${context.status.charAt(0).toUpperCase() + context.status.slice(1)} 📋</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    Hi ${context.username}, your ${context.leaveType} leave request has been ${context.status} by your manager.
                </p>
                
                <div style="background-color: ${context.status === 'approved' ? '#f0fff4' : context.status === 'rejected' ? '#fff5f5' : '#fefcbf'}; 
                            border-left: 4px solid ${context.status === 'approved' ? '#48bb78' : context.status === 'rejected' ? '#f56565' : '#ecc94b'}; 
                            padding: 20px; margin: 24px 0; border-radius: 0 6px 6px 0;">
                    <h3 style="margin: 0 0 16px; color: #2d3748; font-size: 18px; font-weight: 600;">
                        Status: <span style="color: ${context.status === 'approved' ? '#38a169' : context.status === 'rejected' ? '#e53e3e' : '#d69e2e'};">
                            ${context.status === 'approved' ? '✅ Approved' : context.status === 'rejected' ? '❌ Rejected' : '📝 Modified'}
                        </span>
                    </h3>
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; align-items: flex-start;">
                            <span style="color: #718096; min-width: 120px;">Leave Type:</span>
                            <strong style="color: #2d3748;">${context.leaveType === 'annual' ? 'Annual Leave' : 'Sick Leave'}</strong>
                        </div>
                        <div style="display: flex; align-items: flex-start;">
                            <span style="color: #718096; min-width: 120px;">Dates:</span>
                            <strong style="color: #2d3748;">${context.startDate} to ${context.endDate}</strong>
                        </div>
                        <div style="display: flex; align-items: flex-start;">
                            <span style="color: #718096; min-width: 120px;">Days Requested:</span>
                            <strong style="color: #2d3748;">${context.daysRequested || 'N/A'}</strong>
                        </div>
                        <div style="display: flex; align-items: flex-start;">
                            <span style="color: #718096; min-width: 120px;">Reviewed On:</span>
                            <strong style="color: #2d3748;">${new Date().toDateString()}</strong>
                        </div>
                    </div>
                </div>
        
                ${context.managerComments ? `
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <h4 style="margin: 0 0 8px; color: #2d3748; font-size: 16px;">Manager's Comments:</h4>
                    <p style="margin: 0; color: #4a5568; font-style: italic; line-height: 1.6;">
                        "${context.managerComments}"
                    </p>
                </div>
                ` : ''}
        
                ${context.status === 'approved' ? `
                <div style="${alertBoxStyle('success')}">
                    <p style="margin: 0; font-weight: 600;">✅ Your leave has been approved!</p>
                    <p style="margin: 8px 0 0;">Your leave balance has been updated. Please ensure all handovers are completed before your leave begins.</p>
                </div>
                ` : context.status === 'rejected' ? `
                <div style="${alertBoxStyle('danger')}">
                    <p style="margin: 0; font-weight: 600;">Your leave request was not approved.</p>
                    <p style="margin: 8px 0 0;">If you'd like to discuss this decision or submit a new request with different dates, please contact your manager.</p>
                </div>
                ` : `
                <div style="${alertBoxStyle('warning')}">
                    <p style="margin: 0; font-weight: 600;">Your leave request requires modifications.</p>
                    <p style="margin: 8px 0 0;">Please review the manager's comments and resubmit your request with the suggested changes.</p>
                </div>
                `}
        
                <div style="background-color: #edf2f7; padding: 16px; border-radius: 6px; margin: 24px 0;">
                    <p style="margin: 0 0 8px; color: #4a5568; font-size: 14px; font-weight: 600;">Next Steps:</p>
                    <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px;">
                        ${context.status === 'approved' ? `
                            <li style="margin-bottom: 4px;">Your leave dates have been confirmed</li>
                            <li style="margin-bottom: 4px;">Update your calendar and set out-of-office replies</li>
                            <li style="margin-bottom: 4px;">Complete any pending handovers</li>
                        ` : context.status === 'rejected' ? `
                            <li style="margin-bottom: 4px;">Review the manager's feedback</li>
                            <li style="margin-bottom: 4px;">Consider alternative dates if needed</li>
                            <li style="margin-bottom: 4px;">Discuss with your manager if you have concerns</li>
                        ` : `
                            <li style="margin-bottom: 4px;">Review the requested modifications</li>
                            <li style="margin-bottom: 4px;">Submit a new request with updated details</li>
                            <li style="margin-bottom: 4px;">Contact your manager if you need clarification</li>
                        `}
                    </ul>
                </div>
        
                <p style="margin: 24px 0 0; color: #4a5568; font-size: 16px;">
                    You can view the full details of your leave request by logging into your Hwil account.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.FRONTEND_URL}/dashboard/leave" style="${buttonStyle('primary')}">View Leave Details</a>
                </div>
            `;
            break;


        case 'notification_alert':
            content = `
                <h2 style="margin: 0 0 16px; color: #2d3748; font-size: 24px; font-weight: 700;">🔔 ${context.title}</h2>
                <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px;">
                    ${context.message}
                </p>
                <div style="${alertBoxStyle('info')}">
                    <p style="margin: 0;">You have a new notification waiting for you in your Hwil account.</p>
                </div>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${context.actionUrl}" style="${buttonStyle('primary')}">View Notification</a>
                </div>
                <p style="margin: 24px 0 0; color: #718096; font-size: 14px; text-align: center;">
                    Log in to your account to see all your notifications and take necessary actions.
                </p>
            `;
            break;

        default:
            throw new Error('Invalid email template');
    }

    const html = emailWrapper(content);

    const mailOptions = {
        from: `"Hwil" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

export function checkEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}