import { AWSError } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
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

interface GetMultipleUsageRecordItemsOutput extends DocumentClient.GetItemOutput {
    Items: UsageRecordInterface[];
}

type GetMultipleUsageRecordQuery = PromiseResult<GetMultipleUsageRecordItemsOutput, AWSError>;

export const getUsageRecordsByUserIdAfterTimestamp = (userId: string, timestamp: number, consistentRead: boolean = false) =>
    dynamoDbClient
        .query({
            TableName: Table.UsageRecordsTable.tableName,
            KeyConditionExpression: `#userId = :userId AND #ts >= :ts`,
            ExpressionAttributeNames: {
                '#ts': 'timestamp',
                '#userId': 'userId',
            },
            ExpressionAttributeValues: {
                ':userId': userId,
                ':ts': timestamp,
            },
            ConsistentRead: consistentRead,
        })
        .promise() as Promise<GetMultipleUsageRecordQuery>;
