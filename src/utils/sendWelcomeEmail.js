import { getResendClient } from "./mailTransport.js";

const roleLabel = (role) => {
  const map = {
    graduate:   "Graduate",
    staff:      "Staff",
    admin:      "Admin",
    superadmin: "Super Admin",
  };
  return map[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
};

export const sendWelcomeEmail = async ({ fullName, email, password, role, phone, department }) => {
  try {
    // ── Colour tokens (same as sendBookingEmail) ───────────────────────────
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

    const label = roleLabel(role);

    // ── Credential row helper ──────────────────────────────────────────────
    const credRow = (key, value, mono = false) =>
      value
        ? `<tr>
            <td style="padding:10px 0;border-bottom:1px solid ${C.border};
                       font-family:${F};font-size:13px;color:${C.muted};
                       width:34%;vertical-align:top;">${key}</td>
            <td style="padding:10px 0;border-bottom:1px solid ${C.border};
                       font-family:${mono ? "'Courier New',Courier,monospace" : F};
                       font-size:${mono ? "15px" : "13px"};
                       color:${mono ? C.primary : C.body};
                       font-weight:${mono ? "700" : "500"};
                       vertical-align:top;letter-spacing:${mono ? "1px" : "normal"};">
              ${value}
            </td>
          </tr>`
        : "";


    // ── HTML ───────────────────────────────────────────────────────────────
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account Created</title>
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
              Welcome to Kelab Fotokreatif
            </div>
            <div style="font-family:${F};font-size:22px;font-weight:600;
                        color:${C.body};margin-bottom:10px;line-height:1.3;">
              Hello, ${fullName}
            </div>
            <div style="font-family:${F};font-size:14px;color:${C.muted};line-height:1.7;">
              Your <strong style="color:${C.body};">${label}</strong> account has been
              successfully created. Use the credentials below to log in for the first time.
              ${phone ? `<br/>Contact: <span style="color:${C.body};font-weight:500;">${phone}</span>` : ""}
            </div>
          </td>
        </tr>

        <!-- ══ CREDENTIALS BLOCK ══════════════════════════════════════════ -->
        <tr>
          <td style="padding:24px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background-color:${C.secondary};border-radius:4px;">
              <tr>
                <td style="padding:16px 20px 4px;">
                  <div style="font-family:${F};font-size:11px;letter-spacing:1.5px;
                              text-transform:uppercase;color:${C.secondaryFg};
                              font-weight:600;margin-bottom:8px;">
                    Your Login Credentials
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 20px 16px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${credRow("Email", email)}
                    ${credRow("Password", password, true)}
                    ${credRow("Role", label)}
                    ${department ? credRow("Department", department) : ""}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ SECURITY NOTICE ════════════════════════════════════════════ -->
        <tr>
          <td style="padding:24px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:1px solid ${C.border};border-left:3px solid ${C.primary};
                          border-radius:0 4px 4px 0;">
              <tr>
                <td style="padding:14px 18px;">
                  <div style="font-family:${F};font-size:11px;letter-spacing:1.5px;
                              text-transform:uppercase;color:${C.primary};font-weight:600;
                              margin-bottom:6px;">
                    Security Notice
                  </div>
                  <div style="font-family:${F};font-size:13px;color:${C.muted};line-height:1.6;">
                    Please change your password immediately after your first login.
                    Do not share your credentials with anyone.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ CLOSING ════════════════════════════════════════════════════ -->
        <tr>
          <td style="padding:28px 48px 36px;">
            <div style="font-family:${F};font-size:13px;color:${C.muted};line-height:1.7;">
              If you have any questions or did not expect this email, please contact
              your administrator immediately.
            </div>
            <div style="margin-top:16px;font-family:${F};font-size:13px;color:${C.body};">
              Warm regards,<br/>
              <span style="font-weight:600;color:${C.primary};">
                The Kelab Fotokreatif Team
              </span>
            </div>
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
      subject: `Your ${label} Account — Kelab Fotokreatif`,
      html,
    });

    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending welcome email:", {
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
