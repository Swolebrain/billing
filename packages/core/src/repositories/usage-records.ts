export interface UsageRecordInterface {
    userId: string;
    timestamp: number;
    entitlementId: string;
    quantity: number;
    linkedStripeProductId: string;
    linkedStripeUsageRecordId: string;
    linkedStripeUsageRecordTimestamp: string;
}
