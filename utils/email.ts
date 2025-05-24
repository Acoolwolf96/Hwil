import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    port: 587,
    auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
})

interface EmailPayload {
    to: string;
    subject: string;
    template: 'welcome_email' | 'reset_password' | 'permission_updated' | 'invite_staff' | 'shift_reminder';
    // context is an object that contains dynamic data for the email template
    // e.g. { username: 'John
    context: Record<string, any>
}

export async function sendEmail({to, subject, template, context}: EmailPayload) {
    let html: string;

    switch (template) {
        case 'welcome_email':
            html = `<p> Welcome ${context.username}, your account has been created! We are excited to have you on board. </p> `;
            break;
        case 'reset_password':
            html = `<p> Hello ${context.username}, click <a href="${context.resetLink}" >here</a> to reset your password. </p>`;
            break;
        case 'permission_updated':
            html = `<p>Hello ${context.username}, your permissions have been updated.</p>`;
            break
        case 'invite_staff':
            html = `<p>Hello ${context.username}, you have been invited to join ${context.Organization} on Hwil System. Click <a href="${context.inviteLink}" >here</a> to complete your registeration.</p>`;
            break;
        case 'shift_reminder':
            html = `<p>Hi ${context.username}, this is a reminder for your upcoming shift on ${context.date} from ${context.startTime} to ${context.endTime}. Location: ${context.location}.</p>
            <p>Please make sure to arrive on time.</p>
            <p>- Hwil Team</p>`;
            break;
        default:
            throw new Error('Invalid email template');

    }

    const mailOptions = {
        from: '"Hwil System" <no-reply@hwil.com>',
        to,
        subject,
        html,
    };

    await transporter.sendMail(mailOptions);
}

export function checkEmail(email: string) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}