import { dynamoDbClient } from 'src/integrations';
import { Table } from 'sst/node/table';

export interface UsageRecordInterface {
    userId: string;
    timestamp: number;
    entitlementId: string;
    quantity: number;
    linkedStripeProductId: string;
    linkedStripeSubscriptionItemId: string;
    linkedStripeUsageRecordId?: string | null;
    linkedStripeUsageRecordTimestamp?: number | null;
}

export const saveUsageRecord = (usageRecord: UsageRecordInterface) =>
    dynamoDbClient.put({ TableName: Table.UsageRecordsTable.tableName, Item: usageRecord }).promise();
