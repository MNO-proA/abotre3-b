'use strict';

/**
 * A set of functions called "actions" for `check-payment`
 */

// GET /api/check-payment?orderId=123

module.exports = {
  async checkPayment(ctx) {
    const { orderRef } = ctx.query;

    if (!orderRef) {
      return ctx.send({ status: 'error', message: 'Order Reference is required' }, 400);
    }

    try {
      const order = await strapi.db.query("api::order.order").findOne({
        where: { transaction_ref: orderRef },
      });

      if (!order) {
        return ctx.send({ status: 'error', message: 'Order not found' }, 404);
      }

      if (order.payment_status === 'paid') {
        return ctx.send({ status: 'success' });
      } else if (order.payment_status === 'failed') {
        return ctx.send({ status: 'failed' });
      } else {
        return ctx.send({ status: 'processing' });
      }
    } catch (err) {
      strapi.log.error("❌ check-payment failed", err);
      return ctx.send({ status: 'error', message: 'Internal server error' }, 500);
    }
  }
};



