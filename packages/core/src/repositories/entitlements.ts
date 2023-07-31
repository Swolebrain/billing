import { AWSError } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { dynamoDbClient } from 'src/integrations';
import { Table } from 'sst/node/table';
import Stripe from 'stripe';

export interface EntitlementInterface {
    entitlementId: string;
    name: string;
    description?: string | null;
    active: boolean;
    linkedStripeProductId: string;
    linkedStripePrices: { priceId: string; active: boolean; type: Stripe.Price.Type }[];
}

interface GetEntitlementItemOutput extends DocumentClient.GetItemOutput {
    Item: EntitlementInterface;
}

type GetEntitlementQuery = PromiseResult<GetEntitlementItemOutput, AWSError>;

export const getEntitlementById = (entitlementId: string) =>
    dynamoDbClient.get({ TableName: Table.EntitlementsTable.tableName, Key: { entitlementId } }).promise() as Promise<GetEntitlementQuery>;

export const saveEntitlement = (entitlement: EntitlementInterface) =>
    dynamoDbClient.put({ TableName: Table.EntitlementsTable.tableName, Item: entitlement }).promise();

type EntitlementUpdateArgInterface = Pick<EntitlementInterface, 'entitlementId'> & Partial<EntitlementInterface>;

export const updateEntitlement = (
    entitlementUpdateArg: EntitlementUpdateArgInterface
): Promise<PromiseResult<DocumentClient.UpdateItemOutput, AWSError>> => {
    const setActions = [
        entitlementUpdateArg.name && 'name=:name',
        entitlementUpdateArg.description && 'description=:description',
        entitlementUpdateArg.linkedStripePrices && 'linkedStripePrices=:prices',
        typeof entitlementUpdateArg.active === 'boolean' && 'active=:active',
    ]
        .filter((value): value is string => !!value)
        .join(', ');

    const UpdateExpression = [!!setActions && `SET ${setActions}`].join(' ');

    return dynamoDbClient
        .update({
            TableName: Table.EntitlementsTable.tableName,
            Key: { entitlementId: entitlementUpdateArg.entitlementId },
            UpdateExpression,
            ExpressionAttributeValues: {
                ':name': entitlementUpdateArg.name,
                ':description': entitlementUpdateArg.description,
                ':active': entitlementUpdateArg.active,
                ':prices': entitlementUpdateArg.linkedStripePrices,
            },
        })
        .promise();
};
