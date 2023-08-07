import { stripeClient } from '@billing/core/integrations';
import { Config } from 'sst/node/config';
import { TEST_USER_ID } from './data';

export const getStripeCustomerForTest = async (userId: string = TEST_USER_ID) => {
    const stripeCustomerQueryResult = await stripeClient.customers.search({
        query: `metadata["APP_NAME"]:"${Config.APP_NAME}" AND metadata["APP_STAGE"]:"${Config.APP_STAGE}" AND metadata["userId"]:"${userId}"`,
    });

    if (stripeCustomerQueryResult.data.length > 0) return stripeCustomerQueryResult.data[0];

    const stripeCustomer = await stripeClient.customers.create({
        metadata: {
            APP_NAME: Config.APP_NAME,
            APP_STAGE: Config.APP_STAGE,
            userId: userId,
        },
    });

    return stripeCustomer;
};

export const getStripeProductForTest = async (productId: string) => {
    try {
        const stripeProductQueryResult = await stripeClient.products.retrieve(productId);
        return stripeProductQueryResult;
    } catch (err) {
        const stripeProduct = await stripeClient.products.create({
            id: productId,
            name: productId,
            description: productId,
        });

        return stripeProduct;
    }
};

export const getActiveStripePriceForTest = async (productId: string) => {
    const stripeCustomerQueryResult = await stripeClient.prices.search({
        query: [
            `product:"${productId}"`,
            `active:"true"`,
            `type:"recurring"`,
            `metadata["APP_NAME"]:"${Config.APP_NAME}"`,
            `metadata["APP_STAGE"]:"${Config.APP_STAGE}"`,
        ].join(' AND '),
    });

    if (stripeCustomerQueryResult.data.length > 0) return stripeCustomerQueryResult.data[0];

    const stripePrice = await stripeClient.prices.create({
        product: productId,
        currency: 'USD',
        unit_amount: 1,
        recurring: {
            usage_type: 'metered',
            interval: 'month',
        },
        metadata: {
            APP_NAME: Config.APP_NAME,
            APP_STAGE: Config.APP_STAGE,
        },
    });

    return stripePrice;
};

export const getActiveStripeSubscriptionForTest = async (customerId: string, priceId: string) => {
    const stripeSubscriptionQueryResult = await stripeClient.subscriptions.list({
        customer: customerId,
        status: 'active',
    });

    const subscriptionIncludingPrice = stripeSubscriptionQueryResult.data.find((subscription) =>
        subscription.items.data.find((item) => (typeof item.price === 'string' ? item.price === priceId : item.price.id === priceId))
    );

    if (subscriptionIncludingPrice) return subscriptionIncludingPrice;

    const stripeSubscription = await stripeClient.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
    });

    return stripeSubscription;
};

export const sleep = (ms: number) =>
    new Promise((resolve) => {
        setTimeout(() => resolve(true), ms);
    });

export const exponentialBackoff = async <TResult>(
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
