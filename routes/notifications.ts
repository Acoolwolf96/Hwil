import express from "express";

import { sendEmail } from "../utils/email";


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

export default router;