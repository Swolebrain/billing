import { createEntitlement, updateEntitlement } from '@billing/core/repositories/entitlements';
import { ApiHandler } from 'sst/node/api';
import { Config } from 'sst/node/config';
import Stripe from 'stripe';

const productEvents = ['product.created', 'product.deleted', 'product.updated'] as const;
type ProductEvent = (typeof productEvents)[number];

const priceEvents = ['price.created', 'price.deleted', 'price.updated'] as const;
type PriceEvent = (typeof priceEvents)[number];

const subscriptionEvents = [
    'customer.subscription.created',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
    'customer.subscription.trial_will_end',
    'customer.subscription.updated',
] as const;
type SubscriptionEvent = (typeof subscriptionEvents)[number];

type StripeEvent = ProductEvent | PriceEvent | SubscriptionEvent;

export const eventsHandler = ApiHandler(async (apiEvent) => {
    if (!apiEvent.body) return { statusCode: 400 };

    const stripeWebhookSignature = apiEvent.headers['stripe-signature'];
    if (!stripeWebhookSignature) return { statusCode: 403 };

    try {
        const stripeSecretKey = Config.STRIPE_SECRET_KEY;
        const stripeClient = new Stripe(stripeSecretKey, { apiVersion: '2022-11-15' });

        const stripeWebhookSecret = Config.STRIPE_WEBHOOK_SECRET;
        const stripeEvent = stripeClient.webhooks.constructEvent(apiEvent.body, stripeWebhookSignature, stripeWebhookSecret);

        switch (stripeEvent.type as StripeEvent) {
            case 'product.created': {
                const product = stripeEvent.data.object as Stripe.Product;
                await createEntitlement({
                    entitlementId: product.id,
                    name: product.name,
                    description: product.description,
                    active: product.active,
                    linkedStripeActivePriceIds: new Set(),
                    linkedStripeProductId: product.id,
                });
                break;
            }
            case 'product.updated': {
                const prev = stripeEvent.data.previous_attributes;
                if (!prev || Object.keys(prev).length === 0) break;

                const product = stripeEvent.data.object as Stripe.Product;
                await updateEntitlement({
                    entitlementId: product.id,
                    name: prev.hasOwnProperty('name') ? product.name : undefined,
                    description: prev.hasOwnProperty('description') ? product.description : undefined,
                });

                break;
            }
            case 'price.created': {
                const price = stripeEvent.data.object as Stripe.Price;

                await updateEntitlement({
                    entitlementId: typeof price.product === 'string' ? price.product : price.product.id,
                    stripePriceIdsToAdd: price.active ? new Set(price.id) : undefined,
                });
            }
            case 'price.updated': {
                const price = stripeEvent.data.object as Stripe.Price;

                await updateEntitlement({
                    entitlementId: typeof price.product === 'string' ? price.product : price.product.id,
                    stripePriceIdsToAdd: price.active ? new Set(price.id) : undefined,
                    stripePriceIdsToDelete: !price.active ? new Set(price.id) : undefined,
                });
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
