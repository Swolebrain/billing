import { stripeClient } from '@billing/core/integrations';
import { deleteEntitlement, getEntitlementById } from '@billing/core/repositories/entitlements';
import Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_USER_ID, testStripePriceBaseData, testStripeProductBaseData, testStripeProductForPriceEvents } from '../data';
import { getStripeCustomerForTest } from '../helpers';
import { getMembershipByUserId } from '@billing/core/repositories/memberships';

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
    let stripeSubscriptionCreated: Stripe.Subscription | null = null;

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

    it('should create entitlements upon Stripe product creations', async () => {
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

    it('should update entitlements upon Stripe linked product updates', async () => {
        if (!stripeProductCreated) throw new Error('Stripe product was not created for tests');

        const stripeProductUpdatedData = {
            name: 'STRIPE_TEST_PRODUCT_NAME_UPDATED',
            description: 'STRIPE_TEST_PRODUCT_DESCRIPTION_UPDATED',
        };

        await stripeClient.products.update(stripeProductCreated.id, stripeProductUpdatedData);

        await exponentialBackoff(
            async () => {
                if (!stripeProductCreated) throw new Error();

                const entitlementQueryResult = await getEntitlementById(stripeProductCreated.id);

                if (entitlementQueryResult.$response.error) {
                    throw entitlementQueryResult.$response.error;
                }

                if (!entitlementQueryResult.Item) {
                    throw new Error();
                }

                const linkedEntitlement = entitlementQueryResult.Item;

                expect(linkedEntitlement.name).toEqual(stripeProductUpdatedData.name);
                expect(linkedEntitlement.description).toEqual(stripeProductUpdatedData.description);
            },
            { delayMs: 5000, maxRetry: 2 }
        );
    });

    it('should append prices to entitlements upon Stripe price creations', async () => {
        if (!stripeProductForPriceEvents) throw new Error('No product was created on Stripe for testing price events');

        stripePriceCreated = await stripeClient.prices.create({
            ...testStripePriceBaseData,
            product: stripeProductForPriceEvents.id,
            active: false,
        });

        if (!stripePriceCreated) throw new Error('Could not create price on Stripe');

        await sleep(5000);

        await exponentialBackoff(
            async () => {
                if (!stripeProductForPriceEvents) throw new Error('No product was created on Stripe during tests');

                const entitlementQueryResult = await getEntitlementById(stripeProductForPriceEvents.id);

                if (entitlementQueryResult.$response.error) {
                    throw entitlementQueryResult.$response.error;
                }

                if (!entitlementQueryResult.Item) {
                    throw new Error();
                }

                const linkedEntitlement = entitlementQueryResult.Item;

                expect(linkedEntitlement).toBeDefined();
                expect(
                    linkedEntitlement.linkedStripePrices.some((price) => !!price.priceId && price.priceId === stripePriceCreated?.id)
                ).toEqual(true);
            },
            { delayMs: 5000, maxRetry: 2 }
        );
    });

    it('should update prices in entitlements upon Stripe price updates', async () => {
        if (!stripeProductForPriceEvents) throw new Error('No product was created on Stripe for testing price events');
        if (!stripePriceCreated) throw new Error();

        const stripePriceUpdated = await stripeClient.prices.update(stripePriceCreated.id, { active: true });

        if (!stripePriceUpdated) throw new Error('Could not update price on Stripe');

        await sleep(5000);

        await exponentialBackoff(
            async () => {
                if (!stripeProductForPriceEvents) throw new Error('No product was created on Stripe during tests');
                if (!stripePriceUpdated) throw new Error('Could not update price on Stripe');

                const entitlementQueryResult = await getEntitlementById(stripeProductForPriceEvents.id);

                if (entitlementQueryResult.$response.error) {
                    throw entitlementQueryResult.$response.error;
                }

                if (!entitlementQueryResult.Item) {
                    throw new Error();
                }

                const linkedEntitlement = entitlementQueryResult.Item;

                expect(linkedEntitlement).toBeDefined();
                expect(
                    linkedEntitlement.linkedStripePrices.some(
                        (price) => !!price.priceId && price.priceId === stripePriceUpdated.id && price.active === stripePriceUpdated.active
                    )
                ).toEqual(true);
            },
            { delayMs: 5000, maxRetry: 2 }
        );
    });

    it('should link user memberships to Stripe subscriptions upon creation', async () => {
        if (!stripePriceCreated) throw new Error();

        const testStripeCustomer = await getStripeCustomerForTest();

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const stripeTimestamp = new Date(`${today.getFullYear()}-${today.getMonth() + 2}-${1}`).getTime() / 1000;

        stripeSubscriptionCreated = await stripeClient.subscriptions.create({
            customer: testStripeCustomer.id,
            items: [{ price: stripePriceCreated.id }],
            billing_cycle_anchor: Math.floor(stripeTimestamp),
        });

        await sleep(5000);

        await exponentialBackoff(
            async () => {
                if (!stripeSubscriptionCreated) throw new Error('Could not update price on Stripe');

                const membershipQueryResult = await getMembershipByUserId(TEST_USER_ID);

                if (membershipQueryResult.$response.error) {
                    throw membershipQueryResult.$response.error;
                }

                const membership = membershipQueryResult.Item;

                expect(membership.linkedStripeSubscriptionId).toEqual(stripeSubscriptionCreated.id);
            },
            { delayMs: 5000, maxRetry: 2 }
        );
    });

    it('should unlink user membership from Stripe subscription upon deletion', async () => {
        if (!stripeSubscriptionCreated) throw new Error();

        await stripeClient.subscriptions.del(stripeSubscriptionCreated.id);

        await sleep(5000);

        await exponentialBackoff(
            async () => {
                if (!stripeSubscriptionCreated) throw new Error();

                const membershipQueryResult = await getMembershipByUserId(TEST_USER_ID);

                if (membershipQueryResult.$response.error) {
                    throw membershipQueryResult.$response.error;
                }

                const membership = membershipQueryResult.Item;

                expect(membership.linkedStripeSubscriptionId).toBeNull();
            },
            { delayMs: 5000, maxRetry: 2 }
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
