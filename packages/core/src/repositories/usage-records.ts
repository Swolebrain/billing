import { Table } from 'sst/node/table';
import { dynamoDbClient } from '../integrations';

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
