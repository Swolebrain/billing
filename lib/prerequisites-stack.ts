import { HostedZone } from 'aws-cdk-lib/aws-route53';
import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { PrerequisitesStackProps } from '../@types';

/**
 * This stack is for things that need to be there before the compute stack is deployed.
 * SSM parameters, and route 53 hosted zones, for example
 */
export class PrerequisitesStack extends cdk.Stack {
    public readonly hostedZone: HostedZone;

    constructor(scope: Construct, id: string, props: PrerequisitesStackProps) {
        super(scope, id, props);
        const { hostedZoneName } = props;

        this.hostedZone = new HostedZone(this, 'HostedZone', {
            zoneName: hostedZoneName,
        });
    }
}
