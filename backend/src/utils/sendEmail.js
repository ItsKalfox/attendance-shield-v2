const nodemailer = require('nodemailer');
const dns = require('node:dns');

const sendEmail = async (options) => {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const isSecure = port === 465;

    // Explicitly resolve IPv4 to prevent ENETUNREACH errors on cloud platforms (such as Render) that lack outbound IPv6 routing
    let hostAddress = smtpHost;
    try {
        const resolved = await dns.promises.lookup(smtpHost, { family: 4 });
        if (resolved && resolved.address) {
            hostAddress = resolved.address;
        }
    } catch (err) {
        console.warn(`[sendEmail] IPv4 resolution for ${smtpHost} failed, falling back to hostname:`, err.message);
    }

    const transporter = nodemailer.createTransport({
        host: hostAddress,
        port,
        secure: isSecure,
        tls: {
            servername: smtpHost
        },
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
    });

    const message = {
        from: `${process.env.EMAIL_FROM_NAME || 'Attendance Shield'} <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
        ...(options.attachments ? { attachments: options.attachments } : {})
    };

    // Only attempt to send if credentials are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const info = await transporter.sendMail(message);
        console.log('Message sent: %s', info.messageId);
        return info;
    } else {
        console.log('Email sending disabled (no credentials). Message would have been:');
        console.log(message);
    }
};

module.exports = sendEmail;

