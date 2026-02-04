import { OTPEmail } from "./templates/otp";
import { verifyEmail, verifyMailSubject, zIDEmail } from "../../config";
import { env } from "../../env";
import { Resend } from "resend";
import { getLogger } from "../../log";

const resend = new Resend(env.RESEND_KEY);
const log = getLogger("mail")


export async function sendOTPMail(otp: string, zID: string) {
  const emailContent = (<OTPEmail code={otp} expiryMinutes={10} />) as string;
  try {
    const { data, error } = await resend.emails.send({
      from: verifyEmail,
      to: [zIDEmail(zID)],
      subject: verifyMailSubject,
      html: emailContent
    });

    if (error) {
      log.error({ error }, "Error when sending mail")
    }

    log.debug(data);
  } catch (e) {
    log.error({ e }, "Error when sending mail");
  }
}
