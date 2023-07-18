import { HttpMethod, Runtime } from 'aws-cdk-lib/aws-lambda';

export interface LambdaDefinition {
    name: string;
    entry: string;
    method: keyof typeof HttpMethod;
}

export interface ResourceDefinition {
    name: string;
    resourceEnvConfig?: {
        runtime: keyof typeof Runtime;
        depsLockFilePath: string;
    };
    lambdas: LambdaDefinition[];
    resources?: ResourceDefinition[];
}

export interface ResourceRootDefinition {
    envConfig: {
        runtime: keyof typeof Runtime;
        depsLockFilePath: string;
    };
    resources: ResourceDefinition[];
}
