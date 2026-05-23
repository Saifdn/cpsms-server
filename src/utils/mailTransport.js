import { Resend } from "resend";

let client;

export const getResendClient = () => {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
};