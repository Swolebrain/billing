import { AWSError } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { dynamoDbClient } from 'src/integrations';
import { Table } from 'sst/node/table';

export interface MembershipInterface {
    userId: string;
    status: string;
    entitlementIds: string[];
    linkedStripeCustomerId: string;
    linkedStripeSubscriptionId?: string | null;
    lastPaymentDate?: number | null;
    nextPaymentDate?: number | null;
}

interface GetMembershipItemOutput extends DocumentClient.GetItemOutput {
    Item: MembershipInterface;
}

type GetMembershipQuery = PromiseResult<GetMembershipItemOutput, AWSError>;

export const getMembershipByUserId = async (userId: string) =>
    dynamoDbClient
        .get({
            TableName: Table.MembershipsTable.tableName,
            Key: { userId },
        })
        .promise() as Promise<GetMembershipQuery>;

export const saveMembership = async (membership: MembershipInterface) =>
    dynamoDbClient
        .put({
            TableName: Table.MembershipsTable.tableName,
            Item: membership,
        })
        .promise();
