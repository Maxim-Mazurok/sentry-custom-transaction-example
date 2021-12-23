import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [new Integrations.BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

async function validateShoppingCartOnServer() {
  return new Promise((resolve) =>
    setTimeout(
      () => resolve(`validated: ${Math.random()}`),
      Math.random() * 1000
    )
  );
}

async function processAndValidateShoppingCart() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.5) {
        reject();
      } else {
        resolve();
      }
    }, Math.random() * 1000);
  });
}

// Let's say this function is invoked when a user clicks on the checkout button of your shop
async function shopCheckout(button) {
  // This will create a new Transaction for you
  const transaction = Sentry.startTransaction({ name: "shopCheckout" });
  // Set transaction on scope to associate with errors and get included span instrumentation
  // If there's currently an unfinished transaction, it may be dropped
  Sentry.getCurrentHub().configureScope((scope) => scope.setSpan(transaction));

  button.setAttribute("disabled", "");

  const span1 = transaction.startChild({
    op: "task",
    description: `validating shopping cart on server`,
  });
  const result = await validateShoppingCartOnServer();
  span1.setStatus("ok");
  span1.finish();

  const span2 = transaction.startChild({
    data: {
      result,
    },
    op: "task",
    description: `processing shopping cart result`,
  });
  try {
    await processAndValidateShoppingCart(result);
    span2.setStatus("ok");
    transaction.setStatus("ok");
  } catch (err) {
    span2.setStatus("not_found");
    transaction.setStatus("not_found");
    throw err;
  } finally {
    span2.finish();
    transaction.finish();
    button.removeAttribute("disabled");
  }
}

window.shopCheckout = shopCheckout;
