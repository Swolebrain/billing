import { MembershipInterface } from '@billing/core/repositories/memberships';

export const TEST_USER_ID = 'TEST_USER_ID';

export const testMembershipBaseData: Omit<MembershipInterface, 'linkedStripeCustomerId'> = {
    userId: TEST_USER_ID,
    entitlements: [],
    status: 'pending_link',
    lastPaymentDate: null,
    nextPaymentDate: null,
    linkedStripeSubscriptionId: null,
};
