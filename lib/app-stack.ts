import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AppStackProps } from '../@types';
import { LambdaRestApiStage } from './constructs/lambda-rest-api-stage';

export class AppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AppStackProps) {
        super(scope, id, props);

        const restApiStage = new LambdaRestApiStage(this, `${this.node.id}-LambdaRestApiStage`, props);
    }
}
