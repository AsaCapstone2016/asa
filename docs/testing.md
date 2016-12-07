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

## **Testbench**

### **Purpose**

For the sake of velocity, we've built a tool which allows us to test our 
lambda functions locally without the need to redeploy to our Cloudformation 
stack on every change. This saves us a couple minutes every time we want to
see our changes and greatly speeds up the debugging process.

This solution is intended to serve as a temporary tool during development
until Serverless or any other tool provides a simple way to run integrated
services locally.

### **How does it work?**

The Testbench achieves this through the following steps:

    1. Wrapping lambda functions in an express app
    2. Running the express app locally
    3. Exposing localhost through ngrok
    4. Rewiring API gateway endpoints to point to the local express app using the Node SDK for AWS.

### **Setup and run testbench**

Make sure you have installed all dependencies for the ASA Project and deployed to AWS 
using Serverless.

In the root of the project:

```bash
$ npm run testbench:setup
$ npm run testbench
```
### **Improvements**

The testbench was initially hard wired to support only the fb-webhook
endpoint. The addition of multiple Lambda functions deployed as HTTP
endpoints necessitates either a refactoring to allow for dynamic hosting
of Lambda functions or adding required functions manually. 