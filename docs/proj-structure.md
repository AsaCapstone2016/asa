# **Project Structure**
---------------------------------

[Back to Table of Contents](./../README.md)

[lambda functions folder]: ./functions
[platform clients folder]: ./core/platforms
[conv manager folder]: ./core/conversation-manager
[wit client folder]: ./core/node-wit
[amazon client folder]: ./core/amazon
[user profiler folder]: ./core/user-profiler
[dao folder]: ./core/database

## **Lambda Functions**
The [functions][lambda functions folder] folder contains handler functions
for each AWS Lambda function used by Asa. Here is a quick overview of each
function found in the folder:

| Function             | Purpose
| -------------------- | ---
| cart-redirect        | Endpoint used for every purchase link. Redirects to page on Amazon. Needed to track user purchase events.
| fb-endpoint          | Webhook for Asa on Facebook Messenger. Every user message is sent here for handling.
| reminder-event       | Sends reminders to users.
| reminder-scheduler   | Run every minute, passes reminders to the reminder-event endpoint.
| suggestion-event     | Sends suggestions to users.
| suggestion-scheduler | Run every hour, passes scheduled suggestions to the suggestion-event endpoint.

## **Platform Clients**
Platform clients are responsible for converting platform specific message formats
into a standardized json object to be consumed by the Conversation Handler and to
later take a message in a standardized format and send it to a specific user on
that specific platform.

Currently there is only one supported platform - Facebook Messenger - but adding
support for other platforms should be as simple as creating other platform clients
and a new endpoint identical to the fb-endpoint but with a different require statement
when importing the platform client.

All platform clients are defined in the [platforms][platform clients folder] folder
in the core directory.

## **Conversation Manager**

## **Wit Client**

## **Amazon Client**

## **User Profiler**

## **Database Access Objects (DAOs)**