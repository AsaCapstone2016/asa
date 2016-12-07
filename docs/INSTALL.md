# **Install and Deploy**
---------------------------------

[Back to Table of Contents](./../README.md)

[asa repo]: https://github.com/AsaCapstone2016/asa

[serverless docs]: https://serverless.com/framework/docs/
[facebook dev]: https://developers.facebook.com/
[wit.ai website]: https://wit.ai/

[technical debt]: ./tech-debt.md

## **Environment Setup**

Install Node version 4.3.2 to match the version of Node.js used by AWS Lambda functions.
If using nvm simply run

```bash
$ nvm install 4.3.2
```

Make sure to update the version of npm by running

```bash
$ npm install npm -g
```

Now download and install [serverless][serverless docs] version 1.1.0 which
also requires installing the AWS CLI tool. Newer versions of Serverless exist
but have not been tested with Asa. See the [Technical Debt][technical debt]
section for more information.

Create two environment variables which are used in the serverless.yml file to
determine to which stage and region Lambda functions should be deployed. You may
replace the values of these variables with whatever you choose as long as the region
string is a valid AWS region that supports Lambda.

```bash
$ echo export SLS_USER=aaron > ~/.bashrc
$ echo export SLS_REGION=us-east-1 >> ~/.bashrc
```

## **Create Facebook Application**

Go to the [Facebook Developer][facebook dev] website and create a new Facebook Application.

On the left panel under *Products -> Messenger* go to *Token Generation* and generate
a page token for whichever page users should have to message in order to communicate
with Asa. You may have to create a page in order to do this.

Save the page token to use later in the config file.

## **Create Wit.ai application**

Asa requires an NLP application to parse user intents. Go to [Wit.ai][wit.ai website]
and create a new application from the asa-wit-app.zip file in the root folder.
This file contains all defined entities, stories, and training data needed by Wit
to clone the NLP application developed for Asa.

Go to the Settings tab for the Wit app and save to **Server Access Token** to use
in the config file.

## **Setup Asa repo**

Clone the [Asa repo][asa repo] and install needed packages by running

```bash
$ git clone https://github.com/AsaCapstone2016/asa
$ cd asa
$ npm install
```

## **Create config.js File**

Now create a config.js file in the root of the asa directory from this template:

```javascript
'use strict';

let URL_PREFIX = "https://w1xolv4lie.execute-api.us-east-1.amazonaws.com/aaron";

module.exports = {

    IN_PROD: false,

    AWS_ID: "REPLACE",
    AWS_SECRET: "REPLACE",
    AWS_TAG: "REPLACE",

    FB_PAGE_TOKEN: "REPLACE",
    FB_VERIFY_TOKEN: "mamma-jamma",

    WIT_TOKEN: "REPLACE",

    TABLE_PREFIX: "ASA-aaron-",

    CART_REDIRECT_URL: `${URL_PREFIX}/cart-redirect`,
    SUGGESTION_EVENT_URL: `${URL_PREFIX}/suggestion-event`,
    REMINDER_EVENT_URL: `${URL_PREFIX}/reminder-event`
};
```

Here is a description of all the variables you need to REPLACE:

| Variable      | Description
| ------------- | ---
| URL_PREFIX    | Base URL used by API Gateway to expose Lambda functions in this stage and region. Generated after deploying Asa stack for first time.
| AWS_ID        | Your AWS ID
| AWS_SECRET    | Your AWS Secret
| AWS_TAG       | Your Amazon Associates Tag
| FB_PAGE_TOKEN | Page token generated for Facebook App in previous step
| WIT_TOKEN     | Server Access Token retreived from Wit app in previous step
| TABLE_PREFIX  | Table prefix of the form "ASA-${SLS_USER}-" used for DynamoDB tables

## **Deploy with Serverless**

Now run

```bash
$ npm run deploy
```

to create the Asa stack on AWS and deploy each Lambda function.

## **Add Lambda URLs to Config File and Redeploy**

Asa will not work after the initial deployment because she needs URLs to several
lambda functions created by the initial deployment.

At the end of the output from ```npm run deploy`` find the output of endpoint URLs.
Notice that each URL is identical except for the name of the final resource. Copy a
URL from the beginning until just before the last forward slash and set this as the
value of the URL_PREFIX variable in the config file.

Now rerun ```npm run deploy``` to update the config file deployed on AWS.

## **Verify Webhook With Facebook Application**

In order to receive user messages through your Facebook Page, you need to register
The fb-webhook URL created by the deploy command. Copy the *entire* URL ending
with "fb-webhook" before proceeding.

Go to your Facebook App and under *Products -> Messenger* click "Setup Webhooks".

Paste the URL for the fb-webhook into the "Callback URL" field and enter the
FB_VERIFY_TOKEN found in your config file. For "Subscription Fields" select
**messages** and **messaging_postbacks**.

## **Setup Redirect for Purchase Links**

At this point, every Asa feature should work except for the **Checkout** buttons
under item results. These links send the user to the cart-redirect Lambda endpoint
which should redirect them to the purchase page on Amazon. A minor change in
API Gateway is needed to support this redirect.

First log on to the AWS Console and go to API Gateway. Then find your API which
should be called something of the form ${SLS_USER}-ASA.

Click on the **GET** method under the **/cart-redirect** resource.

First, edit the Method Response:
* Delete 200 HTTP status
* Add response with status 302
* Add a header for the 302 response called "Location"

Now edit the Integration Response back in the Method Execution section:
* Delete 200 response status
* Add integration response with status 302
* Under header mappings for the 302 response, set the value for the
  Location header to "integration.response.body.location"

Make sure to save and deploy these changes.

## **Verify the Install**

To make sure everything is properly hooked up, message your page through
Facebook.

If sending "Hi" does not receive a response of "Howdy!" then the webhook
has not been set up properly.

If the **Checkout** button under search results sends you to a page showing
a raw JSON object then the cart redirect was not set up properly in API Gateway.