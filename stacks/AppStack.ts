import { RemovalPolicy } from 'aws-cdk-lib/core';
import { Api, Config, StackContext, Table } from 'sst/constructs';

export function API({ stack }: StackContext) {
    const membershipsTable = new Table(stack, `MembershipsTable`, {
        fields: { userId: 'string' },
        primaryIndex: { partitionKey: 'userId' },
        cdk: {
            table: {
                removalPolicy: RemovalPolicy.DESTROY,
            },
        },
    });

    const entitlementsTable = new Table(stack, `EntitlementsTable`, {
        fields: { entitlementId: 'string' },
        primaryIndex: { partitionKey: 'entitlementId' },
        cdk: {
            table: {
                removalPolicy: RemovalPolicy.DESTROY,
            },
        },
    });

    const usageRecordsTable = new Table(stack, `UsageRecordsTable`, {
        fields: { userId: 'string', timestamp: 'number' },
        primaryIndex: { partitionKey: 'userId', sortKey: 'timestamp' },
        cdk: {
            table: {
                removalPolicy: RemovalPolicy.DESTROY,
            },
        },
    });

    const STRIPE_SECRET_KEY = new Config.Secret(stack, 'STRIPE_SECRET_KEY');
    const STRIPE_WEBHOOK_SECRET = new Config.Secret(stack, 'STRIPE_WEBHOOK_SECRET');

    stack.setDefaultFunctionProps({
        runtime: 'nodejs18.x',
        bind: [membershipsTable, entitlementsTable, usageRecordsTable, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
    });

    const api = new Api(stack, 'RestAPI', {
        customDomain: {
            domainName: `api.solidsnake.millionairecodersclub.com`,
        },
        routes: {
            'GET /': 'packages/functions/src/index.helloWorld',
            'POST /webhook': 'packages/functions/src/events.eventsHandler',
            'POST /checkout/initiate': 'packages/functions/src/checkout.checkoutInitiate'
        },
    });

    stack.addOutputs({
        ApiEndpoint: api.url,
    });
}
