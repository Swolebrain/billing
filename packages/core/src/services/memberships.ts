import { stripeClient } from 'src/integrations';
import {
    MembershipInterface,
    getMembershipByStripeCustomerId,
    getMembershipByUserId,
    saveMembership,
    updateMembership,
} from 'src/repositories/memberships';
import Stripe from 'stripe';

export const getOrCreateMembershipForCheckout = async (userId: string): Promise<MembershipInterface> => {
    const membershipQueryResult = await getMembershipByUserId(userId);

    if (membershipQueryResult.$response.error) {
        // Handle Error
        throw new Error();
    }

    const foundMembership = membershipQueryResult.Item;
    if (!!foundMembership && !!foundMembership.linkedStripeSubscriptionId) {
        // Handle Error
        throw new Error();
    }

    if (!!foundMembership) {
        return membershipQueryResult.Item;
    }

    const stripeCustomer = await stripeClient.customers.create();
    const membershipToCreate = {
        userId,
        entitlements: [],
        linkedStripeCustomerId: stripeCustomer.id,
        status: 'INACTIVE',
        linkedStripeSubscriptionId: null,
        lastPaymentDate: null,
        nextPaymentDate: null,
    };
    const saveResult = await saveMembership(membershipToCreate);

    if (saveResult.$response.error) {
        // Handle error logic
        throw new Error();
    }

    return membershipToCreate as MembershipInterface;
};

export const handleCustomerSubscriptionCreatedEvent = async (stripeEvent: Stripe.Event) => {
    const subscription = stripeEvent.data.object as Stripe.Subscription;
    const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

    const membershipQueryResult = await getMembershipByStripeCustomerId(stripeCustomerId);

    if (membershipQueryResult.$response.error) {
        return;
    }

    const [membership] = membershipQueryResult.Items;

    if (!membership) {
        return;
    }

    const membershipMutationResult = await updateMembership({
        userId: membership.userId,
        status: subscription.status,
        entitlements: subscription.items.data.map(({ id, price }) => ({
            entitlementId: typeof price.product === 'string' ? price.product : price.product.id,
            stripeSubscriptionItemId: id,
        })),
        linkedStripeSubscriptionId: subscription.id,
        lastPaymentDate: subscription.current_period_start,
        nextPaymentDate: subscription.current_period_end,
    });

    if (membershipMutationResult.$response.error) {
        return;
    }
};