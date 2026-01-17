import { createTransport } from "nodemailer";
import { OTPEmail } from "./templates/otp";
import { verifyEmail, verifyMailSubject, zIDEmail } from "../../config";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
if (!region || !accessKeyId || !secretAccessKey) {
  throw new Error("Missing AWS environment variables");
}

const sesClient = new SESv2Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});
const transporter = createTransport({
  SES: { sesClient, SendEmailCommand },
});

export async function sendOTPMail(otp: string, zID: string) {
  const emailContent = (<OTPEmail code={otp} expiryMinutes={10} />) as string;

  transporter.sendMail(
    {
      from: verifyEmail,
      to: zIDEmail(zID),
      subject: verifyMailSubject,
      html: emailContent,
    },
    (err) => {
      if (err) throw err;
    },
  );

  return;
}
