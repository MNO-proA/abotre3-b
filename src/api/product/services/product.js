// @ts-nocheck
'use strict';

/**
 * product service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::product.product', ({ strapi }) => ({
async updateInventoryStatus(documentId) {
  const product = await strapi.db.query("api::product.product").findOne({
    where: { documentId },
    select: ["stock_quantity", "low_stock_threshold", "title"],
  });

  console.log(product)

  if (!product) {
    strapi.log.warn(`Product with documentId ${documentId} not found`);
    return;
  }

  const { stock_quantity, low_stock_threshold, title } = product;

  console.log(stock_quantity)
  console.log(low_stock_threshold)
  console.log(title)

  let inventoryStatus = "inStock";
  if (stock_quantity <= 0) {
    inventoryStatus = "outOfStock";
  } else if (
    typeof low_stock_threshold === "number" &&
    stock_quantity <= low_stock_threshold
  ) {
    inventoryStatus = "lowStock";
  }
  console.log(inventoryStatus)

  await strapi.db.query("api::product.product").update({
    where: { documentId },
    data: { inventory_status: inventoryStatus },
  });

  strapi.log.info(
    `✅ Updated inventory status for '${title}': ${inventoryStatus}`
  );
}
}))
