import { getResendClient } from "./mailTransport.js";

export const sendFrameOrderConfirmation = async (order) => {
  try {
    const resend = getResendClient();

    const fmt = (n) =>
      typeof n === "number" ? n.toFixed(2) : parseFloat(n || 0).toFixed(2);

    const C = {
      primary:     "#8B3020",
      primaryFg:   "#FFFFFF",
      secondary:   "#F5F0DC",
      secondaryFg: "#7A6834",
      body:        "#1C1C1C",
      muted:       "#6B6355",
      border:      "#E8E3DC",
      bg:          "#F4F1EC",
    };

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

    const items = Array.isArray(order.items) ? order.items : [];
    const totalPrice = order.totalPrice ?? items.reduce((s, i) => s + i.price * i.quantity, 0);

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:${F};">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${C.bg};padding:40px 16px;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;background-color:#FFFFFF;
                    border:1px solid ${C.border};border-radius:4px;">

        <tr>
          <td style="background-color:${C.primary};height:4px;
                     border-radius:4px 4px 0 0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <tr>
          <td align="center" style="padding:36px 48px 32px;
                                    border-bottom:1px solid ${C.border};">
            <img src="${process.env.BACKEND_URL}/logo.png" alt="Kelab Fotokreatif Studio"
                 width="240" height="68"
                 style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <tr>
          <td style="padding:36px 48px 0;">
            <div style="font-family:${F};font-size:11px;letter-spacing:1.5px;
                        text-transform:uppercase;color:${C.primary};
                        font-weight:600;margin-bottom:12px;">
              Order Confirmed
            </div>
            <div style="font-family:${F};font-size:22px;font-weight:600;
                        color:${C.body};margin-bottom:10px;line-height:1.3;">
              Hello, ${order.graduate?.fullName || "Valued Customer"}
            </div>
            <div style="font-family:${F};font-size:14px;color:${C.muted};line-height:1.6;">
              Your frame order has been successfully placed. We will prepare your order
              and arrange delivery once it is ready.
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background-color:${C.secondary};border-radius:4px;">
              <tr>
                <td style="padding:16px 20px;">
                  <div style="font-family:${F};font-size:11px;letter-spacing:1.5px;
                              text-transform:uppercase;color:${C.secondaryFg};
                              font-weight:500;margin-bottom:6px;">
                    Order Reference
                  </div>
                  <div style="font-family:'Courier New',Courier,monospace;font-size:20px;
                              color:${C.primary};font-weight:700;letter-spacing:2px;">
                    ${order.orderNumber}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:1px;background-color:${C.border};"></td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 48px 0;">
            <div style="font-family:${F};font-size:11px;letter-spacing:1.5px;
                        text-transform:uppercase;color:${C.muted};
                        font-weight:600;margin-bottom:4px;">
              Order Details
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${items.map((i) => detailRow(`${i.frame?.name || "Frame"} × ${i.quantity}`, `RM ${fmt(i.price * i.quantity)}`)).join("")}
              ${order.notes ? detailRow("Notes", order.notes) : ""}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:1px;background-color:${C.border};"></td></tr>
            </table>
          </td>
        </tr>

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
              ${items.map((i) => priceRow(`${i.frame?.name || "Frame"} × ${i.quantity}`, i.price * i.quantity)).join("")}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border-radius:4px;overflow:hidden;">
              ${priceRow("Total Amount", totalPrice, true)}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:1px;background-color:${C.border};"></td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:32px 48px;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td align="center" style="background-color:${C.primary};border-radius:4px;">
                  <a href="${process.env.CLIENT_URL}/my-orders/${order._id}"
                     style="display:inline-block;padding:14px 36px;
                            font-family:${F};font-size:14px;font-weight:600;
                            color:#FFFFFF;text-decoration:none;
                            letter-spacing:0.3px;border-radius:4px;">
                    View Order Details
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 48px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border-top:1px solid ${C.border};">
              <tr>
                <td style="padding:24px 0 0;">
                  <div style="font-family:${F};font-size:13px;color:${C.muted};line-height:1.7;">
                    Thank you for your order. We will notify you once your frames are on the way.
                    If you have any questions, please do not hesitate to reach out.
                  </div>
                  <div style="margin-top:16px;font-family:${F};font-size:13px;color:${C.body};">
                    Warm regards,<br/>
                    <span style="font-weight:600;color:${C.primary};">The Kelab Fotokreatif Team</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background-color:${C.secondary};padding:20px 48px;
                     border-top:1px solid ${C.border};border-radius:0 0 4px 4px;">
            <div style="font-family:${F};font-size:11px;color:${C.muted};
                        line-height:1.8;text-align:center;">
              Kelab Fotokreatif &nbsp;·&nbsp; All rights reserved © ${new Date().getFullYear()}<br/>
              This is an automated email. Please do not reply directly to this message.
            </div>
          </td>
        </tr>

      </table>

    </td></tr>
  </table>

</body>
</html>`;

    await resend.emails.send({
      from: `Kelab Fotokreatif <${process.env.EMAIL_FROM}>`,
      to: order.graduate?.email,
      subject: `Order Confirmed — #${order.orderNumber} - Kelab Fotokreatif`,
      html: htmlContent,
    });

    console.log(`✅ Frame order confirmation sent to ${order.graduate?.email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending frame order email:", {
      message: error?.message,
      code: error?.code,
    });
    return false;
  }
};
