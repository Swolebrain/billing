import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { PrerequisitesStackProps } from '../@types';

/**
 * This stack is for things that need to be there before the compute stack is deployed.
 * SSM parameters, and route 53 hosted zones, for example
 */
export class PrerequisitesStack extends cdk.Stack {
    public readonly hostedZone: route53.HostedZone;
    public readonly api: apigateway.RestApi;

    constructor(scope: Construct, id: string, props: PrerequisitesStackProps) {
        super(scope, id, props);

        this.hostedZone = new route53.HostedZone(this, `${this.node.id}-HostedZone`, {
            zoneName: props.hostedZoneName,
        });

        this.api = new apigateway.RestApi(this, `${this.node.id}-ApiGateway`, {
            restApiName: `${props.appName}`,
            deploy: false,
        });
    }
}
