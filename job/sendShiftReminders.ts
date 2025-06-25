// services/shiftReminder.ts
import cron from 'node-cron';
import moment from 'moment-timezone';
import { Shift } from '../models/Shift';
import { Staff } from '../models/Staff';
import { sendEmail } from '../utils/email';

const sendShiftReminders = async () => {
    try {
        console.log('🔍 Starting shift reminder check at:', moment().format());

        const now = moment();

        // Find all shifts for today across all timezones
        const startOfDay = moment().startOf('day').toDate();
        const endOfDay = moment().endOf('day').add(1, 'day').toDate(); // Include next day for timezone differences

        const shifts = await Shift.find({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            reminderSent: false,
            status: 'assigned',
        })
            .populate('assignedTo')
            .populate('organizationId');

        console.log(`📊 Found ${shifts.length} potential shifts to check`);

        for (const shift of shifts) {
            const organization = shift.organizationId as any;
            const timezone = shift.timezone || organization?.timezone || 'Africa/Nairobi';

            console.log(`\n🔹 Processing shift ${shift._id}:`);
            console.log(`   Date: ${shift.date}`);
            console.log(`   Time: ${shift.startTime} - ${shift.endTime}`);
            console.log(`   Timezone: ${timezone}`);
            console.log(`   Status: ${shift.status}`);

            // Create shift start time in the shift's timezone
            const shiftDateStr = moment(shift.date).format('YYYY-MM-DD');
            const shiftStartLocal = moment.tz(`${shiftDateStr} ${shift.startTime}`, 'YYYY-MM-DD HH:mm', timezone);
            const shiftStartUTC = shiftStartLocal.toDate();

            console.log(`   Shift starts at: ${shiftStartLocal.format()} (${timezone})`);
            console.log(`   Current time: ${now.tz(timezone).format()} (${timezone})`);
            console.log(`   Minutes until shift: ${Math.round(shiftStartLocal.diff(now, 'minutes'))}`);

            // Check if shift is within the next hour
            const oneHourLater = now.clone().add(1, 'hour');
            if (!(shiftStartLocal.isAfter(now) && shiftStartLocal.isBefore(oneHourLater))) {
                console.log(`   ⏭️ Skipping - not within 1-hour window`);
                continue;
            }

            let staff = shift.assignedTo as any;

            if (!staff || !staff.email) {
                const staffId = staff?._id || shift.assignedTo;
                if(!staffId){
                    console.log(`   ❌ No valid assigned Staff ID. Skipping...`);
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
                        date: moment(shift.date).format('dddd, MMMM D, YYYY'),
                        startTime: shift.startTime,
                        endTime: shift.endTime,
                        location: shift.location || 'N/A',
                        timezone: timezone,
                        localStartTime: shiftStartLocal.format('h:mm A z')
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