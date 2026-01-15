export function OTPEmail({
  code,
  expiryMinutes,
}: {
  code: string;
  expiryMinutes: number;
}) {
  return (
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto">
      <h2>Linux Society Discord Verification</h2>
      <p>Your OTP code is:</p>
      <div
        style="
                background-color: #f5f5f5;
                padding: 15px;
                text-align: center;
                font-size: 24px;
                letter-spacing: 5px;
                margin: 20px 0;
            "
      >
        <strong safe>{code}</strong>
      </div>
      <p>This code will expire in {expiryMinutes} minutes.</p>
      <p>
        Regards,
        <br />
        Linux Society @ UNSW
      </p>
    </div>
  );
}
