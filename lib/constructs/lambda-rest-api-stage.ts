import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { LambdaRestApiStageProps, ResourceDefinition, ResourceRootDefinition } from '../../@types';

export class LambdaRestApiStage extends Construct {
    constructor(scope: Construct, id: string, props: LambdaRestApiStageProps) {
        super(scope, id);

        const deployment = new apigateway.Deployment(this, `${this.node.id}-Deployment`, { api: props.api });

        const stage = new apigateway.Stage(this, `${this.node.id}-Stage`, { deployment, stageName: props.deploymentStage });

        this.addResourcesRecursively(
            stage.restApi.root,
            props.resourceRoot.resources,
            this.getNodeJsFunctionConfig(props.resourceRoot.envConfig)
        );

        const subDomain = `${props.deploymentStage}-api`;
        const subDomainName = `${subDomain}.${props.hostedZone.zoneName}`;

        const certificate = new acm.Certificate(this, `${this.node.id}-Certificate`, {
            domainName: subDomainName,
            validation: acm.CertificateValidation.fromDns(props.hostedZone),
        });

        const customDomain = new apigateway.DomainName(this, `${this.node.id}-CustomDomainName`, {
            domainName: subDomainName,
            certificate,
        });

        customDomain.addApiMapping(stage);

        new route53.ARecord(this, `${this.node.id}-ApiCustomDomainAliasRecord`, {
            zone: props.hostedZone,
            target: route53.RecordTarget.fromAlias(new cdk.aws_route53_targets.ApiGatewayDomain(customDomain)),
            recordName: subDomainName,
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
        resourceEnvConfig: lambdaNodeJs.NodejsFunctionProps,
        level = 0
    ): void {
        resourceDefs.forEach((resourceDef) => {
            const resolvedResourceEnvConfig =
                level > 0 && resourceDef.resourceEnvConfig
                    ? { ...resourceEnvConfig, ...this.getNodeJsFunctionConfig(resourceDef.resourceEnvConfig) }
                    : { ...resourceEnvConfig };

            const resource = parentResource.addResource(resourceDef.name);

            resourceDef.lambdas.forEach((lambdaDef) => {
                const lambdaFunction = new lambdaNodeJs.NodejsFunction(this, `${this.node.id}-${lambdaDef.name}-Lambda`, {
                    ...resolvedResourceEnvConfig,
                    entry: lambdaDef.entry,
                });

                const lambdaIntegration = new apigateway.LambdaIntegration(lambdaFunction);

                resource.addMethod(lambda.HttpMethod[lambdaDef.method], lambdaIntegration);
            });

            if (resourceDef.resources) {
                this.addResourcesRecursively(resource, resourceDef.resources, resolvedResourceEnvConfig, level + 1);
            }
        });
    }
}
