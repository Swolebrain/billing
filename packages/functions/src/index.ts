import { ApiHandler } from 'sst/node/api';

export const helloWorld = ApiHandler(async (event) => {
    return {
        statusCode: 200,
        body: 'Hello from Lambda with SST',
    };
});
