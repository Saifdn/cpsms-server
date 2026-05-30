import { getResendClient } from "./mailTransport.js";

export const sendResetPasswordEmail = async ({ email, fullName, resetUrl }) => {
  try {
    const C = {
      primary:    "#8B3020",
      primaryFg:  "#FFFFFF",
      secondary:  "#F5F0DC",
      secondaryFg:"#7A6834",
      body:       "#1C1C1C",
      muted:      "#6B6355",
      border:     "#E8E3DC",
      bg:         "#F4F1EC",
    };
    const F = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;


    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:${F};">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${C.bg};padding:40px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;background-color:#FFFFFF;
                    border:1px solid ${C.border};border-radius:4px;">

        <!-- ══ PRIMARY TOP BAR ════════════════════════════════════════════ -->
        <tr>
          <td style="background-color:${C.primary};height:4px;
                     border-radius:4px 4px 0 0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- ══ HEADER — logo ══════════════════════════════════════════════ -->
        <tr>
          <td align="center" style="padding:36px 48px 32px;
                                    border-bottom:1px solid ${C.border};">
            <img src="${process.env.BACKEND_URL}/logo.png" alt="Kelab Fotokreatif Studio"
                 width="240" height="68"
                 style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- ══ GREETING ═══════════════════════════════════════════════════ -->
        <tr>
          <td style="padding:36px 48px 0;">
            <div style="font-family:${F};font-size:11px;letter-spacing:1.5px;
                        text-transform:uppercase;color:${C.primary};
                        font-weight:600;margin-bottom:12px;">
              Password Reset Request
            </div>
            <div style="font-family:${F};font-size:22px;font-weight:600;
                        color:${C.body};margin-bottom:10px;line-height:1.3;">
              Hello, ${fullName || "there"}
            </div>
            <div style="font-family:${F};font-size:14px;color:${C.muted};line-height:1.7;">
              We received a request to reset the password for your account associated
              with <strong style="color:${C.body};">${email}</strong>.
              Click the button below to choose a new password.
            </div>
          </td>
        </tr>

        <!-- ══ CTA BUTTON ═════════════════════════════════════════════════ -->
        <tr>
          <td align="center" style="padding:32px 48px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background-color:${C.primary};
                                          border-radius:4px;">
                  <a href="${resetUrl}"
                     style="display:inline-block;padding:14px 36px;
                            font-family:${F};font-size:14px;font-weight:600;
                            color:${C.primaryFg};text-decoration:none;
                            letter-spacing:0.3px;border-radius:4px;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ EXPIRY NOTICE ══════════════════════════════════════════════ -->
        <tr>
          <td style="padding:0 48px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background-color:${C.secondary};border-radius:4px;">
              <tr>
                <td style="padding:14px 20px;">
                  <div style="font-family:${F};font-size:13px;color:${C.secondaryFg};
                              line-height:1.6;">
                    This link will expire in <strong>10 minutes</strong>.
                    If you did not request a password reset, you can safely ignore this email —
                    your password will remain unchanged.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ FALLBACK URL ════════════════════════════════════════════════ -->
        <tr>
          <td style="padding:20px 48px 0;">
            <div style="font-family:${F};font-size:12px;color:${C.muted};line-height:1.7;">
              If the button above does not work, copy and paste the link below
              into your browser:
            </div>
            <div style="margin-top:8px;font-family:'Courier New',Courier,monospace;
                        font-size:11px;color:${C.primary};word-break:break-all;
                        line-height:1.6;">
              ${resetUrl}
            </div>
          </td>
        </tr>

        <!-- ══ CLOSING ════════════════════════════════════════════════════ -->
        <tr>
          <td style="padding:28px 48px 36px;border-top:1px solid ${C.border};margin-top:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-top:24px;">
                  <div style="font-family:${F};font-size:13px;color:${C.muted};line-height:1.7;">
                    If you need any assistance, please contact your administrator.
                  </div>
                  <div style="margin-top:16px;font-family:${F};font-size:13px;color:${C.body};">
                    Warm regards,<br/>
                    <span style="font-weight:600;color:${C.primary};">
                      The Kelab Fotokreatif Team
                    </span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ FOOTER ═════════════════════════════════════════════════════ -->
        <tr>
          <td style="background-color:${C.secondary};padding:20px 48px;
                     border-top:1px solid ${C.border};
                     border-radius:0 0 4px 4px;">
            <div style="font-family:${F};font-size:11px;color:${C.muted};
                        line-height:1.8;text-align:center;">
              Kelab Fotokreatif &nbsp;·&nbsp; All rights reserved © ${new Date().getFullYear()}<br/>
              This is an automated email. Please do not reply directly to this message.
            </div>
          </td>
        </tr>

      </table>
      <!-- /Card -->

    </td></tr>
  </table>

</body>
</html>`;

    const resend = getResendClient();

    await resend.emails.send({
      from: `Kelab Fotokreatif <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Reset Your Password — Kelab Fotokreatif",
      html,
    });

    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending reset password email:", {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      syscall: error?.syscall,
      errno: error?.errno,
      address: error?.address,
      port: error?.port,
    });
    throw error;
  }
};
