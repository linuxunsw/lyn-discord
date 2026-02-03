import { createTransport } from "nodemailer";
import { OTPEmail } from "./templates/otp";
import { verifyEmail, verifyMailSubject, zIDEmail } from "../../config";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { env } from "../../env";

const sesClient = new SESv2Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
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
