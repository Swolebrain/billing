import { RemovalPolicy } from 'aws-cdk-lib/core';
import { Api, Config, StackContext, Table } from 'sst/constructs';

export function API({ stack, app }: StackContext) {
    const membershipsTable = new Table(stack, `MembershipsTable`, {
        fields: { userId: 'string', linkedStripeCustomerId: 'string' },
        primaryIndex: { partitionKey: 'userId' },
        globalIndexes: {
            linkedStripeCustomerId: { partitionKey: 'linkedStripeCustomerId' },
        },
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
    const APP_NAME = new Config.Parameter(stack, 'APP_NAME', { value: app.name });
    const APP_STAGE = new Config.Parameter(stack, 'APP_STAGE', { value: app.stage });

    stack.setDefaultFunctionProps({
        runtime: 'nodejs18.x',
        bind: [membershipsTable, entitlementsTable, usageRecordsTable, APP_NAME, APP_STAGE, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
    });

    const api = new Api(stack, 'RestAPI', {
        customDomain: {
            domainName: `api.solidsnake.millionairecodersclub.com`,
        },
        routes: {
            'GET /': 'packages/functions/src/index.helloWorld',
            'POST /webhook': 'packages/functions/src/events.eventsHandler',
            'POST /checkout/initiate': 'packages/functions/src/checkout.checkoutInitiate',
            'POST /memberships/{userId}/usage/{entitlementId}': 'packages/functions/src/memberships.reportUsageRecord',
            'GET /memberships/{userId}/authorize/{entitlementId}': 'packages/functions/src/memberships.requestEntitlementAccess',
            'POST /memberships/{userId}/customer-portal-session': 'packages/functions/src/memberships.requestCustomerPortalSession',
        },
    });

    stack.addOutputs({
        ApiEndpoint: api.url,
    });
}
