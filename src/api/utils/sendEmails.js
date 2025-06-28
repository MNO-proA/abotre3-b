// @ts-ignore
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = {
  sendClientReceipt: async ({ email, products, totalAmount, orderRef }) => {
    try {
      console.log("[sendClientReceipt] Preparing receipt email...");

      const productRows = products
        .map(
          (p) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <div style="font-weight: 500; color: #2d3748; margin-bottom: 4px;">${p.name}</div>
            <div style="font-size: 14px; color: #718096;">Qty: ${p.quantity}</div>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 500; color: #2d3748;">
            GHS ${(p.price * p.quantity).toFixed(2)}
          </td>
        </tr>
      `
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Purchase Receipt</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.1); display: inline-block; padding: 16px; border-radius: 50%; margin-bottom: 16px;">
                <div style="width: 40px; height: 40px; background-color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; color: #667eea;">✓</div>
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Payment Successful!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Thank you for your purchase</p>
            </div>

            <!-- Receipt Content -->
            <div style="padding: 40px 30px;">
              
              <!-- Order Reference -->
              <div style="background-color: #f8fafc; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 14px; color: #718096; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Order Reference</div>
                <div style="font-size: 18px; font-weight: 600; color: #2d3748; font-family: 'Courier New', monospace;">${orderRef}</div>
              </div>

              <!-- Items -->
              <div style="margin-bottom: 30px;">
                <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Order Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${productRows}
                </table>
              </div>

              <!-- Total -->
              <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 30px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="font-size: 18px; font-weight: 600; color: #2d3748; vertical-align: middle;">Total Paid</td>
                    <td style="text-align: right; font-size: 24px; font-weight: 700; color: #48bb78; vertical-align: middle;">GHS ${totalAmount}</td>
                  </tr>
                </table>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                  <span style="display: inline-block; background-color: #48bb78; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">✓ Paid</span>
                </div>
              </div>

              <!-- Footer Message -->
              <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e2e8f0;">
                <p style="color: #718096; margin: 0; font-size: 14px;">We'll send you tracking information once your order ships.</p>
                <p style="color: #a0aec0; margin: 12px 0 0 0; font-size: 12px;">Questions? Reply to this email or contact our support team.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await resend.emails.send({
        from: "store@qodexcore.com",
        to: email,
        subject: `Receipt for Order ${orderRef} - Payment Confirmed`,
        html,
      });

      console.log("[sendClientReceipt] Email sent:", response);
      return response;
    } catch (error) {
      console.error("[sendClientReceipt] Error sending email:", error);
      throw error;
    }
  },
  sendAdminNotification: async ({
    adminEmail,
    customer,
    products,
    orderRef,
    totalAmount,
    paymentMethod,
  }) => {
    try {
      console.log("[sendAdminNotification] Preparing admin alert...");

      const isCash = paymentMethod === "cashOnDelivery";
      const paymentMethodLabel = isCash
        ? "Cash on Delivery"
        : "Online Payment (Paystack)";
      const paymentInstructions = isCash
        ? "The customer will pay upon delivery. Kindly collect the payment in full before handing over the items."
        : "Payment has been successfully received via Paystack. You can proceed to package and dispatch the order.";


        const paymentStatusSection = isCash
        ? `
          <div style="background: linear-gradient(135deg, #f6ad55, #dd6b20); padding: 28px; border-radius: 16px; text-align: center; margin-bottom: 32px;">
            <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Total Amount</div>
            <div style="color: white; font-size: 32px; font-weight: 700; margin-bottom: 12px;">GHS ${totalAmount}</div>
            <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 8px 20px; border-radius: 25px;">
              <span style="color: white; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">⏳ Payment Pending</span>
            </div>
          </div>
        `
        : `
          <div style="background: linear-gradient(135deg, #48bb78, #38a169); padding: 28px; border-radius: 16px; text-align: center; margin-bottom: 32px;">
            <div style="color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Total Amount</div>
            <div style="color: white; font-size: 32px; font-weight: 700; margin-bottom: 12px;">GHS ${totalAmount}</div>
            <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 8px 20px; border-radius: 25px;">
              <span style="color: white; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">✓ Payment Confirmed</span>
            </div>
          </div>
        `;





      const productRows = products
        .map(
          (p) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 500; color: #2d3748; margin-bottom: 4px;">${p.name}</div>
            <div style="font-size: 12px; color: #a0aec0;">ID: ${p.simple_id} • SKU: ${p.sku}</div>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #718096; font-weight: 500;">
            ${p.quantity}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500; color: #2d3748;">
            GHS ${(p.price * p.quantity).toFixed(2)}
          </td>
        </tr>
      `
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Order Notification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%); padding: 32px 30px; position: relative; overflow: hidden;">
              <div style="position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: rgba(255,255,255,0.05); border-radius: 50%; transform: translate(30px, -30px);"></div>
              <div style="position: relative; z-index: 1;">
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                  <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #48bb78, #38a169); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
                    <div style="color: white; font-size: 20px; font-weight: bold;">🛒</div>
                  </div>
                  <div>
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">New Order Received</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 14px;">Payment confirmed and ready for processing</p>
                  </div>
                </div>
                
                <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; border-left: 4px solid #48bb78;">
                  <div style="font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Order Reference</div>
                  <div style="color: white; font-size: 20px; font-weight: 700; font-family: 'Courier New', monospace;">${orderRef}</div>
                </div>
              </div>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              
              <!-- Customer Info -->
              <div style="margin-bottom: 32px;">
                <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                  <span style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; color: white; font-size: 14px;">👤</span>
                  Customer Information
                </h3>
                
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px;">
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                      <div style="font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Full Name</div>
                      <div style="font-weight: 600; color: #2d3748;">${customer.fullName}</div>
                    </div>
                    <div>
                      <div style="font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Email</div>
                      <div style="color: #4299e1; font-weight: 500;">${customer.email}</div>
                    </div>
                    <div>
                      <div style="font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Phone</div>
                      <div style="font-weight: 500; color: #2d3748;">${customer.phone}</div>
                    </div>
                  </div>
                  
                  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                    <div style="font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Delivery Address</div>
                    <div style="color: #2d3748; line-height: 1.5;">${customer.destination_address}</div>
                  </div>
                </div>
              </div>

              <!-- Order Items -->
              <div style="margin-bottom: 32px;">
                <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
                  <span style="width: 32px; height: 32px; background: linear-gradient(135deg, #ed8936, #dd6b20); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; color: white; font-size: 14px;">📦</span>
                  Order Items
                </h3>
                
                <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background-color: #f8fafc;">
                        <th style="padding: 16px; text-align: left; font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Product</th>
                        <th style="padding: 16px; text-align: center; font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Qty</th>
                        <th style="padding: 16px; text-align: right; font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${productRows}
                    </tbody>
                  </table>
                </div>
              </div>

                <!-- Payment Summary -->
                ${paymentStatusSection}

             <!-- Action Required -->
            <div style="background-color: #fef5e7; border: 1px solid #f6e05e; border-radius: 12px; padding: 24px; text-align: center;">
              <div style="color: #744210; font-size: 16px; font-weight: 600; margin-bottom: 8px;">⚡ Action Required</div>
              <div style="color: #975a16; font-size: 14px; line-height: 1.5;">
                This order is ready for processing. Please review the items and prepare for fulfillment.<br /><br />

                <strong>Payment Method:</strong>
                <span style="font-weight: 600; color: #000;">${paymentMethodLabel}</span><br />
                ${paymentInstructions}
              </div>
            </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await resend.emails.send({
        from: "store@qodexcore.com",
        to: adminEmail || "admin@qodexcore.com",
        subject: `🚨 New Order Alert - ${orderRef} (GHS ${totalAmount})`,
        html,
      });

      console.log("[sendAdminNotification] Email sent:", response);
      return response;
    } catch (error) {
      console.error("[sendAdminNotification] Error sending email:", error);
      throw error;
    }
  },
};
