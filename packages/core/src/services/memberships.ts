import { stripeClient } from 'src/integrations';
import { MembershipInterface, getMembershipByUserId, saveMembership } from 'src/repositories/memberships';

export const getOrCreateMembership = async (userId: string): Promise<MembershipInterface> => {
    const membershipQueryResult = await getMembershipByUserId(userId);

    if (membershipQueryResult.$response.error) {
        // Handle Error
        throw new Error();
    }

    if (!!membershipQueryResult.Item) return membershipQueryResult.Item;

    const stripeCustomer = await stripeClient.customers.create();
    const membershipToCreate = {
        userId,
        entitlementIds: [],
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
