// path: ./src/utils/sendAdminNotification.js

// @ts-ignore
const resend = require("resend"); // or use nodemailer/resend/any email service

const resendClient = new resend.Resend(process.env.RESEND_API_KEY);

const buildProductTable = (p) => {
  return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${p.stock_quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${p.status}</td>
        </tr>`
    
    
};

module.exports = {
  sendAdminNotificationForInventory: async ({
    adminEmail,
    customer,
    products,
    orderRef,
    totalAmount,
    paymentMethod,
  }) => {
    let lowStockProducts;
    let outOfStockProducts;

    if (products.status === "lowStock") {
      lowStockProducts = products;
    } else {
      outOfStockProducts = products;
    }

    let statusText = "";
    let statusColor = "";
    let subject = "";
    let alertProducts = [];

    if (outOfStockProducts) {
      statusText = "⚠️ Some products have gone out of stock";
      statusColor = "#ff4d4f";
      subject = "🚨 Out of Stock Alert";
      alertProducts = outOfStockProducts;
    } else if (lowStockProducts) {
      statusText = "⚠️ Some products are running low on stock";
      statusColor = "#faad14";
      subject = "⚠️ Low Stock Alert";
      alertProducts = lowStockProducts;
    } else {
      return;
    }

    const productTable = buildProductTable(alertProducts);

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ccc; padding: 20px;">
      <h2 style="color: ${statusColor};">${statusText}</h2>
      <p>Dear Admin,</p>
      <p>This is an automated alert regarding a recent order (<strong>${orderRef}</strong>). We've detected stock levels that require your attention.</p>
      
      <h3>⚙️ Affected Products:</h3>
      <table style="border-collapse: collapse; width: 100%; margin-top: 10px;">
        <thead>
          <tr>
            <th style="padding: 8px; border: 1px solid #ddd;">Product</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Stock</th>
            <th style="padding: 8px; border: 1px solid #ddd;">Status</th>
          </tr>
        </thead>
        <tbody>${productTable}</tbody>
      </table>

      <h3>🧾 Order Summary:</h3>
      <ul>
        <li><strong>Customer:</strong> ${customer.fullName} (${customer.email}, ${customer.phone})</li>
        <li><strong>Delivery:</strong> ${customer.destination_address}</li>
        <li><strong>Total Amount:</strong> ${totalAmount}</li>
        <li><strong>Payment Method:</strong> ${paymentMethod}</li>
      </ul>

      <p>Please take appropriate action to restock or notify your team.</p>
      <p style="margin-top: 30px;">— Inventory System · ${new Date().toLocaleString()}</p>
    </div>
  `;

    await resendClient.emails.send({
      from: "store@qodexcore.com",
      to: adminEmail || "admin@qodexcore.com",
      subject,
      html,
    });
  },
};
