# **Technical Debt**
---------------------------------

[Back to Table of Contents](./../README.md)

## **Update version of Serverless**

Serverless is under pretty active development. As of December 2016
it is on version 1.3 while Asa has only been verified to work with
version 1.1 which was the most recent version just one month prior.

With this type of pace, many useful features of Serverless will
go unused such as the introduction of Lambda environment variable
support in version 1.2 which would remove the need for a config file.

## **Inconsistent use of user IDs**

Many keys used to identify records in database tables include a
user ID made from the page scoped Facebook ID for that user and
a platform string like so: ```fb-<uid>```. This is necessary because
there is no guarantee a user ID will be unique accross platforms
but it is guaranteed to be unique within one platform.

However the Sessions, PurchasedItems, and SearchQueries tables don't
use the platform string and would need to be updated before making
Asa available on other platforms.

## **Generalize platform client functions**

Platform clients should only implement the ability to send generalized
message templates on their specific platform. All business logic as
to the content of those messages should be kept in the Conversation
Manager.

Currently the business logic is split between the two locations. For
example, raw search results are sent to the Facebook Messenger client
to construct the results message.

Extending to multiple platforms would require evaluating what
group of message types are common or at least possible to replicate
on all platforms then refactoring the current platform client code.

## **Refactor Conversation Manager**
Generalizing platform client functions will also require a refactoring
of the Conversation Manager.

## **Minimal test coverage**

Currently only the Amazon client and Facebook Messenger client are
unit tested.