import { dynamoDb } from 'src/integrations/dynamodb';
import { Table } from 'sst/node/table';

export interface EntitlementInterface {
    entitlementId: string;
    name: string;
    description: string;
    status: string;
    linkedStripeProductId: string;
    linkedStripePrices: { priceId: string; active: boolean }[];
}

export const createEntitlement = (entitlement: EntitlementInterface) =>
    dynamoDb.put({ TableName: Table.EntitlementsTable.tableName, Item: entitlement }).promise();

export const getEntitlementById = (entitlementId: string) =>
    dynamoDb.get({ TableName: Table.EntitlementsTable.tableName, Key: { entitlementId } }).promise();
