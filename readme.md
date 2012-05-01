This is a bot used in the room of the same name on Turntable.fm. 
Forked from [ttModeratorBot](https://github.com/MikeWills/ttModeratorBot), 
and uses the [TurnTable API](https://github.com/alaingilbert/Turntable-API).

###Features

* Has a queue for listeners to sign up
* Only allows a certain number of plays each time the DJ is on the table and boots them off when their turn is done.
* Has Twitter integration.
* Writes log to DB.
* Allows for remote DB access.


###Setup

1. Install node.js
2. Install ttapi from NPM
3. Install mysql from NPM (optional)
4. Install twit from NPM (optional)
5. Install forever from NPM (optional but recommended)
6. Install the files somewhere or use git to bring the files to your computer
7. Setup the make a copy of the config file and setup your information and rules
8. Launch bot.js using node

###Changelog
* 4/30/2012 - Initial fork from MikeWills/ttModeratorBot.  Added remote DB access, logging to DB, twitter integration, limit suspension when decks are not full and reconfigured database tables.

