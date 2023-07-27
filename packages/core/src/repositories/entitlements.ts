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

type EntitlementUpdateArgInterface = Pick<EntitlementInterface, 'entitlementId'> &
    Partial<Omit<EntitlementInterface, 'linkedStripeActivePriceIds'>>;

export const updateEntitlement = (entitlementUpdateArg: EntitlementUpdateArgInterface) => {
    const setActions = [
        entitlementUpdateArg.name && 'name=:name',
        entitlementUpdateArg.description && 'description=:description',
        entitlementUpdateArg.linkedStripePrices && 'linkedStripeActivePrices=:prices',
        typeof entitlementUpdateArg.active === 'boolean' && 'active=:active',
    ]
        .filter((value): value is string => !!value)
        .join(', ');

    return dynamoDb
        .update({
            TableName: Table.EntitlementsTable.tableName,
            Key: { entitlementId: entitlementUpdateArg.entitlementId },
            UpdateExpression: [!!setActions && `SET ${setActions}`].join(' '),
            ExpressionAttributeValues: {
                ':name': entitlementUpdateArg.name,
                ':description': entitlementUpdateArg.description,
                ':active': entitlementUpdateArg.active,
                ':prices': entitlementUpdateArg.linkedStripePrices,
            },
        })
        .promise();
};
