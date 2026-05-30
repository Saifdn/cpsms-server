import QRCode from "qrcode";
import { getResendClient } from "./mailTransport.js";

export const sendBookingConfirmation = async (booking) => {
  try {
    const qrBuffer = await QRCode.toBuffer(booking.bookingNumber, {
      type: "png",
      width: 360,
      margin: 2,
      color: { dark: "#8B3020", light: "#FFFFFF" },
    });
    const resend = getResendClient();

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

    const formatTime = (t) => {
      if (!t) return null;
      const [h, m] = t.split(":").map(Number);
      const suffix = h >= 12 ? "PM" : "AM";
      const hour = h % 12 || 12;
      return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
    };

    const fmt = (n) =>
      typeof n === "number" ? n.toFixed(2) : parseFloat(n || 0).toFixed(2);

    const sessionDate = formatDate(booking.session?.date);
    const sessionStart = formatTime(booking.session?.startTime);
    const sessionEnd = formatTime(booking.session?.endTime);
    const sessionTime =
      sessionStart && sessionEnd ? `${sessionStart} – ${sessionEnd}` : sessionStart;

    const addons = Array.isArray(booking.addons) ? booking.addons : [];
    const hasAddons = addons.length > 0;
    const packagePrice = booking.package?.price ?? 0;
    const addonTotal = addons.reduce((sum, a) => sum + (a.price ?? 0), 0);
    const totalPrice = booking.totalPrice ?? packagePrice + addonTotal;

    const services = Array.isArray(booking.package?.services)
      ? booking.package.services
      : [];

    // Colour tokens (oklch → email-safe hex)
    // --primary             oklch(0.4650 0.1470 24.9381) → #8B3020
    // --primary-foreground  oklch(1.0000 0 0)            → #FFFFFF
    // --secondary           oklch(0.9625 0.0385 89.0943) → #F5F0DC
    // --secondary-foreground oklch(0.4847 0.1022 75.1153) → #7A6834
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

    // ── Row builders ───────────────────────────────────────────────────────
    const F = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;

    const detailRow = (label, value) =>
      value
        ? `<tr>
            <td style="padding:12px 0;border-bottom:1px solid ${C.border};
                       color:${C.muted};font-family:${F};font-size:13px;
                       width:36%;vertical-align:top;font-weight:400;">${label}</td>
            <td style="padding:12px 0;border-bottom:1px solid ${C.border};
                       color:${C.body};font-family:${F};font-size:13px;
                       font-weight:500;vertical-align:top;">${value}</td>
          </tr>`
        : "";

    const priceRow = (label, amount, isTotal = false) =>
      isTotal
        ? `<tr>
            <td style="padding:14px 20px;background-color:${C.secondary};
                       color:${C.body};font-family:${F};font-size:14px;font-weight:600;">
              Total Amount
            </td>
            <td style="padding:14px 20px;background-color:${C.secondary};
                       color:${C.primary};font-family:${F};font-size:16px;font-weight:700;
                       text-align:right;">
              RM ${fmt(amount)}
            </td>
          </tr>`
        : `<tr>
            <td style="padding:11px 0;border-bottom:1px solid ${C.border};
                       color:${C.muted};font-family:${F};font-size:13px;">${label}</td>
            <td style="padding:11px 0;border-bottom:1px solid ${C.border};
                       color:${C.body};font-family:${F};font-size:13px;text-align:right;">
              RM ${fmt(amount)}
            </td>
          </tr>`;

    const serviceListHtml =
      services.length > 0
        ? services
            .map(
              (s) =>
                `<span style="display:inline-block;background:${C.secondary};
                  color:${C.secondaryFg};font-family:${F};font-size:11px;
                  padding:3px 9px;border-radius:3px;margin:2px 3px 2px 0;">${s}</span>`
            )
            .join("")
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
              Booking Confirmed
            </div>
            <div style="font-family:${F};font-size:22px;font-weight:600;
                        color:${C.body};margin-bottom:10px;line-height:1.3;">
              Hello, ${booking.graduate?.fullName || "Valued Guest"}
            </div>
            <div style="font-family:${F};font-size:14px;color:${C.muted};line-height:1.6;">
              Your session has been successfully booked. Please review the details
              below and keep your QR code ready for check-in.
              ${booking.graduate?.phone ? `<br/>Contact: <span style="color:${C.body};font-weight:500;">${booking.graduate.phone}</span>` : ""}
            </div>
          </td>
        </tr>

        <!-- ══ BOOKING REFERENCE ═══════════════════════════════════════════ -->
        <tr>
          <td style="padding:24px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background-color:${C.secondary};border-radius:4px;">
              <tr>
                <td style="padding:16px 20px;">
                  <div style="font-family:${F};font-size:11px;letter-spacing:1.5px;
                              text-transform:uppercase;color:${C.secondaryFg};
                              font-weight:500;margin-bottom:6px;">
                    Booking Reference
                  </div>
                  <div style="font-family:'Courier New',Courier,monospace;font-size:20px;
                              color:${C.primary};font-weight:700;letter-spacing:2px;">
                    ${booking.bookingNumber}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ SECTION DIVIDER ════════════════════════════════════════════ -->
        <tr>
          <td style="padding:28px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:1px;background-color:${C.border};"></td></tr>
            </table>
          </td>
        </tr>

        <!-- ══ SESSION DETAILS ════════════════════════════════════════════ -->
        <tr>
          <td style="padding:24px 48px 0;">
            <div style="font-family:${F};font-size:11px;letter-spacing:1.5px;
                        text-transform:uppercase;color:${C.muted};
                        font-weight:600;margin-bottom:4px;">
              Session Details
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${detailRow("Package", booking.package?.name || "N/A")}
              ${
                services.length > 0
                  ? `<tr>
                      <td style="padding:12px 0;border-bottom:1px solid ${C.border};
                                 color:${C.muted};font-family:${F};font-size:13px;
                                 width:36%;vertical-align:top;">Includes</td>
                      <td style="padding:12px 0;border-bottom:1px solid ${C.border};
                                 vertical-align:top;">${serviceListHtml}</td>
                    </tr>`
                  : ""
              }
              ${sessionDate ? detailRow("Date", sessionDate) : ""}
              ${sessionTime ? detailRow("Time", sessionTime) : ""}
              ${booking.notes ? detailRow("Notes", booking.notes) : ""}
            </table>
          </td>
        </tr>

        <!-- ══ SECTION DIVIDER ════════════════════════════════════════════ -->
        <tr>
          <td style="padding:24px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:1px;background-color:${C.border};"></td></tr>
            </table>
          </td>
        </tr>

        <!-- ══ PAYMENT SUMMARY ════════════════════════════════════════════ -->
        <tr>
          <td style="padding:24px 48px 0;">
            <div style="font-family:${F};font-size:11px;letter-spacing:1.5px;
                        text-transform:uppercase;color:${C.muted};
                        font-weight:600;margin-bottom:4px;">
              Payment Summary
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${priceRow(booking.package?.name || "Package", packagePrice)}
              ${addons.map((a) => priceRow(a.name, a.price)).join("")}
            </table>
          </td>
        </tr>
        <!-- Total row — full-bleed inside card padding -->
        <tr>
          <td style="padding:12px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border-radius:4px;overflow:hidden;">
              ${priceRow("Total Amount", totalPrice, true)}
            </table>
          </td>
        </tr>

        <!-- ══ SECTION DIVIDER ════════════════════════════════════════════ -->
        <tr>
          <td style="padding:28px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:1px;background-color:${C.border};"></td></tr>
            </table>
          </td>
        </tr>

        <!-- ══ QR CODE + CTA ═════════════════════════════════════════════ -->
        <tr>
          <td align="center" style="padding:32px 48px;">
            <div style="font-family:${F};font-size:11px;letter-spacing:1.5px;
                        text-transform:uppercase;color:${C.muted};font-weight:600;
                        margin-bottom:6px;">
              Your Access Code
            </div>
            <div style="font-family:${F};font-size:13px;color:${C.muted};
                        margin-bottom:24px;line-height:1.5;">
              Your QR code is attached to this email. Present it upon arrival on the day of your session.
            </div>
            <div style="font-family:'Courier New',Courier,monospace;font-size:14px;
                        color:${C.primary};font-weight:700;letter-spacing:2px;
                        margin-bottom:28px;">
              ${booking.bookingNumber}
            </div>
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td align="center" style="background-color:${C.primary};border-radius:4px;">
                  <a href="${process.env.CLIENT_URL}/my-bookings/${booking._id}"
                     style="display:inline-block;padding:14px 36px;
                            font-family:${F};font-size:14px;font-weight:600;
                            color:#FFFFFF;text-decoration:none;
                            letter-spacing:0.3px;border-radius:4px;">
                    View Booking Details
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ CLOSING ════════════════════════════════════════════════════ -->
        <tr>
          <td style="padding:0 48px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border-top:1px solid ${C.border};">
              <tr>
                <td style="padding:24px 0 0;">
                  <div style="font-family:${F};font-size:13px;color:${C.muted};
                              line-height:1.7;">
                    We look forward to capturing beautiful moments with you.
                    If you have any questions, please do not hesitate to reach out.
                  </div>
                  <div style="margin-top:16px;font-family:${F};font-size:13px;
                              color:${C.body};">
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

    await resend.emails.send({
      from: `Kelab Fotokreatif <${process.env.EMAIL_FROM}>`,
      to: booking.graduate?.email,
      subject: `Booking Confirmed — #${booking.bookingNumber} - Kelab Fotokreatif`,
      html: htmlContent,
      attachments: [
        { filename: `${booking.bookingNumber}-qrcode.png`, content: qrBuffer },
      ],
    });

    console.log(`✅ Booking confirmation sent to ${booking.graduate?.email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending booking email:", {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      syscall: error?.syscall,
      errno: error?.errno,
      address: error?.address,
      port: error?.port,
    });
    return false;
  }
};
