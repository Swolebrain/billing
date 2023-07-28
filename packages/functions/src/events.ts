import {
    handlePriceCreatedEvent,
    handlePriceUpdatedEvent,
    handleProductCreatedEvent,
    handleProductUpdatedEvent,
} from '@billing/core/services/entitlements';
import { stripeClient } from '@billing/core/integrations';
import { ApiHandler } from 'sst/node/api';
import { Config } from 'sst/node/config';

const productEvents = ['product.created', 'product.deleted', 'product.updated'] as const;
type ProductEvent = (typeof productEvents)[number];

const priceEvents = ['price.created', 'price.deleted', 'price.updated'] as const;
type PriceEvent = (typeof priceEvents)[number];

const customerSubscriptionEvents = [
    'customer.subscription.created',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
    'customer.subscription.trial_will_end',
    'customer.subscription.updated',
] as const;
type CustomerSubscriptionEvent = (typeof customerSubscriptionEvents)[number];

type StripeEvent = ProductEvent | PriceEvent | CustomerSubscriptionEvent;

export const eventsHandler = ApiHandler(async (apiEvent) => {
    if (!apiEvent.body) return { statusCode: 400 };

    const stripeWebhookSignature = apiEvent.headers['stripe-signature'];
    if (!stripeWebhookSignature) return { statusCode: 403 };

    try {
        const stripeWebhookSecret = Config.STRIPE_WEBHOOK_SECRET;
        const stripeEvent = stripeClient.webhooks.constructEvent(apiEvent.body, stripeWebhookSignature, stripeWebhookSecret);

        switch (stripeEvent.type as StripeEvent) {
            case 'product.created': {
                handleProductCreatedEvent(stripeEvent);
                break;
            }
            case 'product.updated': {
                handleProductUpdatedEvent(stripeEvent);
                break;
            }
            case 'price.created': {
                handlePriceCreatedEvent(stripeEvent);
                break;
            }
            case 'price.updated': {
                handlePriceUpdatedEvent(stripeEvent);
                break;
            }
            case 'customer.subscription.created': {
                break;
            }
            default:
                console.log(`No handler defined for Stripe event ${stripeEvent.type}`);
        }

        return { statusCode: 200 };
    } catch (err) {
        console.log({ err });
        return { statusCode: 500 };
    }
});
