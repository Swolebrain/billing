import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

interface LambdaDefinition {
    name: string;
    entry: string;
    method: string;
}

interface ResourceDefinition {
    name: string;
    lambdaCommonProps: lambdaNodeJs.NodejsFunctionProps;
    lambdas: LambdaDefinition[];
    resources?: ResourceDefinition[];
}

interface ResourceRootDefinition {
    lambdaCommonProps: lambdaNodeJs.NodejsFunctionProps;
    resources: ResourceDefinition[];
}

interface BillingStackProps extends cdk.StackProps {
    appName: string;
    deploymentStage: string;
    hostedZone: route53.IHostedZone;
    resourceRoot: ResourceRootDefinition;
}

export class BillingStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: BillingStackProps) {
        super(scope, id, props);

        const api = new apigateway.RestApi(this, `${this.node.id}-apiGateway`, {
            restApiName: `${props.appName}-${props.deploymentStage}`,
        });

        this.addResourcesRecursively(api.root, props.resourceRoot.resources, props.resourceRoot.lambdaCommonProps);

        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: api.url,
        });
    }

    private addResourcesRecursively(
        parentResource: apigateway.IResource,
        resourceDefs: ResourceDefinition[],
        lambdaCommonProps: lambdaNodeJs.NodejsFunctionProps,
        level = 0
    ): void {
        resourceDefs.forEach((resourceDef) => {
            const resourceLambdaCommonProps =
                level > 0 && resourceDef.lambdaCommonProps
                    ? { ...lambdaCommonProps, ...resourceDef.lambdaCommonProps }
                    : { ...lambdaCommonProps };

            const resource = parentResource.addResource(resourceDef.name);

            resourceDef.lambdas.forEach((lambdaDef) => {
                const lambdaFunction = new lambdaNodeJs.NodejsFunction(this, `${this.node.id}-${lambdaDef.name}-lambda`, {
                    ...resourceLambdaCommonProps,
                    entry: lambdaDef.entry,
                });

                const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);

                resource.addMethod(lambdaDef.method, lambdaIntegration);
            });

            if (resourceDef.resources) {
                this.addResourcesRecursively(resource, resourceDef.resources, resourceLambdaCommonProps, level + 1);
            }
        });
    }
}
