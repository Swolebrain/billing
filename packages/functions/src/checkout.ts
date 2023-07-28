import { stripeClient } from '@billing/core/integrations';
import { getEntitlementById } from '@billing/core/repositories/entitlements';
import { MembershipInterface } from '@billing/core/repositories/memberships';
import { getOrCreateMembershipForCheckout } from '@billing/core/services/memberships';
import { ApiHandler } from 'sst/node/api';

interface CheckoutInitiateBody {
    userId: string;
    items: { entitlementId: string; linkedStripePriceId: string }[];
    successUrl: string;
    cancelUrl: string;
}

export const checkoutInitiate = ApiHandler(async (apiEvent, ctx) => {
    if (!apiEvent.body) return { statusCode: 400 };

    try {
        const body: CheckoutInitiateBody = JSON.parse(apiEvent.body);

        const [membership, entitlementsQueryResult] = await Promise.all([
            getOrCreateMembershipForCheckout(body.userId).then((result) => result as MembershipInterface),
            Promise.all(body.items.map(({ entitlementId }) => getEntitlementById(entitlementId))),
        ]);

        if (!membership || entitlementsQueryResult.some(({ $response, Item }) => !!$response.error || !Item)) {
            return { statusCode: 404 };
        }

        const checkoutSession = await stripeClient.checkout.sessions.create({
            customer: membership.linkedStripeCustomerId,
            line_items: body.items.map(({ linkedStripePriceId }) => ({ price: linkedStripePriceId })),
            mode: 'subscription',
            success_url: body.successUrl,
            cancel_url: body.cancelUrl,
        });

        return { statusCode: 200, body: JSON.stringify({ checkoutSession }) };
    } catch (err) {
        console.log({ err });
        return { statusCode: 500 };
    }
});
