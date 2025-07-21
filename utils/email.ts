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
        'verify_email_staff';
    context: Record<string, any>;
}

export async function sendEmail({ to, subject, template, context }: EmailPayload) {
    let html: string;

    switch (template) {
        case 'welcome_email':
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome to Hwil!</h2>
                    <p>Dear ${context.username},</p>
                    <p>Welcome to Hwil! Your account has been successfully created. We're excited to have you on board.</p>
                    <p>You have registered as a manager and created the organization <strong>${context.organizationName}</strong>.</p>
                    <p><strong>Important:</strong> Please check your inbox for a separate email to verify your email address. You'll need to verify your email before you can log in.</p>
                    <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
                    <p>Best regards,<br/>The Hwil Team</p>
                    <hr>
                    <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
                </div>
            `;
            break;

        case 'verify_email':
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Verify Your Email Address</h2>
                    <p>Dear ${context.username},</p>
                    <p>Thank you for registering with Hwil! To complete your registration and access your account, please verify your email address by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${context.verificationLink}" style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-word; background-color: #f4f4f4; padding: 10px; border-radius: 4px;">
                        ${context.verificationLink}
                    </p>
                    <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                    <p>If you didn't create an account with Hwil, please ignore this email.</p>
                    <p>Best regards,<br/>The Hwil Team</p>
                    <hr>
                    <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
                </div>
            `;
            break;

        case 'verify_email_staff':
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Verify Your Email Address</h2>
                    <p>Dear ${context.username},</p>
                    <p>Welcome to <strong>${context.Organization}</strong> on Hwil! To complete your registration and access your staff account, please verify your email address by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${context.verificationLink}" style="background-color: #28a745; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-word; background-color: #f4f4f4; padding: 10px; border-radius: 4px;">
                        ${context.verificationLink}
                    </p>
                    <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                    <p>Once verified, you'll be able to log in and view your assigned shifts.</p>
                    <p>If you didn't expect this invitation, please ignore this email.</p>
                    <p>Best regards,<br/>The Hwil Team</p>
                    <hr>
                    <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
                </div>
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
                <p><strong>Important:</strong> Please check your inbox for a separate email to verify your email address. You'll need to verify your email before you can log in.</p>
                <p>Once verified, you can log in, view your assigned shifts, and manage your schedule easily.</p>
                <p>If you have any questions or encounter issues, please contact your manager or the support team.</p>
                <p>We're glad to have you on the team!</p>
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">Please do not reply to this email. This inbox is not monitored.</p>
            `;
            break;

        case 'shift_schedule_created':
            const shiftsCount = context.shifts.length;
            const dateRange = shiftsCount > 1 ?
                `${context.shifts[0].date} to ${context.shifts[shiftsCount - 1].date}` :
                context.shifts[0].date;

            html = `
                <p>Dear ${context.username},</p>
                <p>${shiftsCount > 1 ?
                        `You have been assigned ${shiftsCount} new shifts for the period ${dateRange}.` :
                        `You have been assigned a new shift on ${context.shifts[0].date}.`
                    }</p>
                <p>Please find your shift details below:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                            <th style="padding: 12px; text-align: left;">Date</th>
                            <th style="padding: 12px; text-align: left;">Time</th>
                            <th style="padding: 12px; text-align: left;">Location</th>
                            ${context.shifts.some((s: any) => s.notes) ? '<th style="padding: 12px; text-align: left;">Notes</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${context.shifts
                        .map((s: any, index: number) => `
                                <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
                                    <td style="padding: 12px;">${s.date}</td>
                                    <td style="padding: 12px;">${s.startTime} - ${s.endTime}</td>
                                    <td style="padding: 12px;">${s.location || 'N/A'}</td>
                                    ${context.shifts.some((shift: any) => shift.notes) ?
                            `<td style="padding: 12px;">${s.notes || '-'}</td>` : ''}
                                </tr>
                            `)
                        .join('')}
                    </tbody>
                </table>
                <p>Please log in to your Hwil account to view more details or make any necessary arrangements.</p>
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
        case 'shift_rejected':
            html = `
                <p>Dear ${context.username},</p>
                <p>Your submitted shift for <strong>${context.date}</strong> (${context.startTime} - ${context.endTime}) has been reviewed and requires your attention.</p>
                
                <div style="background-color: #fffbe6; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #b45309;">Shift Rejected by ${context.managerName}</h3>
                    <p style="margin-bottom: 5px;"><strong>Reason for rejection:</strong></p>
                    <p style="margin-top: 0; font-style: italic;">"${context.reason}"</p>
                </div>
                
                <p><strong>Next Steps:</strong> Please log in to your Hwil account to edit the shift details and resubmit it for approval. If you have questions, please contact your manager directly.</p>
                
                <p>Best regards,<br/>The Hwil Team</p>
                <hr>
                <p style="font-size: 12px; color: gray;">This is an automated notification. Please do not reply.</p>
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