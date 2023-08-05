import { stripeClient } from '@billing/core/integrations';
import { deleteEntitlement, getEntitlementById } from '@billing/core/repositories/entitlements';
import { Axios, isAxiosError } from 'axios';
import Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testStripeProductForPriceEvents, testStripeProductBaseData, testStripePriceBaseData } from '../data';

const sleep = (ms: number) =>
    new Promise((resolve) => {
        setTimeout(() => resolve(true), ms);
    });

const exponentialBackoff = async <TResult>(
    cb: () => TResult,
    options: {
        delayMs: number;
        delayMultiplier?: number;
        maxRetry: number;
    },
    retryCount: number = 0
): Promise<TResult> => {
    const { delayMs, delayMultiplier, maxRetry } = { delayMultiplier: 1, ...options };

    try {
        await sleep(delayMs * delayMultiplier * retryCount);
        const result = await cb();

        return result;
    } catch (err) {
        if (retryCount < maxRetry) {
            return exponentialBackoff(cb, options, retryCount + 1);
        }

        throw err;
    }
};

describe('route: /webhooks', () => {
    let stripeProductCreated: Stripe.Product | null = null;
    /**
     * Price events have to be tested with a different product because Stripe
     * does not allow for prices to be deleted with the API and if products have linked prices
     * these can't be deleted with the API either and this means product events could not be tested
     * if prices are to be linked to a product supposed be deleted at the end of tests
     */
    let stripeProductForPriceEvents: Stripe.Product | null = null;
    let stripePriceCreated: Stripe.Price | null = null;

    beforeAll(async () => {
        try {
            stripeProductForPriceEvents = await stripeClient.products.retrieve(testStripeProductForPriceEvents.id);
        } catch (err: any) {
            if (!!err && 'code' in err && err.code === 'resource_missing') {
                stripeProductForPriceEvents = await stripeClient.products.create(testStripeProductForPriceEvents);
            } else {
                throw err;
            }
        }
    });

    it('should create an entitlement upon product creation on Stripe', async () => {
        stripeProductCreated = await stripeClient.products.create(testStripeProductBaseData);

        await sleep(5000);

        const linkedEntitlement = await exponentialBackoff(
            async () => {
                if (!stripeProductCreated) throw new Error();

                const entitlementQueryResult = await getEntitlementById(stripeProductCreated.id);

                if (entitlementQueryResult.$response.error) {
                    throw entitlementQueryResult.$response.error;
                }

                if (!entitlementQueryResult.Item) {
                    throw new Error();
                }

                return entitlementQueryResult.Item;
            },
            { delayMs: 5000, maxRetry: 2 }
        );

        expect(linkedEntitlement).toBeDefined();
        expect(linkedEntitlement.linkedStripeProductId).toEqual(stripeProductCreated.id);
        expect(linkedEntitlement.name).toEqual(stripeProductCreated.name);
        expect(linkedEntitlement.description).toEqual(stripeProductCreated.description);
        expect(linkedEntitlement.linkedStripePrices.length).toEqual(0);
    });

    it('should append price to entitlement upon price creation on Stripe', async () => {
        if (!stripeProductForPriceEvents) throw new Error('No product was created on Stripe for testing price events');

        stripePriceCreated = await stripeClient.prices.create({ ...testStripePriceBaseData, product: stripeProductForPriceEvents.id });

        if (!stripePriceCreated) throw new Error('Could not create price on Stripe');

        await sleep(5000);

        const linkedEntitlement = await exponentialBackoff(
            async () => {
                if (!stripeProductForPriceEvents) throw new Error('No product was created on Stripe during tests');

                const entitlementQueryResult = await getEntitlementById(stripeProductForPriceEvents.id);

                if (entitlementQueryResult.$response.error) {
                    throw entitlementQueryResult.$response.error;
                }

                if (!entitlementQueryResult.Item) {
                    throw new Error();
                }

                return entitlementQueryResult.Item;
            },
            { delayMs: 5000, maxRetry: 2 }
        );

        expect(linkedEntitlement).toBeDefined();
        expect(linkedEntitlement.linkedStripePrices.some((price) => !!price.priceId && price.priceId === stripePriceCreated?.id)).toEqual(
            true
        );
    });

    afterAll(async () => {
        if (!stripeProductCreated) throw new Error('No product was created on Stripe during tests');

        await stripeClient.products.del(stripeProductCreated.id);

        const entitlementQueryResult = await getEntitlementById(stripeProductCreated.id);

        if (entitlementQueryResult.$response.error) {
            throw entitlementQueryResult.$response.error;
        }

        if (entitlementQueryResult.Item) await deleteEntitlement(entitlementQueryResult.Item.entitlementId);
    });
});
