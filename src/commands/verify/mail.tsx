import { createTransport } from "nodemailer";
import { OTPEmail } from "./templates/otp";
import { verifyMailSubject, zIDEmail } from "../../config";

const SEND_MAIL = process.env.VERIFY_EMAIL;
const transporter = createTransport({
  jsonTransport: true,
});

export async function sendOTPMail(otp: string, zID: string) {
  const emailContent = (<OTPEmail code={otp} expiryMinutes={10} />) as string;

  transporter.sendMail(
    {
      from: SEND_MAIL,
      to: zIDEmail(zID),
      subject: verifyMailSubject,
      html: emailContent,
    },
    (err, info) => {
      if (err) throw err;
      console.log(JSON.parse(info.message));
    },
  );

  return;
}
