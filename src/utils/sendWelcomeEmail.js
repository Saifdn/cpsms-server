import nodemailer from "nodemailer";

const LOGO_SVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg width="100%" height="100%" viewBox="0 0 2917 830" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><path d="M439.893,257.91l6.66,-200.619l254.3,0.284l48.722,94.391l154.468,-0.547l60.119,95.614l-211.892,79.899c-55.113,21.084 -87.296,71.642 -88.19,119.978c-0.978,52.874 26.621,102.383 86.821,124.162l186.699,66.524l-43.384,135.593l-727.307,0l-35.57,-231.428l57.12,0l11.566,52.587l0,-215.081c-21.611,-7.866 -30.183,-20.626 -30.273,-36.568c-0.583,-8.671 1.683,-15.785 6.636,-21.43c5.283,-6.022 13.623,-10.372 24.822,-13.161l82.643,-154.32l26.369,0l0,-26.382l19.53,0l0,-9.876l33.135,0l0,8.858l18.416,0l0,25.76l49.855,0l-7.591,192.475l-49.258,0l0,32.382l45.348,0l-6.573,116.725l-38.617,0l0,122.684c2.234,11.686 7.821,19.26 17.303,22.056l47.932,0c-11.505,-5.897 -19.211,-13.968 -23.243,-24.139l20.855,-342.416l42.037,0l40.912,340.076c-4.57,12.788 -12.744,20.764 -23.8,24.887l34.513,0l-41.487,-378.983l-49.596,0.015Zm-296.203,294.91l31.889,210.653l707.876,0l37.48,-115.019l-723.171,0l-16.387,-95.634l-37.687,0Zm56.086,-223.656c-8.469,1.596 -13.577,4.915 -13.333,14.296c0.204,7.856 5.971,13.099 13.333,12.067l0,-26.363Zm277.48,107.069l-13.936,147.316c1.835,8.715 7.231,13.013 16.983,12.911c9.037,-0.094 14.469,-2.626 17.623,-11.614l-20.67,-148.612Zm57.072,-352.645l0.64,58.526l171.51,0l-31.21,-58.526l-140.94,0Z" style="fill:#680202;"/><path d="M1275.982,480.653c-18.422,140.56 -152.747,206.299 -265.698,172.037l-250.906,-88.02c-57.018,-22.819 -80.802,-61.669 -81.163,-103.661c-2.074,-66.674 30.63,-107.324 89.338,-128.515l243.179,-91.051c45.677,-15.621 79.021,-10.133 104.73,-6.388c71.014,10.345 138.386,83.779 159.624,173.594c3.034,12.83 3.873,49.285 0.895,72.004Zm-381.665,-36.937c-1.738,112.041 110.667,179.443 194.11,167.412c90.293,-13.019 157.227,-98.739 151.502,-166.225c-9.062,-106.817 -76.986,-168.67 -167.352,-168.969c-94.13,-0.311 -176.685,66.253 -178.26,167.781Z" style="fill:#680202;"/><g transform="matrix(83.561384,0,0,83.561384,755.910285,739.602259)"></g><text x="300.892px" y="739.602px" style="font-family:'TimesNewRomanPS-ItalicMT', 'Times New Roman', serif;font-style:italic;font-size:83.561px;fill:#680202;">K R E <tspan x="519.874px 569.407px 590.297px 635.26px 656.151px " y="739.602px 739.602px 739.602px 739.602px 739.602px ">A T I</tspan> F</text><g transform="matrix(528.898173,0,0,528.898173,2804.133788,604.030026)"></g><text x="1344.189px" y="604.03px" style="font-family:'Arial-BoldMT', 'Arial', sans-serif;font-weight:700;font-size:528.898px;fill:#680202;">S<tspan x="1659.937px 1799.041px 2085.091px 2371.14px 2481.062px " y="604.03px 604.03px 604.03px 604.03px 604.03px ">tudio</tspan></text></svg>`;

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
            <img src="cid:logoMark" alt="Kelab Fotokreatif Studio"
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

    // ── Logo: SVG → PNG via sharp ──────────────────────────────────────────
    const { default: sharp } = await import("sharp");
    const logoBuffer = await sharp(Buffer.from(LOGO_SVG))
      .resize(480, 136, { fit: "contain", background: { r: 139, g: 48, b: 32, alpha: 0 } })
      .png()
      .toBuffer();

    // ── Send ───────────────────────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      service: "gmail",
      family: 4,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Kelab Fotokreatif" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your ${label} Account — Kelab Fotokreatif`,
      html,
      attachments: [
        {
          filename: "logo.png",
          content: logoBuffer,
          contentType: "image/png",
          cid: "logoMark",
        },
      ],
    });

    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw error;
  }
};
