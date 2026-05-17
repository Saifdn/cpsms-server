import nodemailer from "nodemailer";
import QRCode from "qrcode";


export const sendBookingConfirmation = async (booking) => {
  try {
    // ── QR Code ────────────────────────────────────────────────────────────
    const qrBuffer = await QRCode.toBuffer(booking.bookingNumber, {
      type: "png",
      width: 320,
      margin: 2,
      color: { dark: "#8B2E20", light: "#FFFFFF" },
    });

    // ── Transporter ────────────────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ── Helpers ────────────────────────────────────────────────────────────
    const formatDate = (d) =>
      d
        ? new Date(d).toLocaleDateString("en-MY", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null;

    const sessionDate = booking.session?.date
      ? formatDate(booking.session.date)
      : null;

    const detailRow = (label, value) =>
      value
        ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE9E0; color: #6B6355;
                     font-family: Georgia, 'Times New Roman', serif; font-size: 13px;
                     width: 38%; vertical-align: top;">
            ${label}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #EDE9E0; color: #2C1A14;
                     font-family: Georgia, 'Times New Roman', serif; font-size: 13px;
                     font-weight: 600; vertical-align: top;">
            ${value}
          </td>
        </tr>`
        : "";

    // ── HTML ───────────────────────────────────────────────────────────────
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmation</title>
</head>
<body style="margin:0; padding:0; background-color:#F0EBE3;
             font-family: Georgia, 'Times New Roman', serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#F0EBE3; padding: 40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px; background-color:#FFFFFF;
                      border-radius: 2px;
                      box-shadow: 0 4px 32px rgba(139,46,32,0.10);">

          <!-- ══ HEADER BAND ══════════════════════════════════════════════ -->
          <tr>
            <td style="background-color:#8B2E20; padding: 0; border-radius: 2px 2px 0 0;">

              <!-- Top decorative stripe -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #C9783A 0%, #F3ECC0 50%, #C9783A 100%);"></td>
                </tr>
              </table>

              <!-- Logo -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 28px 40px 24px;">
                    <img src="cid:logoMark" alt="Kelab Fotokreatif Studio"
                         width="320" height="91"
                         style="display:block; margin:0 auto;" />
                  </td>
                </tr>
              </table>

              <!-- Bottom decorative stripe -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height: 3px; background: linear-gradient(90deg, transparent 0%, #C9783A 30%, #F3ECC0 50%, #C9783A 70%, transparent 100%);"></td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ══ CONFIRMATION BADGE ════════════════════════════════════════ -->
          <tr>
            <td align="center" style="background-color:#F5F0DC; padding: 28px 40px 24px;">

              <div style="display:inline-block;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background-color:#8B2E20; border-radius: 1px;
                                padding: 10px 28px;">
                      <span style="color:#F3ECC0; font-family: Georgia, 'Times New Roman', serif;
                                   font-size: 11px; letter-spacing: 5px; text-transform: uppercase;
                                   font-weight: 400;">
                        ✦ &nbsp; Booking Confirmed &nbsp; ✦
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="margin-top: 20px; color: #2C1A14;
                          font-family: Georgia, 'Times New Roman', serif;
                          font-size: 15px; line-height: 1.7; max-width: 440px;">
                Dear <strong>${booking.graduate?.fullName || "Valued Guest"}</strong>,
                <br/>
                We are delighted to confirm your booking with us.
                Please find your booking details below.
              </div>

            </td>
          </tr>

          <!-- ══ BOOKING NUMBER HIGHLIGHT ══════════════════════════════════ -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#F3ECC0; border-left: 4px solid #8B2E20;
                            margin: 0;">
                <tr>
                  <td style="padding: 16px 24px;">
                    <span style="font-family: Georgia, 'Times New Roman', serif;
                                 font-size: 11px; color: #6B6355; letter-spacing: 3px;
                                 text-transform: uppercase; display: block; margin-bottom: 4px;">
                      Booking Reference
                    </span>
                    <span style="font-family: 'Courier New', Courier, monospace;
                                 font-size: 20px; color: #8B2E20; font-weight: 700;
                                 letter-spacing: 3px;">
                      #${booking.bookingNumber}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ══ DETAILS TABLE ═════════════════════════════════════════════ -->
          <tr>
            <td style="padding: 32px 40px 8px;">
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 11px;
                          letter-spacing: 4px; text-transform: uppercase; color: #8B2E20;
                          margin-bottom: 16px;">
                Booking Details
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${detailRow("Package", booking.package?.name || "N/A")}
                ${sessionDate ? detailRow("Session Date", sessionDate) : ""}
                ${detailRow("Total Amount", `RM ${booking.totalAmount ?? "0"}`)}
                ${booking.notes ? detailRow("Notes", booking.notes) : ""}
              </table>
            </td>
          </tr>

          <!-- ══ DIVIDER ════════════════════════════════════════════════════ -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height: 1px; background: linear-gradient(90deg, transparent, #C9783A, transparent);"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ══ QR CODE SECTION ═══════════════════════════════════════════ -->
          <tr>
            <td align="center" style="padding: 32px 40px;">

              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 11px;
                          letter-spacing: 4px; text-transform: uppercase; color: #8B2E20;
                          margin-bottom: 6px;">
                Your Access Code
              </div>
              <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px;
                          color: #6B6355; margin-bottom: 20px;">
                Present this QR code on the day of your session
              </div>

              <!-- QR frame -->
              <table cellpadding="0" cellspacing="0" border="0"
                     style="margin: 0 auto; background-color:#FFFFFF;
                            border: 1px solid #EDE9E0;
                            box-shadow: 0 2px 16px rgba(139,46,32,0.08);">
                <tr>
                  <td style="padding: 20px;">
                    <!-- Corner decorations via border trick -->
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width:16px; height:16px; border-top:2px solid #8B2E20; border-left:2px solid #8B2E20;"></td>
                        <td style="width: 240px;"></td>
                        <td style="width:16px; height:16px; border-top:2px solid #8B2E20; border-right:2px solid #8B2E20;"></td>
                      </tr>
                      <tr>
                        <td></td>
                        <td align="center" style="padding: 12px 0;">
                          <img src="cid:qrCode"
                               alt="Booking QR Code — #${booking.bookingNumber}"
                               width="200" height="200"
                               style="display:block;" />
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td style="border-bottom:2px solid #8B2E20; border-left:2px solid #8B2E20;"></td>
                        <td></td>
                        <td style="border-bottom:2px solid #8B2E20; border-right:2px solid #8B2E20;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ══ CLOSING MESSAGE ═══════════════════════════════════════════ -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background-color:#F5F0DC; border-radius: 1px;">
                <tr>
                  <td style="padding: 24px 28px;">
                    <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 14px;
                                color: #2C1A14; line-height: 1.8;">
                      We look forward to capturing beautiful moments with you.
                      Should you have any questions, please do not hesitate to reach out.
                    </div>
                    <div style="margin-top: 16px; font-family: Georgia, 'Times New Roman', serif;
                                font-size: 14px; color: #8B2E20;">
                      Warm regards,<br/>
                      <strong>The Kelab Fotokreatif Team</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ══ FOOTER ════════════════════════════════════════════════════ -->
          <tr>
            <td style="background-color:#2C1A14; padding: 20px 40px; border-radius: 0 0 2px 2px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height: 1px; background: linear-gradient(90deg, transparent, #C9783A 30%, #F3ECC0 50%, #C9783A 70%, transparent);
                              margin-bottom: 16px;"></td>
                </tr>
              </table>
              <div style="text-align:center; margin-top: 14px;">
                <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 13px;
                            letter-spacing: 3px; color: #C9A880; text-transform: uppercase;
                            margin-bottom: 8px;">
                  Kelab Fotokreatif
                </div>
                <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 11px;
                            color: #6B5A4E; line-height: 1.8;">
                  This is an automated confirmation. Please do not reply to this email.<br/>
                  © ${new Date().getFullYear()} Kelab Fotokreatif. All rights reserved.
                </div>
              </div>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;

    // ── Logo: SVG → PNG via sharp ──────────────────────────────────────────
    // Your logo is 2917×830 viewBox (≈3.5:1). We render it at 640×182px
    // (2× for retina) with a transparent background, then the <img> tag
    // displays it at width=320 height=91 inside the email.
    // Most email clients block SVG; sharp rasterises it to a safe PNG.
    // Install: npm install sharp
    const { default: sharp } = await import("sharp");

    const logoSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg width="100%" height="100%" viewBox="0 0 2917 830" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><path d="M439.893,257.91l6.66,-200.619l254.3,0.284l48.722,94.391l154.468,-0.547l60.119,95.614l-211.892,79.899c-55.113,21.084 -87.296,71.642 -88.19,119.978c-0.978,52.874 26.621,102.383 86.821,124.162l186.699,66.524l-43.384,135.593l-727.307,0l-35.57,-231.428l57.12,0l11.566,52.587l0,-215.081c-21.611,-7.866 -30.183,-20.626 -30.273,-36.568c-0.583,-8.671 1.683,-15.785 6.636,-21.43c5.283,-6.022 13.623,-10.372 24.822,-13.161l82.643,-154.32l26.369,0l0,-26.382l19.53,0l0,-9.876l33.135,0l0,8.858l18.416,0l0,25.76l49.855,0l-7.591,192.475l-49.258,0l0,32.382l45.348,0l-6.573,116.725l-38.617,0l0,122.684c2.234,11.686 7.821,19.26 17.303,22.056l47.932,0c-11.505,-5.897 -19.211,-13.968 -23.243,-24.139l20.855,-342.416l42.037,0l40.912,340.076c-4.57,12.788 -12.744,20.764 -23.8,24.887l34.513,0l-41.487,-378.983l-49.596,0.015Zm-296.203,294.91l31.889,210.653l707.876,0l37.48,-115.019l-723.171,0l-16.387,-95.634l-37.687,0Zm56.086,-223.656c-8.469,1.596 -13.577,4.915 -13.333,14.296c0.204,7.856 5.971,13.099 13.333,12.067l0,-26.363Zm277.48,107.069l-13.936,147.316c1.835,8.715 7.231,13.013 16.983,12.911c9.037,-0.094 14.469,-2.626 17.623,-11.614l-20.67,-148.612Zm57.072,-352.645l0.64,58.526l171.51,0l-31.21,-58.526l-140.94,0Z" style="fill:#680202;"/><path d="M1275.982,480.653c-18.422,140.56 -152.747,206.299 -265.698,172.037l-250.906,-88.02c-57.018,-22.819 -80.802,-61.669 -81.163,-103.661c-2.074,-66.674 30.63,-107.324 89.338,-128.515l243.179,-91.051c45.677,-15.621 79.021,-10.133 104.73,-6.388c71.014,10.345 138.386,83.779 159.624,173.594c3.034,12.83 3.873,49.285 0.895,72.004Zm-381.665,-36.937c-1.738,112.041 110.667,179.443 194.11,167.412c90.293,-13.019 157.227,-98.739 151.502,-166.225c-9.062,-106.817 -76.986,-168.67 -167.352,-168.969c-94.13,-0.311 -176.685,66.253 -178.26,167.781Z" style="fill:#680202;"/><g transform="matrix(83.561384,0,0,83.561384,755.910285,739.602259)"></g><text x="300.892px" y="739.602px" style="font-family:'TimesNewRomanPS-ItalicMT', 'Times New Roman', serif;font-style:italic;font-size:83.561px;fill:#680202;">K R E <tspan x="519.874px 569.407px 590.297px 635.26px 656.151px " y="739.602px 739.602px 739.602px 739.602px 739.602px ">A T I</tspan> F</text><g transform="matrix(528.898173,0,0,528.898173,2804.133788,604.030026)"></g><text x="1344.189px" y="604.03px" style="font-family:'Arial-BoldMT', 'Arial', sans-serif;font-weight:700;font-size:528.898px;fill:#680202;">S<tspan x="1659.937px 1799.041px 2085.091px 2371.14px 2481.062px " y="604.03px 604.03px 604.03px 604.03px 604.03px ">tudio</tspan></text></svg>`;

    // Render at 2× for retina sharpness (640×182), display at 320×91 in HTML
    const logoBuffer = await sharp(Buffer.from(logoSvg))
      .resize(640, 182, { fit: "contain", background: { r: 139, g: 46, b: 32, alpha: 0 } })
      .png()
      .toBuffer();

    // ── Send ───────────────────────────────────────────────────────────────
    await transporter.sendMail({
      from: `"Kelab Fotokreatif" <${process.env.EMAIL_USER}>`,
      to: booking.graduate?.email,
      subject: `Booking Confirmed — #${booking.bookingNumber} ✦ Kelab Fotokreatif`,
      html: htmlContent,
      attachments: [
        {
          filename: `qr-${booking.bookingNumber}.png`,
          content: qrBuffer,
          cid: "qrCode",
        },
        {
          filename: "logo.png",
          content: logoBuffer,
          contentType: "image/png",
          cid: "logoMark",
        },
      ],
    });

    console.log(`✅ Booking confirmation sent to ${booking.graduate?.email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending booking email:", error);
    throw error;
  }
};