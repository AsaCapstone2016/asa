# **Testing**
---------------------------------

[Back to Table of Contents](./../README.md)

## **Unit Tests**

The Asa unit testing framework consists of Mocha and Chai.

Before running unit tests make sure the mocha command is available
from the command line. If not then install it with

```bash
$ npm install mocha -g
```

To run all unit tests simply execute

```bash
$ npm run tests
```

## **Run Asa Locally in Testbench**

For the sake of velocity, we've built a tool which allows us to test our 
lambda functions locally without the need to redeploy to our Cloudformation 
stack on every change, saving us a couple minutes every time we want to see our changes.

    Warning: This is very much a hack and not meant to be production code

The Testbench achieves this through the following steps:

    1. Wrapping our lambda functions in an express app
    2. Running the express app locally
    3. Exposing localhost through ngrok
    4. Eewiring our API gateway endpoints to point to our local express app using the Node SDK for AWS.

To set up and run Testbench:
Make sure you have installed all dependencies for the ASA Project and deployed to AWS 
using Serverless.

```bash
$ npm run testbench:setup
$ npm run testbench
```
