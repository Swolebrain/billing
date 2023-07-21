import { ApiHandler } from 'sst/node/api';
import { Config } from 'sst/node/config';
import Stripe from 'stripe';

const productEvents = ['product.created', 'product.deleted', 'product.updated'];

const priceEvents = ['price.created', 'price.deleted', 'price.updated'];

const subscriptionEvents = [
    'customer.subscription.created',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
    'customer.subscription.trial_will_end',
    'customer.subscription.updated',
];

export const eventsHandler = ApiHandler(async (apiEvent) => {
    if (!apiEvent.body) return { statusCode: 400 };

    const stripeWebhookSignature = apiEvent.headers[''];
    if (!stripeWebhookSignature) return { statusCode: 403 };

    try {
        const body = JSON.parse(apiEvent.body);

        const stripeSecretKey = Config.STRIPE_SECRET_KEY;
        const stripeClient = new Stripe(stripeSecretKey, { apiVersion: '2022-11-15' });

        const stripeWebhookSecret = Config.STRIPE_WEBHOOK_SECRET;
        const stripeEvent = stripeClient.webhooks.constructEvent(body, stripeWebhookSignature, stripeWebhookSecret);

        if (productEvents.includes(stripeEvent.type)) {
            // Handle Product Event...
            return { statusCode: 200 };
        }

        if (priceEvents.includes(stripeEvent.type)) {
            // Handle Product Event...
            return { statusCode: 200 };
        }

        if (subscriptionEvents.includes(stripeEvent.type)) {
            // Handle Subscription Event...
            return { statusCode: 200 };
        }

        return { statusCode: 400 };
    } catch (err) {
        return { statusCode: 500 };
    }
});
