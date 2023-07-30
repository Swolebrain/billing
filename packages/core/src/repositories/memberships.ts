import { AWSError } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { dynamoDbClient } from 'src/integrations';
import { Table } from 'sst/node/table';

export interface MembershipInterface {
    userId: string;
    status: string;
    entitlements: { entitlementId: string; linkedStripeSubscriptionItemId: string }[];
    linkedStripeCustomerId: string;
    linkedStripeSubscriptionId?: string | null;
    lastPaymentDate?: number | null;
    nextPaymentDate?: number | null;
}

interface GetMembershipItemOutput extends DocumentClient.GetItemOutput {
    Item: MembershipInterface;
}

type GetMembershipQuery = PromiseResult<GetMembershipItemOutput, AWSError>;

interface GetMultipleMembershipItemOutput extends DocumentClient.GetItemOutput {
    Items: MembershipInterface[];
}

type GetMultipleMembershipsQuery = PromiseResult<GetMultipleMembershipItemOutput, AWSError>;

export const getMembershipByUserId = async (userId: string) =>
    dynamoDbClient.get({ TableName: Table.MembershipsTable.tableName, Key: { userId } }).promise() as Promise<GetMembershipQuery>;

export const getMembershipByStripeCustomerId = async (stripeCustomerId: string) =>
    dynamoDbClient
        .query({
            TableName: Table.MembershipsTable.tableName,
            IndexName: 'linkedStripeCustomerId',
            KeyConditionExpression: 'linkedStripeCustomerId=:stripeCustomerId',
            ExpressionAttributeValues: {
                ':stripeCustomerId': stripeCustomerId,
            },
        })
        .promise() as Promise<GetMultipleMembershipsQuery>;

export const saveMembership = async (membership: MembershipInterface) =>
    dynamoDbClient
        .put({
            TableName: Table.MembershipsTable.tableName,
            Item: membership,
        })
        .promise();

type MembershipUpdatedDataInterface = Pick<MembershipInterface, 'userId'> & Partial<MembershipInterface>;

export const updateMembership = async (membershipUpdatedData: MembershipUpdatedDataInterface) => {
    const setActions = [
        typeof membershipUpdatedData.status === 'string' && '#status=:status',
        Array.isArray(membershipUpdatedData.entitlements) && 'entitlements=:entitlements',
        typeof membershipUpdatedData.linkedStripeCustomerId === 'string' && 'linkedStripeCustomerId=:linkedStripeCustomerId',
        typeof membershipUpdatedData.linkedStripeSubscriptionId === 'string' && 'linkedStripeSubscriptionId=:linkedStripeSubscriptionId',
        typeof membershipUpdatedData.lastPaymentDate === 'number' && 'lastPaymentDate=:lastPaymentDate',
        typeof membershipUpdatedData.nextPaymentDate === 'number' && 'nextPaymentDate=:nextPaymentDate',
    ]
        .filter((value): value is string => !!value)
        .join(', ');

    const UpdateExpression = [!!setActions && `SET ${setActions}`].join(' ');

    return dynamoDbClient
        .update({
            TableName: Table.MembershipsTable.tableName,
            Key: { userId: membershipUpdatedData.userId },
            UpdateExpression,
            ExpressionAttributeValues: {
                ':status': membershipUpdatedData.status,
                ':entitlements': membershipUpdatedData.entitlements,
                ':linkedStripeCustomerId': membershipUpdatedData.linkedStripeCustomerId,
                ':linkedStripeSubscriptionId': membershipUpdatedData.linkedStripeSubscriptionId,
                ':lastPaymentDate': membershipUpdatedData.lastPaymentDate,
                ':nextPaymentDate': membershipUpdatedData.nextPaymentDate,
            },
            ExpressionAttributeNames: {
                '#status': 'status',
            },
        })
        .promise();
};
