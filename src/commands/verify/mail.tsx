import { createTransport } from "nodemailer";
import { OTPEmail } from "./templates/otp";

const SEND_MAIL = process.env.VERIFY_EMAIL;
const transporter = createTransport({
  jsonTransport: true,
});

export async function sendOTPMail(otp: string, zID: string) {
  const emailContent = (<OTPEmail code={otp} expiryMinutes={10} />) as string;

  transporter.sendMail(
    {
      from: SEND_MAIL,
      to: zIDToEmail(zID),
      subject: "Linux Society UNSW Discord Verification",
      html: emailContent,
    },
    (err, info) => {
      if (err) throw err;
      console.log(JSON.parse(info.message));
    },
  );

  return;
}

export function zIDToEmail(zID: string): string {
  return `${zID}@unsw.edu.au`;
}
