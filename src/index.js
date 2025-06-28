"use strict";

// module.exports = {
//   /**
//    * An asynchronous register function that runs before
//    * your application is initialized.
//    *
//    * This gives you an opportunity to extend code.
//    */
//   register(/*{ strapi }*/) {},

//   /**
//    * An asynchronous bootstrap function that runs before
//    * your application gets started.
//    *
//    * This gives you an opportunity to set up your data model,
//    * run jobs, or perform some special logic.
//    */
//   bootstrap(/*{ strapi }*/) {},
// };
module.exports = {
  register({ strapi }) {
    strapi.db.lifecycles.subscribe({
      models: ["api::order.order"],
      async beforeDelete(event) {
        try {
          const { where } = event.params;
          const docId = where.documentId || where.id;

          if (!docId) {
            strapi.log.warn(
              "⚠️ beforeDelete: no id or documentId in where clause:",
              where
            );
            return;
          }

          strapi.log.info(`🔄 Processing order deletion for ID: ${docId}`);

          // Find the order using database query (this works from previous logs)
          let order = null;

          try {
            const dbOrder = await strapi.db.query("api::order.order").findOne({
              where: {
                $or: [{ id: docId }, { documentId: docId }],
              },
              populate: { products: true },
            });

            if (dbOrder) {
              order = dbOrder;
              strapi.log.info(`✅ Found order using database query: ${docId}`);
            }
          } catch (orderError) {
            strapi.log.error(`❌ Failed to find order:`, {
              docId,
              error: orderError.message,
            });
            return;
          }

          if (!order) {
            strapi.log.warn(`⚠️ Order ${docId} not found`);
            return;
          }

          if (!order?.products?.length) {
            strapi.log.info(
              "ℹ️ No products found in order, skipping stock restoration"
            );
            return;
          }

          strapi.log.info(
            `📦 Order found with ${order.products.length} products`
          );

          console.log(order.products);

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
                    product.stock_quantity + (item.quantity || 0),
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
                    `✅(Delete Query) Updated inventory for '${product.name}' → Qty: ${newQty}, Status: ${inventoryStatus}`
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
        } catch (error) {
          strapi.log.error(`❌ Error in beforeDelete hook for order:`, {
            error: error.message,
            stack: error.stack,
          });
        }
      },
    });
  },
};
// =====================================================================================
// Strapi v5 strongly recommends using document service middleware instead of DB lifecycle hooks for this use case 
// module.exports = {
//   register({ strapi }) {
//     const sendRevalidate = async (action = "unknown") => {
//       try {
//         const res = await fetch(`${process.env.FRONTEND_API_URL}/api/revalidate/categories`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             "x-revalidate-token": process.env.REVALIDATE_SECRET,
//           },
//           body: JSON.stringify({ event: action }),
//         });

//         const result = await res.json();
//         strapi.log.info(`✅ Revalidate triggered (${action}):`, result);
//       } catch (err) {
//         strapi.log.error(`❌ Failed to revalidate (${action}): ${err.message}`);
//       }
//     };

//     strapi.db.lifecycles.subscribe({
//       models: ["api::category.category"],

//       async afterCreate() {
//         await sendRevalidate("created");
//       },

//       async afterUpdate() {
//         await sendRevalidate("updated");
//       },

//       async afterDelete() {
//         await sendRevalidate("deleted");
//       },
//     });
//   },
// };

// src/index.js (Strapi lifecycle plugin entry)
module.exports = {
  register({ strapi }) {
    const modelsToWatch = [
      "api::brand.brand",
      "api::category.category",
      "api::homepage.homepage",
      "api::product.product",
      "api::specialproduct.specialproduct",
      "api::subcategory.subcategory"
    ];

    const modelToPathMap = {
      "api::brand.brand": "brands",
      "api::category.category": "categories",
      "api::homepage.homepage": "homepage",
      "api::product.product": "products",
      "api::specialproduct.specialproduct": "special-products",
      "api::subcategory.subcategory": "subcategories",
    };

    const sendRevalidate = async (action = "unknown", collection = "unknown") => {
      try {
        const res = await fetch(`${process.env.FRONTEND_API_URL}/api/revalidate/${collection}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-revalidate-token": process.env.REVALIDATE_SECRET,
          },
          body: JSON.stringify({ event: action }),
        });

        const result = await res.json();
        strapi.log.info(`✅ Revalidated (${collection}) on ${action}:`, result);
      } catch (err) {
        strapi.log.error(`❌ Failed to revalidate ${collection} on ${action}:`, err.message);
      }
    };

    strapi.db.lifecycles.subscribe({
      models: modelsToWatch,

      async afterCreate(event) {
        const modelUID = event.model.uid;
        const path = modelToPathMap[modelUID];
        if (path) await sendRevalidate("created", path);
      },

      async afterUpdate(event) {
        const modelUID = event.model.uid;
        const path = modelToPathMap[modelUID];
        if (path) await sendRevalidate("updated", path);
      },

      async afterDelete(event) {
        const modelUID = event.model.uid;
        const path = modelToPathMap[modelUID];
        if (path) await sendRevalidate("deleted", path);
      },
    });
  },
};
