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
        app.stack(API);
    },
};

export default sstConfig;
