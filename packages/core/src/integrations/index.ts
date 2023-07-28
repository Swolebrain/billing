import { DynamoDB } from 'aws-sdk';
import { Config } from 'sst/node/config';
import Stripe from 'stripe';

export const dynamoDbClient = new DynamoDB.DocumentClient();

const stripeSecretKey = Config.STRIPE_SECRET_KEY;
export const stripeClient = new Stripe(stripeSecretKey, { apiVersion: '2022-11-15' });
