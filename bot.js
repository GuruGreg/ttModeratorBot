/*
 Created by: Greg Nilsen (http://www.gregnilsen.com)
 Created by: Greg Nilsen (http://www.gregnilsen.com)
 Use: This is the Config file where bot-specific information is setup. You can multiple copies
      of this for multiple bots.
*/

// Bot details
global.botAuthId = "auth+live+*****************************";
global.botUserId = "*****************************";
global.botRoomId = "*****************************";
global.botName = "DaBot";
global.botLaptop = "pc";

// Twitter configs
global.useTwitter = true;
global.twitterConsumerKey = '*****************************';
global.twitterConsumerSecret = '*****************************';
global.twitterAccessToken = '*****************************';
global.twitterAccessTokenSecret = '*****************************';
global.msgTwitterReady = 'MyBot is online and ready to party!  Come join me at http://turntable.fm/***************************** #turntable #music';

// Database configuration
global.useDB = true;
global.dbName = "*****************************";
global.dbTablePrefix = "bot_";
global.dbLogin = "*****************************";
global.dbPassword = "*****************************&9";
global.dbHost = "*****************************";

// flags
global.logtoconsole = true;
global.logtodb = true;
global.useAutoBop = true;
global.useAutoDj = true;
global.useQueue = false;
global.useMaxPlays = true;
global.maxPlays = 5;
global.nextDjQueueTimeout = 60; // In seconds
global.useSongComments = true;
global.useAfkWarn = true;
global.afkPlayCount = 2;
global.checkSongLength = true;
global.maxSongLength = 600; // In seconds
global.reDJwait = 2;
global.reDJwaitTimeout = 60; // In seconds
global.DJwaitStart = new Date();
global.songid = 0;
global.artistid = 0;
global.botDJthreshold = 2;
global.suspendBootthreshold = 3;

global.msgWelcome = "Welcome to my musical kingdom, @{username}! Please, type !info and !rules to find out about my room and have fun!";
global.msgClosed = "Ooops...gotta run.  Be back soon!";
global.msgInfo = "@{username}: This is MyBot's musical domain, and he reigns supreme!  Type !rules for the current rules.";
global.msgRules = "@{username}: Rules: [1] Play whatever non-dubstep music you'd like. If MyBot does not approve, he'll let you know. [2] A DJ can play 5 songs then the bot will remove them. [3] When DJing, you must support your fellow DJs by clicking the awesome button.";
global.msgAbout = "I am a bot made by ShiningDimLight. He keeps my parts at http://addhere";
global.msgBugs = "If you find a bug or have a feature idea, please post them at https://github.com/MikeWills/Music-at-Will/issues or email support@mikewills.me";
global.msgHelp = "Here is what I know how to do @{username}: !rules | !info | !count | !wait | !whois | !issue";
global.msgModHelp = "Moderators can also: !awesome | !lame | !addsong | !skip | !realcount | !autodj | !autobop";
global.msgAddSong = "Awesome song...I should add that to my collection!"
global.msgAddSongNotMod = "Look, you can't just make me like whatever you want.  This is my room!"

global.msgPlayCount = "Count is: {playcount}";
global.msgLastSong = "@{username}, thank you for your awesome tunes!";
global.msgLongSong = "Wow, a {longsongtime} minute song???  YouTube doesn't allow videos that long!";
global.msgAFKWarn = "@{username}, you need to play nice and awesome other people's songs.  Otherwise, I'll be forced to boot you from the decks!";
global.msgAFKBoot = "TT Report Card: @{username} does not play well with others. Please share the love next time around.";
global.msgOneAndDone = "We are doing doing 1 and done. You play one awesome song then you're booted. Be sure to join the queue by typing !q+";
global.msgReDJTooSoon = "@{username}, please give other people an opportunity to play.  Once two others have had a chance to step up to the decks, you'll be allowed to play again.";
global.msgReDJAllowed = "The wait has been lifted.  All are free to DJ once again!";

// Queue rules.  Queues suck, but if you really want to use one...
global.msgQueueRules = "@{username}: 0-10 people = no queue; 10-30 people = 2 songs, queue in effect, (Requires DJ to sign up for the waiting list); 30+ people = 1 song, queue in effect, (Requires DJ to sign up for the waiting list).";
global.msgAddedToQueue = "@{username}, you have been added to the queue. You are # {queuesize} in the waiting list.";
global.msgRemovedFromQueue = "";
global.msgNoQueue = "MyBot doesn't believe in queues. Open spots are a free-for-all (as long as you've waited your turn after DJing).";
global.msgQueueEnabled = "The queue is in effect at this time. Please, sign in by typing !q+.";
global.msgQueueDisabled = "The queue has ended as we have less than {queuethreshold} listeners.";
global.msgNextQueuedDj = "Okay, @{username} you can step up now.  Please step up within {timeout} seconds or you will loose your spot.";
global.msgWrongQueuedDj = "I'm sorry, but it's @{username}'s turn.";
global.msgQueueOnTable = "Your just being silly. You are already on the table @{username}.";
global.msgEmptyQueue = "There is no one on the queue. Anyone can step up";
global.msgQueueStatus = "There are {queuesize} DJs waiting. The full list (in order) is: {queuedDjs}";
global.msgMaxPlays = "At this time, you can pay up to {maxplays} songs while DJing.";
global.msgSmallCrowd = "Since nobody else is stepping up to the decks, I'm going to let you keep playing, ok?"

global.msgDjJoinTable = "";
global.msgDJLeaveTable = "";
global.msgBotJoinTable = "Looks like somebody needs a friend.";
global.msgBotLeaveTable = "Looks like my job here is done!";

// Okay defualts are set. Lets load the bot.
require("./main.js");