import cron from 'node-cron';
import { Shift } from '../models/Shift';
import { Staff } from '../models/Staff';
import { sendEmail } from '../utils/email';

const sendShiftReminders = async () => {
    try {
        console.log('🔍 Starting shift reminder check at:', new Date().toISOString());

        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

        // Since date is stored as Date object, we need to query for today's shifts
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const shifts = await Shift.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            reminderSent: false,
            status: 'assigned',
        }).populate('assignedTo');

        console.log(`📊 Found ${shifts.length} shifts for today`);

        for (const shift of shifts) {
            console.log(`\n🔹 Processing shift ${shift._id}:`);
            console.log(`   Date: ${shift.date}`);
            console.log(`   Time: ${shift.startTime} - ${shift.endTime}`);
            console.log(`   Status: ${shift.status}`);

            const [hour, minute] = shift.startTime.split(':').map(Number);

            // Since shift.date is already a Date object at midnight, we just set the time
            const shiftStart = new Date(shift.date);
            shiftStart.setHours(hour, minute, 0, 0);

            console.log(`   Shift starts at: ${shiftStart.toISOString()}`);
            console.log(`   Current time: ${now.toISOString()}`);
            console.log(`   Time until shift: ${Math.round((shiftStart.getTime() - now.getTime()) / 1000 / 60)} minutes`);

            // Check if shift is within the next hour
            if (!(shiftStart > now && shiftStart <= oneHourLater)) {
                console.log(`   ⏭️ Skipping - not within 1-hour window`);
                continue;
            }

            let staff = shift.assignedTo as any;

            if (!staff || !staff.email) {
                const staffId = staff?._id || shift.assignedTo;
                if (!staffId) {
                    console.log(`   ❌ No valid assigned staff ID. Skipping.`);
                    continue;
                }

                console.log(`   ⚠️ Fetching staff manually for ID: ${staffId}`);
                staff = await Staff.findById(staffId);

                if (!staff || !staff.email) {
                    console.log(`   ❌ Staff not found or missing email for ID: ${staffId}`);
                    continue;
                }
            }

            console.log(`   📧 Sending email to ${staff.email} (${staff.name})...`);

            try {
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
                    },
                });

                shift.reminderSent = true;
                await shift.save();

                console.log(`   ✅ Reminder sent successfully!`);
            } catch (emailError) {
                console.error(`   ❌ Failed to send email:`, emailError);
            }
        }

        console.log('\n✅ Shift reminder check completed\n');
    } catch (error) {
        console.error('❌ Error sending shift reminders:', error);
    }
};

// Schedule job every 5 minutes
cron.schedule('*/5 * * * *', () => {
    console.log('\n🕐 Running scheduled shift reminder check...');
    sendShiftReminders();
});

// Run immediately on startup for testing
console.log('✅ Shift reminder cron job initialized');
sendShiftReminders().then(() => {
    console.log('✅ Initial shift reminder check completed');
}).catch(err => {
    console.error('❌ Initial check failed:', err);
});
