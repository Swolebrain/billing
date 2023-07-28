import { AWSError, Request } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';
import { dynamoDb } from 'src/integrations/dynamodb';
import { Table } from 'sst/node/table';

export interface EntitlementInterface {
    entitlementId: string;
    name: string;
    description?: string | null;
    active: boolean;
    linkedStripeProductId: string;
    linkedStripePrices: { priceId: string; active: boolean }[];
}

interface GetEntitlementItemOutput extends DocumentClient.GetItemOutput {
    Item: EntitlementInterface;
}

type GetEntitlementQuery = PromiseResult<GetEntitlementItemOutput, AWSError>;

export const saveEntitlement = (entitlement: EntitlementInterface) =>
    dynamoDb.put({ TableName: Table.EntitlementsTable.tableName, Item: entitlement }).promise();

export const getEntitlementById = (entitlementId: string) =>
    dynamoDb.get({ TableName: Table.EntitlementsTable.tableName, Key: { entitlementId } }).promise() as Promise<GetEntitlementQuery>;

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

    return dynamoDb
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
