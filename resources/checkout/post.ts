import * as AWSLambda from 'aws-lambda';

// Define the Lambda function handler
export const handler: AWSLambda.APIGatewayProxyHandler = async (event, context) => {
    try {
        // Your logic here
        const response = {
            statusCode: 200,
            body: JSON.stringify({ message: 'Hello from Lambda!' }),
        };
        return response;
    } catch (error) {
        // Handle errors
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};
