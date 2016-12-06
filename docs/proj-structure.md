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
The Conversation Manager handles all user messages and button postbacks.
It is responsible for calling the NLP client to parse intents and deciding
what to do based on the intents and entities found by Wit.

The [conversation-manager][conv manager folder] folder contains the code for
this component.

## **Wit Client**
The NLP client for Wit found in the [node-wit][wit client folder] folder
is based largely off of the node-wit module written by the Wit developers.
It was modified slightly to account for cases when the parsed intents do
not have high confidence scores in order to send an "I don't understand"
message.

## **Amazon Client**
The [amazon][amazon client folder] folder contains code that communicates
with the Amazon Advertising API to do things like run searches, create
temporary carts, and find related items.

## **User Profiler**
The [user-profiler][user profiler folder] contains code for the User Profiler
which is responsible for ingesting purchase events to learn about each user
and generating recommendations to user queries and bot-initiated suggestions.

## **Database Access Objects (DAOs)**
All database code can be found in the [database][dao folder] folder. Asa
uses DynamoDB for persistent storage. The following is a summary of each
table used by Asa:

| Table          | Stores
| -------------- | ---
| Sessions       | Conversation context object for each user as well as settings such as timezone
| UserProfiles   | User profile objects for each user
| Reminders      | Reminders consisting of a task and a time to remind the user
| Subscriptions  | Scheduled times to send a bot-initiated suggestion to each user
| PurchasedItems | Purchase events logged by the cart-redirect endpoint
| SearchQueries  | Search events