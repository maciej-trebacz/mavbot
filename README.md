# MavBot 2.0

## Setup

This bot requires a Firebase account for storing data.
Create one here: https://firebase.google.com/

Once registered you need to create a service account JSON file:
* In the Firebase console, open Settings > Service Accounts.
* Click Generate New Private Key, then confirm by clicking Generate Key.
* Store the file as `firebase-admin.json` in the main directory of the app.

## Running

To run locally and watch for file changes just type `yarn start:dev`.

## TODO

* Streamlabs - obtaining initial token
* DB - cetralise DB access, maybe define a schema?
* Triggers
  * bits, subs, donations
  * point rewards
  * hype train
  * stream start/stop
  * raid
* Actions
  * alerts
* UI
  * navigation
    * create / manage events
    * settings
    * login
  * authenticating user using Twitch login
  * adding/removing events
  * viewing logs
* AI Chatbot
  * Implement a long-term memory for people who interact with the bot to remember them next time
* Misc. ideas
  * Auto shout-outs