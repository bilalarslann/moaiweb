declare module 'nodemailer' {
    interface SendMailOptions {
        from?: string;
        to?: string;
        subject?: string;
        text?: string;
        html?: string;
    }

    interface Transporter {
        sendMail(mailOptions: SendMailOptions): Promise<any>;
    }

    interface TransportOptions {
        host: string;
        port: number;
        secure?: boolean;
        auth: {
            user: string;
            pass: string;
        };
    }

    function createTransport(options: TransportOptions): Transporter;

    export { createTransport, SendMailOptions, Transporter, TransportOptions };
    export default { createTransport };
} 