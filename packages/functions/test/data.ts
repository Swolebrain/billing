import { MembershipInterface } from '@billing/core/repositories/memberships';

export const baseUrl = `https://api.solidsnake.millionairecodersclub.com`;

export const TEST_USER_ID = 'TEST_USER_ID';

export const testMembershipBaseData: Omit<MembershipInterface, 'linkedStripeCustomerId'> = {
    userId: TEST_USER_ID,
    entitlements: [],
    status: 'pending_link',
    lastPaymentDate: null,
    nextPaymentDate: null,
    linkedStripeSubscriptionId: null,
};

export const testStripeProductBaseData = {
    name: 'STRIPE_TEST_PRODUCT_NAME',
    description: 'STRIPE_TEST_PRODUCT_DESCRIPTION',
} as const;

export const testStripeProductForPriceEvents = {
    id: 'STRIPE_TEST_PRODUCT_FOR_PRICE_EVENTS',
    name: 'STRIPE_TEST_PRODUCT_FOR_PRICE_EVENTS',
    description: 'STRIPE_TEST_PRODUCT_FOR_PRICE_EVENTS',
} as const;

export const testStripePriceBaseData = {
    recurring: {
        interval: 'month',
        usage_type: 'metered',
    },
    currency: 'USD',
    unit_amount: 1,
} as const;
