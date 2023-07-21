# Billing

This is a serverless app built with SST to provide a way to easily connect apps to Stripe and manage their subscriptions.

## Before you start

Make sure all secrets for the app are set up on AWS SSM and if not you can set them up for your stage as follows:

```
$ npx sst secrets set YOUR_SECRET_NAME your_secret_value
```

These are created with the name `/sst/{appName}/{stageName}/Secret/YOUR_SECRET_NAME/value` in AWS SSM for your account, where {appName} is the name of your SST app, and {stageName} is the stage you are configuring for. If a fallback value for the secret has been created by any other developer connected to the same AWS account, it can be found at AWS SSM for your account named as `/sst/{appName}/.fallback/Secret/YOUR_SECRET_NAME/value`

Currently the app needs the following secrets to run properly:

1. STRIPE_SECRET_KEY

2. STRIPE_WEBHOOK_SECRET

## How to start locally

1. From the root directory of the project run `npm i` to have all necessary packages installed.

2. Make sure you're at the root of the project and run `npx sst dev --profile your_aws_profile_alias`

3. Wait for the deployment to occur, this will generate new Cfn stacks as defined in the `sst.config.ts` file and upon completion the url to access the api will show in the terminal.

4. You're all set! The [Live Lambda Dev Environment](https://docs.sst.dev/live-lambda-development) is up and running.
