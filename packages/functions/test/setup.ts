import { saveMembership } from '@billing/core/repositories/memberships';
import { afterAll, beforeAll } from 'vitest';
import { testMembershipBaseData } from './data';
import { getStripeCustomerForTest } from './helpers';

beforeAll(async () => {
    const stripeCustomer = await getStripeCustomerForTest();
    saveMembership({ ...testMembershipBaseData, linkedStripeCustomerId: stripeCustomer.id });
});

afterAll(async () => {
    const stripeCustomer = await getStripeCustomerForTest();
    saveMembership({ ...testMembershipBaseData, linkedStripeCustomerId: stripeCustomer.id });
});
