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

* Triggers
  * bits, subs, donations
  * point rewards
  * hype train
  * stream start/stop
  * raid
  * first message (ever / per stream)
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
* Misc. ideas
  * Auto shout-outs