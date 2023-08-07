import { saveEntitlement } from '@billing/core/repositories/entitlements';
import { saveMembership } from '@billing/core/repositories/memberships';
import { getUsageRecordsByUserIdAfterTimestamp } from '@billing/core/repositories/usage-records';
import axios from 'axios';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MembershipsCustomerPortalSessionResponse } from '../../src/memberships';
import { baseUrl, testMembershipBaseData } from '../data';
import {
    getActiveStripePriceForTest,
    getActiveStripeSubscriptionForTest,
    getStripeCustomerForTest,
    getStripeProductForTest,
    sleep,
} from '../helpers';

const TEST_USER_ID_FOR_MEMBERSHIPS_ROUTE = 'TEST_USER_ID_FOR_MEMBERSHIPS_ROUTE';
const TEST_ENTITLEMENT_ID_FOR_MEMBERSHIPS_ROUTE = 'TEST_ENTITLEMENT_ID_FOR_MEMBERSHIPS_ROUTE';

describe('route: /memberships', () => {
    beforeAll(async () => {
        const stripeProduct = await getStripeProductForTest(TEST_ENTITLEMENT_ID_FOR_MEMBERSHIPS_ROUTE);
        const stripePrice = await getActiveStripePriceForTest(TEST_ENTITLEMENT_ID_FOR_MEMBERSHIPS_ROUTE);

        await saveEntitlement({
            entitlementId: stripeProduct.id,
            active: true,
            linkedStripePrices: [{ priceId: stripePrice.id, active: true, type: 'recurring' }],
            linkedStripeProductId: stripeProduct.id,
            name: stripeProduct.id,
            description: stripeProduct.id,
        });

        const stripeCustomer = await getStripeCustomerForTest(TEST_USER_ID_FOR_MEMBERSHIPS_ROUTE);

        const stripeSubscription = await getActiveStripeSubscriptionForTest(stripeCustomer.id, stripePrice.id);

        const subscriptionItemIdForPrice = stripeSubscription.items.data.find((item) =>
            typeof item.price === 'string' ? item.price : item.price.id
        );

        if (!subscriptionItemIdForPrice) throw new Error();

        await saveMembership({
            userId: TEST_USER_ID_FOR_MEMBERSHIPS_ROUTE,
            linkedStripeCustomerId: stripeCustomer.id,
            linkedStripeSubscriptionId: stripeSubscription.id,
            entitlements: [{ entitlementId: stripeProduct.id, linkedStripeSubscriptionItemId: subscriptionItemIdForPrice.id }],
            status: stripeSubscription.status,
            lastPaymentDate: null,
            nextPaymentDate: null,
        });
    });

    it('POST /memberships/{userId}/usage/{entitlementId}', async () => {
        const reportUsageResponse = await axios.post(
            `${baseUrl}/memberships/${TEST_USER_ID_FOR_MEMBERSHIPS_ROUTE}/usage/${TEST_ENTITLEMENT_ID_FOR_MEMBERSHIPS_ROUTE}`,
            { quantity: 1 }
        );

        await sleep(1000);

        const lastUsageReports = await getUsageRecordsByUserIdAfterTimestamp(
            TEST_USER_ID_FOR_MEMBERSHIPS_ROUTE,
            Date.now() - 5 * 1000,
            true
        );

        if (lastUsageReports.$response.error) {
            throw lastUsageReports.$response.error;
        }

        if (!lastUsageReports.Items) {
            throw new Error('Could not retrieve usage reports');
        }

        expect(reportUsageResponse.status).toEqual(200);
        expect(lastUsageReports.Items.length > 0).toEqual(true);
        expect(lastUsageReports.Items.every((report) => !!report.linkedStripeUsageRecordId)).toEqual(true);
    });

    it('GET /memberships/{userId}/authorize/{entitlementId}', async () => {
        const authorizeResponse = await axios.get(
            `${baseUrl}/memberships/${TEST_USER_ID_FOR_MEMBERSHIPS_ROUTE}/authorize/${TEST_ENTITLEMENT_ID_FOR_MEMBERSHIPS_ROUTE}`
        );

        expect(authorizeResponse.status).toEqual(200);
    });

    it('POST /memberships/{userId}/customer-portal-session', async () => {
        const customerPortalSessionResponse = await axios.post<MembershipsCustomerPortalSessionResponse>(
            `${baseUrl}/memberships/${TEST_USER_ID_FOR_MEMBERSHIPS_ROUTE}/customer-portal-session`
        );

        expect(customerPortalSessionResponse.data.customerPortalSession).toBeDefined();
        expect(customerPortalSessionResponse.data.customerPortalSession.url).toBeDefined();
    });

    afterAll(async () => {
        const stripeCustomer = await getStripeCustomerForTest();
        saveMembership({ ...testMembershipBaseData, linkedStripeCustomerId: stripeCustomer.id });
    });
});
