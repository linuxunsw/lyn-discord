import { blockQuote, bold, inlineCode } from "discord.js";
import { env } from "./env";


export const unauthorisedMessage =
  "You are not authorised to use this command.";


/* verification menus */
export const verifiedRole = "1461704419136507978";
export const verifyMenuTitle = "Verification";
export const verifyMenuContent = `❁ ➔ ${bold("Please verify yourself")}
${blockQuote(
  `In order to gain access to the server, please verify yourself using your zID through email.\n
  • Press ${inlineCode("Get Code")} and enter your zID
  • Check your email for a code ${bold("(make sure to check spam!)")}
  • Press ${inlineCode("Enter Code")} button and enter the code from the email
  • Congratulations, you’re verified!

  If you have any feedback or issues regarding the verification process, please [visit this form](https://docs.google.com/forms/d/e/1FAIpQLScvqcvp1ymFoq1VRAS2yIVUr_MNRB9WP9wzIwDQz63S8pEmwQ/viewform?usp=sf_link)`,
)}`;
export const verifyEmail = `"${env.SOCIETY_NAME}" <${env.VERIFY_EMAIL}>`;

export const getCodeReplyContent = `Please check your DMs for more information!`;
export const getCodeDMTitle = `You've got mail!`;
export const getCodeDMContent = (
  email: string,
) => `❁ ➔ **We've sent you some mail**\n
> Please check your email and enter the code in the ${inlineCode("Enter Code")} form in order to verify yourself as ${inlineCode(email)}\n
⚜ ➔ **Notes**
>>> The mail will most likely appear in your spam/junk mail.
If you are forwarding to a Gmail account, it will most likely appear in the main inbox on the forwarded account.
Requesting a new code will invalidate your previously requested code.`;

export const WelcomeDMTitle = `Verification successful`;
export const WelcomeDMContent = `Welcome to the server, please follow the rules`;

export const verifyMailSubject = `${env.SOCIETY_NAME} Discord Verification`;
export const zIDEmail = (zID: string) => `${zID}@unsw.edu.au`;
