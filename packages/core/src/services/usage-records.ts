import { stripeClient } from '../integrations';
import { MembershipInterface } from '../repositories/memberships';
import { saveUsageRecord } from '../repositories/usage-records';

export const reportUsage = async ({
    userId,
    selectedEntitlement,
    quantity,
}: {
    userId: string;
    selectedEntitlement: MembershipInterface['entitlements'][number];
    quantity: number;
}) => {
    if (!selectedEntitlement.linkedStripeSubscriptionItemId) return;

    const insertedToDynamoDbAt = Date.now();

    const stripeUsageRecordResponse = await stripeClient.subscriptionItems.createUsageRecord(
        selectedEntitlement.linkedStripeSubscriptionItemId,
        { quantity }
    );

    const saveUsageRecordResult = await saveUsageRecord({
        userId: userId,
        timestamp: insertedToDynamoDbAt,
        entitlementId: selectedEntitlement.entitlementId,
        quantity,
        linkedStripeProductId: selectedEntitlement.entitlementId,
        linkedStripeSubscriptionItemId: selectedEntitlement.linkedStripeSubscriptionItemId,
        linkedStripeUsageRecordId: stripeUsageRecordResponse.id,
        linkedStripeUsageRecordTimestamp: Date.now(),
    });

    if (saveUsageRecordResult.$response.error) {
        // Handle error
        return;
    }
};
