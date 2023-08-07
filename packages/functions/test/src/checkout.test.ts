import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { CheckoutInitiateBody, CheckoutInitiateResponseBody } from '../../src/checkout';
import { TEST_USER_ID } from '../data';

const baseUrl = `https://api.solidsnake.millionairecodersclub.com`;

describe('route: /checkout', () => {
    it('POST /checkout/initiate', async () => {
        const body: CheckoutInitiateBody = {
            userId: TEST_USER_ID,
            items: [{ entitlementId: 'prod_OLOxrZP6sFtIfs', linkedStripePriceId: 'price_1NZkivG2qDDl01Z5J3bJkHad' }],
            successUrl: 'http://success.com',
            cancelUrl: 'http://cancel.com',
        };

        const initiateResponse = await axios.post<CheckoutInitiateResponseBody>(`${baseUrl}/checkout/initiate`, body);

        expect(initiateResponse.data.checkoutSession).toBeDefined();
        expect(initiateResponse.data.checkoutSession.url).toBeDefined();
    });
});
