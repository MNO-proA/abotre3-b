module.exports = {
  routes: [
    {
      method: "GET",
      path: "/check-payment",
      handler: "check-payment.checkPayment",
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
