import { Api, StackContext } from 'sst/constructs';

export function API({ stack }: StackContext) {
    stack.setDefaultFunctionProps({
        runtime: 'nodejs18.x',
    });

    const api = new Api(stack, 'api', {
        routes: {
            'GET /': 'packages/functions/src/index.helloWorld',
        },
    });

    stack.addOutputs({
        ApiEndpoint: api.url,
    });
}
