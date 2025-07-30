import express from "express";

import { sendEmail } from "../utils/email";
import { authMiddleware } from '../middleware/auth';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount, testNotification
} from '../controllers/notificationControllers';


const router = express.Router();


router.post('/email', async (req, res) =>{
    try{
        const { to, subject, template, context } = req.body

        if(!to || !subject || !template || !context){
            res.status(400).json({
                error: 'Missing required fields'
            })
            return
        };

        await sendEmail({ to, subject, template, context})
        res.status(200).json({
            message: 'Email sent successfully'
        })
        return
    } catch(err){
        console.error('Email error:', err);
        res.status(500).json({
            error: 'Internal Server error, Failed to send email.'
        })
    }
})


// routes/notificationRoutes.t

// Get notifications
router.get('/', authMiddleware, getNotifications);

// Get unread count
router.get('/unread-count', authMiddleware, getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', authMiddleware, markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', authMiddleware, markAllAsRead);

// Delete notification
router.delete('/:notificationId', authMiddleware, deleteNotification);

//test notification
router.post('/test', testNotification);

export default router;