#!/usr/bin/env node
import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import { BillingStack } from '../lib/billing-stack';
import { PrerequisitesStack } from '../lib/prerequisites-stack';
import { config } from '../resources/root.config';

const app = new cdk.App();

const globalConfig = {
    appName: 'SolidSnake', // change this
    deploymentStage: 'staging',
    hostedZoneName: 'solidsnake.millionairecodersclub.com', //change this
    cdkEnv: {
        region: 'us-east-2', // maybe change this but you might not wanna use us-east-1
    },
};

const preRequisitesStack = new PrerequisitesStack(app, `${globalConfig.appName}-prerequisites`, {
    appName: globalConfig.appName,
    deploymentStage: globalConfig.deploymentStage,
    hostedZoneName: globalConfig.hostedZoneName,
    env: globalConfig.cdkEnv,
});

new BillingStack(app, `${globalConfig.appName}-compute`, {
    appName: globalConfig.appName,
    deploymentStage: globalConfig.deploymentStage,
    hostedZone: preRequisitesStack.hostedZone,
    resourceRoot: config,
    env: globalConfig.cdkEnv,
});
