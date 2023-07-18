import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { ResourceRootDefinition } from './resources';

export interface PrerequisitesStackProps extends cdk.StackProps {
    appName: string;
    deploymentStage: string;
    hostedZoneName: string;
}

export interface AppStackProps extends cdk.StackProps {
    appName: string;
    deploymentStage: string;
    hostedZone: route53.IHostedZone;
    resourceRoot: ResourceRootDefinition;
}

export interface LambdaRestApiStageProps extends AppStackProps {}
