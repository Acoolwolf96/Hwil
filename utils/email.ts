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
    template: 'welcome_email' | 'reset_password' | 'permission_updated' | 'invite_staff' | 'shift_reminder' | 'staff_registration_success' | 'shift_schedule_created' | 'shift_updated' | 'shift_cancelled';
    context: Record<string, any>;
}

export async function sendEmail({ to, subject, template, context }: EmailPayload) {
    let html: string;

    switch (template) {
        case 'welcome_email':
            html = `
                <p>Dear ${context.username},</p>
                <p>Welcome to Hwil! Your account has been successfully created. We're excited to have you on board.</p>
                <p>If you have any questions or need assistance, feel free to reach out to your manager or support team.</p>
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
            `;
            break;
        case 'reset_password':
            html = `
                <p>Dear ${context.username},</p>
                <p>We received a request to reset your password. Click the button below to proceed:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${context.resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a>
                </div>
                <p>Or use the following link:</p>
                <p style="word-break: break-word;">${context.resetLink}</p>
                <p>This link will expire in 1 hour for security reasons. If you did not request a password reset, please disregard this email.</p>
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
            `;
            break;
        case 'permission_updated':
            html = `
                <p>Dear ${context.username},</p>
                <p>This is to inform you that your account permissions have been successfully updated.</p>
                <p>If you believe this change was made in error, please contact your system administrator immediately.</p>
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
            `;
            break;
        case 'invite_staff':
            html = `
                <p>Dear ${context.username},</p>
                <p>You have been invited to join the <strong>${context.Organization}</strong> team on Hwil.</p>
                <p>Click the link below to complete your registration:</p>
                <div style="margin: 20px 0;">
                    <a href="${context.inviteLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Join Hwil</a>
                </div>
                <p>If you were not expecting this invitation, you can ignore this message.</p>
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
            `;
            break;
        case 'shift_reminder':
            html = `
                <p>Dear ${context.username},</p>
                <p>This is a reminder that you have an upcoming shift scheduled on <strong>${context.date}</strong> from <strong>${context.startTime}</strong> to <strong>${context.endTime}</strong>.</p>
                <p>Location: ${context.location || 'N/A'}</p>
                <p>Please ensure you are ready and on time.</p>
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
            `;
            break;
        case 'staff_registration_success':
            html = `
                <p>Dear ${context.username},</p>
                <p>Congratulations! You have successfully registered as a staff member on <strong>${context.Organization}</strong>.</p>
                <p>You can now log in, view your assigned shifts, and manage your schedule easily.</p>
                <p>If you have any questions or encounter issues, please contact your manager or the support team.</p>
                <p>We're glad to have you on the team!</p>
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
            `;
            break;

        case 'shift_schedule_created':
            html = `
                <p>Dear ${context.username},</p>
                <p>Your shift schedule has been updated. Please find your upcoming shift(s) below:</p>
                <ul style="padding-left: 20px;">
                  ${context.shifts
                .map(
                    (s: any) =>
                        `<li><strong>${s.date}</strong> — ${s.startTime} to ${s.endTime} at ${s.location || 'N/A'}</li>`
                )
                .join('')}
                </ul>
                <p>Please log in to your Hwil account to view more details.</p>
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
            `;
            break;

        case 'shift_updated':
            const shiftsArray = Array.isArray(context.shifts) ? context.shifts : [context.shifts];
            html = `
                <p>Dear ${context.username},</p>
                <p>Your shift has been updated. Here are the details:</p>
                ${shiftsArray
                .map((s: any) => `
                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #333;">Updated Shift Details</h3>
                                <p style="margin: 5px 0;"><strong>Date:</strong> ${s.newDate || s.date}</p>
                                <p style="margin: 5px 0;"><strong>Time:</strong> ${s.newStartTime} - ${s.newEndTime}</p>
                                <p style="margin: 5px 0;"><strong>Location:</strong> ${s.newLocation || 'N/A'}</p>
                                
                                ${(s.oldStartTime !== s.newStartTime || s.oldEndTime !== s.newEndTime ||
                    s.oldLocation !== s.newLocation || s.oldDate !== s.newDate) ? `
                                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                                    <p style="font-weight: bold; margin-bottom: 10px;">Changes made:</p>
                                    <ul style="margin: 0; padding-left: 20px;">
                                        ${s.oldDate !== s.newDate ? `<li>Date changed from ${s.oldDate} to ${s.newDate}</li>` : ''}
                                        ${(s.oldStartTime !== s.newStartTime || s.oldEndTime !== s.newEndTime) ?
                    `<li>Time changed from ${s.oldStartTime} - ${s.oldEndTime} to ${s.newStartTime} - ${s.newEndTime}</li>` : ''}
                                        ${s.oldLocation !== s.newLocation ?
                    `<li>Location changed from ${s.oldLocation || 'N/A'} to ${s.newLocation || 'N/A'}</li>` : ''}
                                    </ul>
                                </div>
                                ` : ''}
                            </div>
                        `)
                .join('')}
                <p>Please log in to your Hwil account to view the full schedule.</p>
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
            `;
            break;
        case 'shift_cancelled':
            html = `
                <p>Dear ${context.username},</p>
                <p>We regret to inform you that the following shift has been cancelled:</p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${context.date}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${context.startTime} - ${context.endTime}</p>
                    ${context.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${context.location}</p>` : ''}
                    ${context.reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${context.reason}</p>` : ''}
                </div>
                <p>We apologize for any inconvenience this may cause. If you have any questions or concerns, please contact your manager.</p>
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
            `;
            break;

        default:
            throw new Error('Invalid email template');
    }

    const mailOptions = {
        from: `"Hwil System" <${process.env.EMAIL_USER}>`,
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

export function checkEmail(email: string) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}