import { SSTConfig } from 'sst';
import { API } from './stacks/AppStack';

const sstConfig: SSTConfig = {
    config(_input) {
        return {
            name: 'billing',
            region: 'us-east-2',
        };
    },
    stacks(app) {
        if (app.mode === 'dev') app.setDefaultRemovalPolicy('destroy');
        app.stack(API, { stackName: app.logicalPrefixedName('API') });
    },
};

export default sstConfig;
