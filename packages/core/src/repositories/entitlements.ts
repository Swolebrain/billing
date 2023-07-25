import { dynamoDb } from 'src/integrations/dynamodb';
import { Table } from 'sst/node/table';

export interface EntitlementInterface {
    entitlementId: string;
    name: string;
    description?: string | null;
    active: boolean;
    linkedStripeProductId: string;
    linkedStripeActivePriceIds: Set<string>;
}

export const createEntitlement = (entitlement: EntitlementInterface) =>
    dynamoDb.put({ TableName: Table.EntitlementsTable.tableName, Item: entitlement }).promise();

export const getEntitlementById = (entitlementId: string) =>
    dynamoDb.get({ TableName: Table.EntitlementsTable.tableName, Key: { entitlementId } }).promise();

type EntitlementUpdateArgInterface = Pick<EntitlementInterface, 'entitlementId'> &
    Partial<Omit<EntitlementInterface, 'linkedStripeActivePriceIds'>> & {
        stripePriceIdsToAdd?: Set<string>;
        stripePriceIdsToDelete?: Set<string>;
    };

export const updateEntitlement = (entitlementUpdateArg: EntitlementUpdateArgInterface) => {
    const setActions = [entitlementUpdateArg.name && 'name=:name', entitlementUpdateArg.description && 'description=:description']
        .filter((value): value is string => !!value)
        .join(', ');

    const addActions = [
        entitlementUpdateArg.stripePriceIdsToAdd &&
            entitlementUpdateArg.stripePriceIdsToAdd.size > 0 &&
            'linkedStripeActivePriceIds :add_prices',
    ]
        .filter((value): value is string => !!value)
        .join(', ');

    const deleteActions = [
        entitlementUpdateArg.stripePriceIdsToDelete &&
            entitlementUpdateArg.stripePriceIdsToDelete.size > 0 &&
            'linkedStripeActivePriceIds :delete_prices',
    ]
        .filter((value): value is string => !!value)
        .join(', ');

    return dynamoDb.update({
        TableName: Table.EntitlementsTable.tableName,
        Key: { entitlementId: entitlementUpdateArg.entitlementId },
        UpdateExpression: [
            !!setActions && `SET ${setActions}`,
            !!addActions && `ADD ${addActions}`,
            !!deleteActions && `DELETE ${deleteActions}`,
        ].join(' '),
        ExpressionAttributeValues: {
            ':name': entitlementUpdateArg.name,
            ':description': entitlementUpdateArg.description,
            ':add_prices': entitlementUpdateArg.stripePriceIdsToAdd,
            ':delete_prices': entitlementUpdateArg.stripePriceIdsToDelete,
        },
    });
};
