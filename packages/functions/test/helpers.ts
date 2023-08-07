import { stripeClient } from '@billing/core/integrations';
import { Config } from 'sst/node/config';
import { TEST_USER_ID } from './data';

export const getStripeCustomerForTest = async () => {
    const stripeCustomerQueryResult = await stripeClient.customers.search({
        query: `metadata["APP_NAME"]:"${Config.APP_NAME}" AND metadata["APP_STAGE"]:"${Config.APP_STAGE}" AND metadata["userId"]:"${TEST_USER_ID}"`,
    });

    if (stripeCustomerQueryResult.data.length > 0) return stripeCustomerQueryResult.data[0];

    const stripeCustomer = await stripeClient.customers.create({
        metadata: {
            APP_NAME: Config.APP_NAME,
            APP_STAGE: Config.APP_STAGE,
            userId: TEST_USER_ID,
        },
    });

    return stripeCustomer;
};
