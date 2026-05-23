import { getMailTransporter } from "./mailTransport.js";

export const sendEmail = async (to, subject, text) => {
  const transporter = getMailTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
};