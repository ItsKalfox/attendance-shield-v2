const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Stub for testing, you should configure a real transport in production
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const message = {
        from: `${process.env.EMAIL_FROM_NAME || 'Attendance Platform'} <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    };

    // Only attempt to send if credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const info = await transporter.sendMail(message);
        console.log('Message sent: %s', info.messageId);
    } else {
        console.log('Email sending disabled (no credentials). Message would have been:');
        console.log(message);
    }
};

module.exports = sendEmail;
