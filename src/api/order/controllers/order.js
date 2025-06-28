// @ts-nocheck

"use strict";
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { createCoreController } = require("@strapi/strapi").factories;
const {
  sendClientReceipt,
  sendAdminNotification,
} = require("../../utils/sendEmails");

const {
  sendAdminNotificationForInventory,
} = require("../../utils/sendInventoryEmail");

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const {
      products,
      email,
      fullName,
      phone,
      destination_address,
      paymentMethod,
    } = ctx.request.body;
    console.log("1=============>:", ctx.request.body);

    // Validate input
    if (!products.length) {
      return ctx.badRequest("No products provided");
    }
    if (!email) {
      return ctx.badRequest("Customer email is required");
    }

    // Step 1: Fetch product details and validate quantities
    const productDetails = await Promise.all(
      products.map(async (product) => {
        if (!product?.documentId) {
          console.warn("Missing product ID in:", product);
          return null;
        }

        const item = await strapi
          .service("api::product.product")
          .findOne(product.documentId);

        if (!item) {
          console.warn(`No product found for ID ${product.documentId}`);
          return null;
        }

        // Quantity check
        if (product.quantity > item.stock_quantity) {
          ctx.response.status = 400;
          ctx.body = {
            error: `Sorry, only ${item.stock_quantity} of "${item.title}" available in stock.`,
            code: "INSUFFICIENT_STOCK",
            productId: item.documentId,
          };
          throw new Error("Insufficient stock"); // Short-circuits Promise.all
        }

        return {
          id: item.documentId,
          simple_id: item.id,
          name: item.name,
          price: item.price,
          quantity: product.quantity,
          sku: item.sku,
        };
      })
    );

    console.log("2=============>:", productDetails);

    // Filter out null entries (if any product wasn't found)
    const validProductDetails = productDetails.filter(Boolean);

    const totalAmount = validProductDetails.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    console.log("validProductDetails:", validProductDetails);
    console.log("Total:", totalAmount);

    const transaction_ref = uuidv4();
    let authorization_url = null;

    // Save order
    const order = await strapi.service("api::order.order").create({
      data: {
        email,
        fullName,
        phone,
        destination_address,
        transaction_ref,
        products: validProductDetails,
        amount: totalAmount,
        payment_method: paymentMethod,
        payment_status:
          paymentMethod === "cashOnDelivery" ? "cash_on_delivery" : "pending",
      },
    });

    if (paymentMethod === "payOnline") {
      try {
        const resp = await axios.post(
          process.env.PAYSTACK_TRANSACTION_URL,
          {
            email,
            amount: Math.round(totalAmount * 100),
            currency: "GHS",
            reference: transaction_ref,
            callback_url: `${process.env.FRONTEND_URL}/shop/order-status?orderRef=${transaction_ref}`,
            metadata: {
              fullName,
              phone,
              destination_address,
              products: JSON.stringify(validProductDetails),
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        authorization_url = resp.data.data.authorization_url;
      } catch (err) {
        strapi.log.error(
          "Paystack init failed:",
          err.response?.data || err.message
        );
        return ctx.internalServerError("Payment initialization failed");
      }
    } else {
      sendAdminNotification({
        adminEmail: process.env.ADMIN_EMAIL,
        customer: { fullName, email, phone, destination_address },
        products: validProductDetails,
        orderRef: transaction_ref,
        totalAmount,
        paymentMethod,
      }).catch((err) => strapi.log.error("Admin email error:", err.message));

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
              let inventoryStatus = "inStock";

              const newQty = Math.max(
                product.stock_quantity - (item.quantity || 1),
                0
              );

              if (newQty <= 0) {
                inventoryStatus = "outOfStock";
                await sendAdminNotificationForInventory({
                  adminEmail: process.env.ADMIN_EMAIL,
                  customer: { fullName, email, phone, destination_address },
                  products: {
                    name: item.name,
                    stock_quantity: newQty,
                    status: inventoryStatus, // "lowStock" | "outOfStock" | "inStock"
                  },
                  orderRef: transaction_ref,
                  totalAmount,
                  paymentMethod,
                });
              } else if (
                typeof product.low_stock_threshold === "number" &&
                newQty <= product.low_stock_threshold
              ) {
                inventoryStatus = "lowStock";
                await sendAdminNotificationForInventory({
                  adminEmail: process.env.ADMIN_EMAIL,
                  customer: { fullName, email, phone, destination_address },
                  products: {
                    name: item.name,
                    stock_quantity: newQty,
                    status: inventoryStatus, // "lowStock" | "outOfStock" | "inStock"
                  },
                  orderRef: transaction_ref,
                  totalAmount,
                  paymentMethod,
                });
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
    }

    ctx.body = {
      status: "success",
      reference: transaction_ref,
      ...(authorization_url && { authorization_url }),
    };
  },
}));
