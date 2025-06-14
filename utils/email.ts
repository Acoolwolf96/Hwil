
import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Changed from true to false for port 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify transporter configuration
transporter.verify(function(error, success) {
    if (error) {
        console.error('Email transporter error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

interface EmailPayload {
    to: string;
    subject: string;
    template: 'welcome_email' | 'reset_password' | 'permission_updated' | 'invite_staff' | 'shift_reminder';
    context: Record<string, any>
}

export async function sendEmail({to, subject, template, context}: EmailPayload) {
    let html: string;

    switch (template) {
        case 'welcome_email':
            html = `<p>Welcome ${context.username}, your account has been created! We are excited to have you on board.</p>`;
            break;
        case 'reset_password':
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>Hello ${context.username},</p>
                    <p>You recently requested to reset your password. Click the button below to reset it:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${context.resetLink}" 
                           style="background-color: #007bff; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #007bff;">${context.resetLink}</p>
                    <p>This link will expire in 1 hour for security reasons.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">This is an automated email, please do not reply.</p>
                </div>
            `;
            break;
        case 'permission_updated':
            html = `<p>Hello ${context.username}, your permissions have been updated.</p>`;
            break;
        case 'invite_staff':
            html = `<p>Hello ${context.username}, you have been invited to join ${context.Organization} on Hwil System. Click <a href="${context.inviteLink}">here</a> to complete your registration.</p>`;
            break;
        case 'shift_reminder':
            html = `
                <p>Hi ${context.username}, this is a reminder for your upcoming shift on ${context.date} from ${context.startTime} to ${context.endTime}. Location: ${context.location}.</p>
                <p>Please make sure to arrive on time.</p>
                <p>- Hwil Team</p>
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