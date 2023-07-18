import * as AWSLambda from 'aws-lambda';

// Define the Lambda function handler
export const handler: AWSLambda.APIGatewayProxyHandler = async (event, context) => {
    try {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Hello from Lambda!' }),
        };
    } catch (error) {
        // Handle errors
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};
