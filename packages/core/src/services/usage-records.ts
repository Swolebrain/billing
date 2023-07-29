import { stripeClient } from 'src/integrations';
import { saveUsageRecord } from 'src/repositories/usage-records';

export const reportUsage = async ({
    userId,
    selectedEntitlement,
    quantity,
}: {
    userId: string;
    selectedEntitlement: { entitlementId: string; stripeSubscriptionItemId: string };
    quantity: number;
}) => {
    const insertedToDynamoDbAt = Date.now();

    const stripeUsageRecordResponse = await stripeClient.subscriptionItems.createUsageRecord(selectedEntitlement.stripeSubscriptionItemId, {
        quantity,
    });

    const saveUsageRecordResult = await saveUsageRecord({
        userId: userId,
        timestamp: insertedToDynamoDbAt,
        entitlementId: selectedEntitlement.entitlementId,
        quantity,
        linkedStripeProductId: selectedEntitlement.entitlementId,
        linkedStripeSubscriptionItemId: selectedEntitlement.stripeSubscriptionItemId,
        linkedStripeUsageRecordId: stripeUsageRecordResponse.id,
        linkedStripeUsageRecordTimestamp: Date.now(),
    });

    if (saveUsageRecordResult.$response.error) {
        // Handle error
        return;
    }
};
