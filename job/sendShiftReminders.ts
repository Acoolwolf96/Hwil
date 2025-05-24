import cron from 'node-cron';
import { Shift } from '../models/Shift';
import { sendEmail } from '../utils/email';




const sendShiftReminders = async () => {
    try{
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);


        const shifts = await Shift.find({
            date: { $eq: now.toISOString().split('T')[0] },
            startTime: {
                $gte: now.toTimeString().slice(0, 5),
                $lte: oneHourFromNow.toTimeString().slice(0, 5)
            },
            reminderSent: false,
            status: 'assigned'
        }).populate('assignedTo');

        for (const shift of shifts) {
            const staff = shift.assignedTo as any; // Type assertion to any for easier access
            if(!staff?.email) {
                console.error(`No email found for staff member with ID ${staff.id}`);
                continue;
            }

            await sendEmail({
                to: staff.email,
                subject: `⏰ Upcoming Shift Reminder - ${shift.startTime}`,
                template: 'shift_reminder',
                context: {
                    username: staff.name,
                    date: shift.date.toDateString(),
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    location: shift.location || 'N/A',
                }
            });

            shift.reminderSent = true;
            await shift.save();
        }
    } catch (error) {
        console.error('Error sending shift reminders:', error);
    }
};

// Schedule the job to run every hour
cron.schedule('0 * * * *', () => {
    console.log('Running shift reminder...');
    sendShiftReminders();
});