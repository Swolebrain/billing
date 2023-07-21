import { DynamoDB } from 'aws-sdk';

export const dynamoDb = new DynamoDB.DocumentClient();
