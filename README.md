# 3rd-party-oauth

The purpose of this document is to describe the functionality and workflow of FXCM’s 3rd Party OAUTH authentication. 

FXCM’s RESTAPI requires an access_token to be passed in order to authenticate an end user and establish a trading session.  Prior to the OAUTH authentication solution, an end user would have to log in to FXCM’s Trading Station Web platform with their username and password and subsequently generate an access token.  This model is sufficient for the end user who will be integrating with the API directly.

When 3rd parties build applications to be consumed by the end user and utilize the RestAPI, the end user must supply the application with their access token.  This process is cumbersome to the end user, as they must access two applications.

The 3rd party OAUTH authentication model solves this problem by allowing the 3rd party application to direct the end user to FXCM’s authentication page.  Upon successful authentication, FXCM will redirect back to the 3rd party application and provide the token.  This model follows standard OAUTH2 protocol and requires each 3rd party to register their callback URL with FXCM and get issued a client_id and client_secret.

This document outlines the steps a 3rd party should take in order to integrate with the OAUTH authentication model, as well as provide instructions to access and run sample a sample front end application.

For detail, please refer to insturctions [3rdPartyOAUTH.docx](https://github.com/fxcm/3rd-party-oauth/blob/master/3rdPartyOAUTH.docx)

