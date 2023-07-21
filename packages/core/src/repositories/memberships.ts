export interface MembershipInterface {
    userId: string;
    status: string;
    entitlementIds: string[];
    linkedStripeCustomerId: string;
    linkedStripeSubscriptionId: string;
    lastPaymentDate: number;
    nextPaymentDate: number;
}
