import { AWSError } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { dynamoDbClient } from 'src/integrations';
import { Table } from 'sst/node/table';
import Stripe from 'stripe';

type MembershipEntitlementData =
    | { entitlementId: string; linkedStripeSubscriptionItemId: string; linkedStripeCheckoutSessionLineItemId?: undefined }
    | { entitlementId: string; linkedStripeSubscriptionItemId?: undefined; linkedStripeCheckoutSessionLineItemId: string };

export interface MembershipInterface {
    userId: string;
    status: Stripe.Subscription.Status | 'pending_link' | 'unlinked';
    entitlements: MembershipEntitlementData[];
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
        typeof membershipUpdatedData.status !== 'undefined' && '#status=:status',
        typeof membershipUpdatedData.entitlements !== 'undefined' && 'entitlements=:entitlements',
        typeof membershipUpdatedData.linkedStripeCustomerId !== 'undefined' && 'linkedStripeCustomerId=:linkedStripeCustomerId',
        typeof membershipUpdatedData.linkedStripeSubscriptionId !== 'undefined' && 'linkedStripeSubscriptionId=:linkedStripeSubscriptionId',
        typeof membershipUpdatedData.lastPaymentDate !== 'undefined' && 'lastPaymentDate=:lastPaymentDate',
        typeof membershipUpdatedData.nextPaymentDate !== 'undefined' && 'nextPaymentDate=:nextPaymentDate',
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
