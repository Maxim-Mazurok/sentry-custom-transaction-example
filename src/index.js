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

Sentry.setTag("country", Math.random() > 0.5 ? "au" : "uk");

function validateShoppingCart(parentSpan) {
  const span = parentSpan.startChild({
    op: "task",
    description: `validating shopping cart`,
  });
  return new Promise((resolve) =>
    setTimeout(() => {
      span.setStatus("ok");
      span.finish();
      resolve(`validating at ${new Date()}`);
    }, Math.random() * 1000)
  );
}

function processShoppingCart(parentSpan) {
  const span = parentSpan.startChild({
    op: "task",
    description: `process shopping cart`,
  });
  return new Promise((resolve) =>
    setTimeout(() => {
      span.setStatus("ok");
      span.finish();
      resolve(`processing at ${new Date()}`);
    }, Math.random() * 1000)
  );
}

async function processAndValidateShoppingCart() {
  const transaction = Sentry.getCurrentHub().getScope().getTransaction();
  const span = transaction.startChild({
    op: "task",
    description: `process and validate shopping cart`,
  });
  const resultValidate = await validateShoppingCart(span);
  const resultProcess = await processShoppingCart(span);
  span.setStatus("ok");
  span.finish();
  return [resultValidate, resultProcess];
}

async function finalize() {
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

  const results = await processAndValidateShoppingCart();

  const spanFinalize = transaction.startChild({
    data: { results },
    op: "task",
    description: `finalizing at ${new Date()}`,
  });
  try {
    await finalize();
    spanFinalize.setStatus("ok");
    transaction.setStatus("ok");
  } catch (err) {
    spanFinalize.setStatus("not_found");
    transaction.setStatus("not_found");
    throw err;
  } finally {
    spanFinalize.finish();
    transaction.finish();
    button.removeAttribute("disabled");
  }
}

window.shopCheckout = shopCheckout;
