"use strict";

// @ts-nocheck
const crypto = require("crypto");
const {
  sendClientReceipt,
  sendAdminNotification,
} = require("../../utils/sendEmails");



module.exports = {
  async handleWebhook(ctx) {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    try {
      const hash = ctx.request.headers["x-paystack-signature"];
      const body = ctx.request.body;

      const generatedHash = crypto
        .createHmac("sha512", secret)
        .update(JSON.stringify(body))
        .digest("hex");

      if (hash !== hash) {
        ctx.throw(400, "Invalid Paystack signature");
      }

      const event = body.event;

      if (event === "charge.success") {
        const data = body.data;
        const reference = data.reference;

        strapi.log.info(`✅ Payment successful for reference ${reference}`);

        const order = await strapi.db.query("api::order.order").findOne({
          where: { transaction_ref: reference },
          populate: true,
        });

        if (!order) {
          strapi.log.warn(`❌ No order found for reference ${reference}`);
          return { received: true };
        }

        await strapi.db.query("api::order.order").update({
          where: { id: order.id },
          data: {
            payment_status: "paid",
            paystack_payload: data,
          },
        });

        if (Array.isArray(order.products)) {
          await Promise.all(
            order.products.map(async (item) => {
              try {
                // 🔍 Find published product by documentId
                const product = await strapi
                  .documents("api::product.product")
                  .findOne({
                    documentId: item.id,
                    fields: [
                      "documentId",
                      "stock_quantity",
                      "low_stock_threshold",
                      "name",
                    ],
                  });

                if (!product) {
                  strapi.log.warn(
                    `⚠️ Product with documentId ${item.id} not found`
                  );
                  return;
                }

                const newQty = Math.max(
                  product.stock_quantity - (item.quantity || 1),
                  0
                );

                let inventoryStatus = "inStock";
                if (newQty <= 0) {
                  inventoryStatus = "outOfStock";
                } else if (
                  typeof product.low_stock_threshold === "number" &&
                  newQty <= product.low_stock_threshold
                ) {
                  inventoryStatus = "lowStock";
                }

                await strapi.documents("api::product.product").update({
                  documentId: product.documentId,
                  data: {
                    stock_quantity: newQty,
                    inventory_status: inventoryStatus,
                  },
                });

                strapi.log.info(
                  `✅ Updated inventory for '${product.name}' → Qty: ${newQty}, Status: ${inventoryStatus}`
                );
              } catch (err) {
                strapi.log.error(
                  `❌ Error updating product ${item.id}: ${err.message}`
                );
              }
            })
          );
        } else {
          strapi.log.warn("⚠️ Order has no valid products array.");
        }

        try {
          // Send and forget
          sendClientReceipt({
            email: order.email,
            products: order.products,
            totalAmount: order.amount,
            orderRef: reference,
          }).catch((err) =>
            strapi.log.error("Client email failed:", err.message)
          );

          sendAdminNotification({
            adminEmail: process.env.ADMIN_EMAIL,
            customer: {
              fullName: order.fullName,
              email: order.email,
              phone: order.phone,
              destination_address: order.destination_address,
              
            },
            products: order.products,
            orderRef: reference,
            totalAmount: order.amount,
            paymentMethod: order.payment_method

          }).catch((err) =>
            strapi.log.error("Admin email failed:", err.message)
          );
        } catch (emailError) {
          strapi.log.error("❌ Error sending emails:", emailError.message);
        }

        return { received: true };
      }

      return { received: true };
    } catch (err) {
      strapi.log.error("❌ Webhook error:", err.message);
      ctx.response.status = 400;
      return { error: err.message };
    }
  },
};
