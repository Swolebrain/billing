import { join } from 'path';
import { ResourceRootDefinition } from '../@types';

export const config: ResourceRootDefinition = {
    envConfig: {
        depsLockFilePath: join(__dirname, 'package-lock.json'),
        runtime: 'NODEJS_18_X',
    },
    resources: [
        {
            name: 'checkout',
            lambdas: [
                {
                    name: 'PostCheckoutFunction',
                    entry: join(__dirname, 'checkout', 'post.ts'),
                    method: 'GET',
                },
            ],
        },
    ],
};
