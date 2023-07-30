import { getMembershipByUserId } from '@billing/core/repositories/memberships';
import { reportUsage } from '@billing/core/services/usage-records';
import { ApiHandler } from 'sst/node/api';

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
