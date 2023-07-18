import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { BillingStackProps, ResourceDefinition, ResourceRootDefinition } from '../@types';

export class BillingStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: BillingStackProps) {
        super(scope, id, props);

        const api = new apigateway.RestApi(this, `${this.node.id}-apiGateway`, {
            restApiName: `${props.appName}-${props.deploymentStage}`,
        });

        this.addResourcesRecursively(api.root, props.resourceRoot.resources, this.getNodeJsFunctionConfig(props.resourceRoot.envConfig));

        const subDomain = `${props.deploymentStage}-api`;
        const subDomainName = `${subDomain}.${props.hostedZone.zoneName}`;

        const certificate = new acm.Certificate(this, `${this.node.id}-certificate`, {
            domainName: subDomainName,
            validation: acm.CertificateValidation.fromDns(props.hostedZone),
        });

        const customDomain = new apigateway.DomainName(this, `${this.node.id}-customDomainName`, {
            domainName: subDomainName,
            certificate,
        });

        customDomain.addApiMapping(api.deploymentStage);

        new route53.ARecord(this, 'ApiCustomDomainAliasRecord', {
            zone: props.hostedZone,
            target: route53.RecordTarget.fromAlias(new cdk.aws_route53_targets.ApiGatewayDomain(customDomain)),
            recordName: subDomainName,
        });

        new cdk.CfnOutput(this, `${this.node.id}-apiEndpoint`, {
            value: api.url,
        });
    }

    private getNodeJsFunctionConfig(envConfig: ResourceRootDefinition['envConfig']): lambdaNodeJs.NodejsFunctionProps {
        return {
            runtime: lambda.Runtime[`${envConfig.runtime}`] as lambda.Runtime,
            depsLockFilePath: envConfig.depsLockFilePath,
        };
    }

    private addResourcesRecursively(
        parentResource: apigateway.IResource,
        resourceDefs: ResourceDefinition[],
        lambdaCommonProps: lambdaNodeJs.NodejsFunctionProps,
        level = 0
    ): void {
        resourceDefs.forEach((resourceDef) => {
            const resourceLambdaCommonProps =
                level > 0 && resourceDef.resourceEnvConfig
                    ? { ...lambdaCommonProps, ...this.getNodeJsFunctionConfig(resourceDef.resourceEnvConfig) }
                    : { ...lambdaCommonProps };

            const resource = parentResource.addResource(resourceDef.name);

            resourceDef.lambdas.forEach((lambdaDef) => {
                const lambdaFunction = new lambdaNodeJs.NodejsFunction(this, `${this.node.id}-${lambdaDef.name}-lambda`, {
                    ...resourceLambdaCommonProps,
                    entry: lambdaDef.entry,
                });

                const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);

                resource.addMethod(lambda.HttpMethod[lambdaDef.method], lambdaIntegration);
            });

            if (resourceDef.resources) {
                this.addResourcesRecursively(resource, resourceDef.resources, resourceLambdaCommonProps, level + 1);
            }
        });
    }
}
