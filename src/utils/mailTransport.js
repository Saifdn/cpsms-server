import nodemailer from "nodemailer";

let sharedTransporter;

export const getMailTransporter = () => {
  if (!sharedTransporter) {
    sharedTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,

      family: 4,

      pool: true,
      maxConnections: 1,
      maxMessages: 25,

      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,

      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },

      tls: {
        minVersion: "TLSv1.2",
      },
    });
  }

  return sharedTransporter;
};