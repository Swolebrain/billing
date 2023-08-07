import { getMembershipByUserId } from '@billing/core/repositories/memberships';
import { createCustomerPortalSession } from '@billing/core/services/memberships';
import { reportUsage } from '@billing/core/services/usage-records';
import { ApiHandler } from 'sst/node/api';
import Stripe from 'stripe';

export const reportUsageRecord = ApiHandler(async (apiEvent, ctx) => {
    const pathParameters = apiEvent.pathParameters;
    if (!pathParameters || ['userId', 'entitlementId'].some((key) => typeof pathParameters[key] === 'undefined') || !apiEvent.body) {
        return { statusCode: 400 };
    }

    const { userId, entitlementId } = pathParameters as { userId: string; entitlementId: string };

    try {
        const body = JSON.parse(apiEvent.body) as { quantity: number };

        const membershipQueryResult = await getMembershipByUserId(userId);
        if (membershipQueryResult.$response.error) {
            return { statusCode: 503 };
        }

        const membership = membershipQueryResult.Item;
        if (!membership) {
            return { statusCode: 403 };
        }

        const selectedEntitlement = membership.entitlements.find(
            (membershipEntitlement) => membershipEntitlement.entitlementId === entitlementId
        );
        if (!selectedEntitlement?.linkedStripeSubscriptionItemId) {
            return { statusCode: 500 };
        }

        await reportUsage({ userId, selectedEntitlement, quantity: body.quantity });
    } catch (err) {
        console.log({ err });
        return { statusCode: 500 };
    }
});

export const requestEntitlementAccess = ApiHandler(async (apiEvent, ctx) => {
    const pathParameters = apiEvent.pathParameters;
    if (!pathParameters || ['userId', 'entitlementId'].some((key) => typeof pathParameters[key] === 'undefined')) {
        return { statusCode: 400 };
    }

    const { userId, entitlementId } = pathParameters as { userId: string; entitlementId: string };

    try {
        const membershipQueryResult = await getMembershipByUserId(userId);
        if (membershipQueryResult.$response.error) {
            return { statusCode: 503 };
        }

        const membership = membershipQueryResult.Item;
        if (!membership) {
            return { statusCode: 403 };
        }

        const selectedEntitlement = membership.entitlements.find(
            (membershipEntitlement) => membershipEntitlement.entitlementId === entitlementId
        );
        if (!selectedEntitlement?.linkedStripeSubscriptionItemId) {
            return { statusCode: 403 };
        }

        return { statusCode: 200 };
    } catch (err) {
        console.log({ err });
        return { statusCode: 500 };
    }
});

export interface MembershipsCustomerPortalSessionResponse {
    customerPortalSession: Stripe.BillingPortal.Session;
}

export const requestCustomerPortalSession = ApiHandler(async (apiEvent, ctx) => {
    const pathParameters = apiEvent.pathParameters;
    if (!pathParameters || ['userId'].some((key) => typeof pathParameters[key] === 'undefined')) {
        return { statusCode: 400 };
    }

    const { userId } = pathParameters as { userId: string };

    try {
        const customerPortalSession = await createCustomerPortalSession(userId);

        return { statusCode: 200, body: JSON.stringify({ customerPortalSession }) };
    } catch (err) {
        console.log({ err });
        return { statusCode: 500 };
    }
});
