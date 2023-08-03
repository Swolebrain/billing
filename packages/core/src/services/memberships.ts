import { stripeClient } from 'src/integrations';
import { getEntitlementById } from 'src/repositories/entitlements';
import {
    MembershipInterface,
    getMembershipByStripeCustomerId,
    getMembershipByUserId,
    saveMembership,
    updateMembership,
} from 'src/repositories/memberships';
import { Config } from 'sst/node/config';
import Stripe from 'stripe';

export const getOrCreateMembershipForCheckout = async (userId: string): Promise<MembershipInterface> => {
    const membershipQueryResult = await getMembershipByUserId(userId);

    if (membershipQueryResult.$response.error) {
        throw new Error();
    }

    const foundMembership = membershipQueryResult.Item;
    const canLinkSubscription = !!foundMembership ? ['unlinked', 'pending_link'].includes(foundMembership.status) : true;

    // This will prevent users with linked subscriptions from creating checkout sessions
    if (!canLinkSubscription) {
        throw new Error();
    }

    if (!!foundMembership) {
        return membershipQueryResult.Item;
    }

    const stripeCustomer = await stripeClient.customers.create({
        metadata: {
            APP_NAME: Config.APP_NAME,
            APP_STAGE: Config.APP_STAGE,
            userId,
        },
    });

    const membershipToCreate: MembershipInterface = {
        userId,
        entitlements: [],
        linkedStripeCustomerId: stripeCustomer.id,
        status: 'pending_link',
        linkedStripeSubscriptionId: null,
        lastPaymentDate: null,
        nextPaymentDate: null,
    };
    const saveResult = await saveMembership(membershipToCreate);

    if (saveResult.$response.error) {
        throw new Error();
    }

    return membershipToCreate as MembershipInterface;
};

export const handleCustomerSubscriptionCreatedEvent = async (stripeEvent: Stripe.Event) => {
    const subscription = stripeEvent.data.object as Stripe.Subscription;
    const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

    const membershipQueryResult = await getMembershipByStripeCustomerId(stripeCustomerId);

    if (membershipQueryResult.$response.error) {
        throw new Error();
    }

    const [membership] = membershipQueryResult.Items;

    if (!membership) {
        throw new Error();
    }

    const canLinkSubscription = ['unlinked', 'pending_link'].includes(membership.status);
    if (!canLinkSubscription) {
        throw new Error();
    }

    const membershipMutationResult = await updateMembership({
        userId: membership.userId,
        status: subscription.status,
        entitlements: subscription.items.data.map(({ id, price }) => ({
            entitlementId: typeof price.product === 'string' ? price.product : price.product.id,
            linkedStripeSubscriptionItemId: id,
        })),
        linkedStripeSubscriptionId: subscription.id,
        lastPaymentDate: subscription.current_period_start,
        nextPaymentDate: subscription.current_period_end,
    });

    if (membershipMutationResult.$response.error) {
        throw new Error();
    }
};

export const handleSubscriptionDeletedEvent = async (stripeEvent: Stripe.Event) => {
    const subscription = stripeEvent.data.object as Stripe.Subscription;
    const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

    const membershipQueryResult = await getMembershipByStripeCustomerId(stripeCustomerId);

    if (membershipQueryResult.$response.error) {
        throw new Error();
    }

    const [membership] = membershipQueryResult.Items;

    if (!membership) {
        throw new Error();
    }

    if (membership.linkedStripeSubscriptionId !== subscription.id) {
        throw new Error();
    }

    const membershipMutationResult = await updateMembership({
        userId: membership.userId,
        status: 'unlinked',
        entitlements: [],
        linkedStripeSubscriptionId: null,
        lastPaymentDate: null,
        nextPaymentDate: null,
    });

    if (membershipMutationResult.$response.error) {
        throw new Error();
    }
};

export const handleCheckoutSessionCompletedEvent = async (stripeEvent: Stripe.Event) => {
    const checkoutSession = stripeEvent.data.object as Stripe.Checkout.Session;

    if (!checkoutSession.customer) {
        throw new Error();
    }

    const stripeCustomerId = typeof checkoutSession.customer === 'string' ? checkoutSession.customer : checkoutSession.customer.id;
    const membershipQueryResult = await getMembershipByStripeCustomerId(stripeCustomerId);

    if (membershipQueryResult.$response.error) {
        throw new Error();
    }

    const [membership] = membershipQueryResult.Items;
    if (!membership) {
        throw new Error();
    }

    const canLinkSubscription = ['unlinked', 'pending_link'].includes(membership.status);
    if (!canLinkSubscription) {
        throw new Error();
    }

    const lineItems = await stripeClient.checkout.sessions.listLineItems(checkoutSession.id);

    if (lineItems.data.some(({ price }) => !price)) {
        throw new Error();
    }

    const membershipEntitlementsData = await Promise.all(
        lineItems.data.map(async ({ id, price }) => {
            if (!price) {
                throw new Error();
            }

            const entitlementQueryResponse = await getEntitlementById(typeof price.product === 'string' ? price.product : price.product.id);
            if (entitlementQueryResponse.$response.error) {
                throw new Error();
            }

            return { linkedStripeCheckoutSessionLineItemId: id, entitlementId: entitlementQueryResponse.Item.entitlementId };
        })
    );

    const membershipMutationResult = await updateMembership({
        userId: membership.userId,
        status: 'active',
        entitlements: membershipEntitlementsData,
        linkedStripeSubscriptionId: checkoutSession.id,
        lastPaymentDate: Date.now(),
        nextPaymentDate: null,
    });

    if (membershipMutationResult.$response.error) {
        throw new Error();
    }
};

export const createCustomerPortalSession = async (userId: string) => {
    const membershipQueryResult = await getMembershipByUserId(userId);

    if (membershipQueryResult.$response.error) {
        // Handle Error
        throw new Error();
    }

    const membership = membershipQueryResult.Item;
    if (!membership) {
        // Handle Error
        throw new Error();
    }

    return stripeClient.billingPortal.sessions.create({
        customer: membership.linkedStripeCustomerId,
    }) as Promise<Stripe.BillingPortal.Session>;
};
