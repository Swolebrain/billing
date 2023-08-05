import { stripeClient } from '@billing/core/integrations';
import { saveMembership } from '@billing/core/repositories/memberships';
import { Config } from 'sst/node/config';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { TEST_USER_ID, testMembershipBaseData } from '../data';
import { CheckoutInitiateBody, CheckoutInitiateResponseBody } from '../../src/checkout';
import axios from 'axios';

const baseUrl = `https://api.solidsnake.millionairecodersclub.com`;

const getStripeCustomerForTest = async () => {
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

describe('route: /checkout', () => {
    beforeAll(async () => {
        const stripeCustomer = await getStripeCustomerForTest();
        saveMembership({ ...testMembershipBaseData, linkedStripeCustomerId: stripeCustomer.id });
    });

    it('POST /checkout/initiate', async () => {
        const body: CheckoutInitiateBody = {
            userId: TEST_USER_ID,
            items: [{ entitlementId: 'prod_OLOxrZP6sFtIfs', linkedStripePriceId: 'price_1NZkivG2qDDl01Z5J3bJkHad' }],
            successUrl: 'http://success.com',
            cancelUrl: 'http://cancel.com',
        };

        const initiateResponse = await axios.post<CheckoutInitiateResponseBody>(`${baseUrl}/checkout/initiate`, body);

        expect(initiateResponse.data.checkoutSession).toBeDefined();
        expect(initiateResponse.data.checkoutSession.url).toBeDefined();
    });

    afterAll(async () => {
        const stripeCustomer = await getStripeCustomerForTest();
        saveMembership({ ...testMembershipBaseData, linkedStripeCustomerId: stripeCustomer.id });
    });
});
