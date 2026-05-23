import { getResendClient } from "./mailTransport.js";

export const sendEmail = async (to, subject, text) => {
  const resend = getResendClient();

  await resend.emails.send({
    from: `Kelab Fotokreatif <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    text,
  });
};