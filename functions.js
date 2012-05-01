/* Functions */

/* ============== */
/* Log - Log the information to the console */
/* ============== */
global.Log = function(data) {
	if (logtoconsole) {
		console.log(botName, ">>>", data);
	}
	if (logtodb) {
		client.query('INSERT INTO ' + dbName + '.' + dbTablePrefix + 'log (logentry, logtime)' + 'VALUES (?, NOW())', [data]);
	}
};

/* ============== */
/* OnReady Event */
/* ============== */
global.OnReady = function(data) {
	Log("Bot Ready");
	bot.roomRegister(botRoomId);
	if (useDB) {
		SetUpDatabase();
	}
	if (useTwitter) {
		twitter.post('statuses/update', { status: msgTwitterReady }, function(err, reply) {
		  Log(err);
		  Log(reply);
		});
	}
};

/* ============== */
/* OnRoomChanged Event */
/* ============== */
global.OnRoomChanged = function(data) {
	Log("Room Changed");

	// Register all of the users in the room.
	RegisterUsers(data.users);
	UpdateDjs();
	CheckAutoDj();

	activeDj = data.room.metadata.current_dj;
	Log(activeDj);
	
	if (currentsong.artist == null && activeDj !== null){
		PopulateSongData(data);
	}

	/* Check if the queue should be enabled. */
	EnableQueue();

	//Adds all active users to the users table - updates lastseen if we've seen
	//them before, adds a new entry if they're new or have changed their username
	//since the last time we've seen them
	if (useDB) {
		for (var i in data.users) {
			if (data.users[i].name !== null) {
				client.query('INSERT INTO ' + dbName + '.' + dbTablePrefix + 'user (userid, username, lastseen)' + 'VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE lastseen = NOW()', [data.users[i].userid, data.users[i].name]);
			}
		}
	}
};

/* ============== */
/* OnRegistered Event */
/* ============== */
global.OnRegistered = function(data) {
	Log("Registered");

	if (data.user.length === 0) return;
	for (var i = 0; i < data.user.length; ++i) { /* Add to the cached user list */
		allUsers[data.user[i].userid] = BaseUser().extend(data.user[i]);
		++allUsers.length; /* Give new users a welcome message */
		var text = msgWelcome.replace(/\{username\}/gi, data.user[i].name);
		TellUser(data.user[i].userid, text);
	}

	//Add user to user table
	if (currentsong !== null) {
		currentsong.listeners++;
	}
	if (useDB) {
		if (data.user[0].name !== null) {
			client.query('INSERT INTO ' + dbName + '.' + dbTablePrefix + 'user (userid, username, lastseen)' + 'VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE lastseen = NOW()', [data.user[0].userid, data.user[0].name]);
		}
	}
};

/* ============== */
/* OnDeregistered Event */
/* ============== */
global.OnDeregistered = function(data) {
	Log("Deregistered");

	/* Remove the user from the cache */
	if (data.user.length !== 0) {
		for (var i = 0, len = data.user.length; i < len; ++i) {
			try {
				allUsers[data.user[i].userid].Remove();
			} catch (e) {
				Log("Deregister Error");
				Log(e);
				Log(i);
				Log(data);
				Log(allUsers);
			}
		}
	}
	if (useDB) {
		if (data.user[0].name !== null) {
			client.query('INSERT INTO ' + dbName + '.' + dbTablePrefix + 'user (userid, username, lastseen)' + 'VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE lastseen = NOW()', [data.user[0].userid, data.user[0].name]);
		}
	}
	/* Remove the user from the Queue if they were on it. */
	RemoveFromQueue(data.user[0].userid);
};

/* ============== */
/* OnNewModerator Event */
/* ============== */
global.OnNewModerator = function(data) {};

/* ============== */
/* OnRemModerator Event */
/* ============== */
global.OnRemModerator = function(data) {};

/* ============== */
/* OnAddDJ Event */
/* ============== */
global.OnAddDJ = function(data) {
	Log("Add DJ");

	UpdateDjs();

	CheckAutoDj();
	
	/* Check to see if they were in the last two to step down */
	ReDJCheck(data);

	/* Check if they are from the queue if there is one */
	NewDjFromQueue(data);
};

/* ============== */
/* OnRemDJ Event */
/* ============== */
global.OnRemDJ = function(data) {
	Log("Remove DJ");

	/*if (!IsBot(data.user[0].userid)) {
		StepDown();
	} */

	allUsers[data.user[0].userid].songCount = 0;
	allUsers[data.user[0].userid].afkCount = 0;

	UpdateDjs();

	CheckAutoDj();
	
	DJwaitStart = new Date();

	/* Notify the next DJ on the list */
	NextDjOnQueue();
};

/* ============== */
/* OnNewSong Event */
/* ============== */
global.OnNewSong = function(data) {
	Log("New Song");

	//Populate new song data in currentsong
	PopulateSongData(data);
	Log("Old DJ: " + activeDj);

	/* Check if the Dj has played their set */
	if (activeDj !== null) {
		CheckIfDjShouldBeRemoved(activeDj);
	}

	activeDj = data.room.metadata.current_dj;
	Log("New DJ: " + activeDj);
	/* Update the play count if active */
	if (djMaxPlays !== 0) {
		allUsers[activeDj].Increment_SongCount();
	}

	if (IsBot(activeDj)) {
		botIsPlayingSong = true;
		Log("Bot DJing");
	}

	/* Share the playcount */
	if (djMaxPlays !== 0) {
		SpeakPlayCount();
	}

	/* Check if queue status needs updating and update max plays */
	EnableQueue();

	/* If the bot is on the table, vote up the song 
	if (botOnTable) {
		AwesomeSong();
	}*/
};

/* ============== */
/* OnEndSong Event */
/* ============== */
global.OnEndSong = function(data) {
	Log("End Song");

	//Log song in DB
	if (useDB) {
		AddPlayToDb();
	}

	if (IsBot(data.room.metadata.current_dj)) {
		botIsPlayingSong = false;
	}

	/* Reset bot details */
	botVoted = false;
};

/* ============== */
/*  */
/* ============== */
global.OnSnagged = function(data) {};

/* ============== */
/*  */
/* ============== */
global.OnUpdateVotes = function(data) {
	//Update vote and listener count
	currentsong.up = data.room.metadata.upvotes;
	currentsong.down = data.room.metadata.downvotes;
	currentsong.listeners = data.room.metadata.listeners;

	/* Track if a DJ voted this song */
	for (var i = 0; i < data.room.metadata.votelog.length; i++) {
		if (IsDj(data.room.metadata.votelog[i][0]) && data.room.metadata.votelog[i][1] == 'up') {
			votedDjs.push(data.room.metadata.votelog[i][0]);
		}
	}

	/* If autobop is enabled, determine if the bot should autobop or not based on votes */
	if (useAutoBop) {
		var percentAwesome = 0;
		var percentLame = 0;

		if (data.room.metadata.upvotes !== 0) {
			percentAwesome = (data.room.metadata.upvotes / data.room.metadata.listeners) * 100;
		}
		if (data.room.metadata.downvotes !== 0) {
			percentLame = (data.room.metadata.downvotes / data.room.metadata.listeners) * 100;
		}

		if ((percentAwesome - percentLame) > 25) {
			AwesomeSong();
		}

		if ((percentLame - percentAwesome) > 25) {
			LameSong();
		}
	}
};

/* ============== */
/* OnNoSong Event */
/* ============== */
global.OnNoSong = function(data) {};

/* ============== */
/* OnUpdateUser Event */
/* ============== */
global.OnUpdateUser = function(data) {};

/* ============== */
/* OnBootedUser Event */
/* ============== */
global.OnBootedUser = function(data) {};

/* ============== */
/* OnSpeak Event */
/* ============== */
global.OnSpeak = function(data) {
	Command("speak", data);
};

/* ============== */
/* OnPmmed Event */
/* ============== */
global.OnPmmed = function(data) {
	if (data.senderid != '4f471af5590ca24b6600145b') {
		Command("pm", data);
	}
};

/* ============== */
/* Command - Processes all spoken commands */
/* ============== */
global.Command = function(source, data) {
	var text = "";
	var pm = false;
	var speak = false; /* First break apart the comand */
	var result = data.text.match(/^\!(.*?)( .*)?$/);
	var requestedUser = "";
	var requestedUserName = "";

	if (source == "speak") {
		speak = true;
		requestedUser = data.userid;
		requestedUserName = data.name;
	}
	if (source == "pm") {
		pm = true;
		requestedUser = data.senderid;
		//requestedUserName = allUsers[requestedUser].name;
	}

	if (result) {
		var command = result[1].trim().toLowerCase();
		var param = '';

		if (result.length == 3 && result[2]) {
			param = result[2].trim().toLowerCase();
		}

		Log("Command: " + command + " | Param: " + param);

		if (command == "q+" || command == "addme") {
			AddToQueue(data);
		} else if (command == "q-") {
			RemoveFromQueue(data.userid);
		} else if (command == "q" || command == "wait") {
			QueueStatus();
		} else if (command == "rules") {
			text = msgRules.replace(/\{username\}/gi, requestedUserName);
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		} else if (command == "info") {
			text = msgInfo.replace(/\{username\}/gi, requestedUserName);
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		} else if (command == "qrules") {
			text = msgQueueRules.replace(/\{username\}/gi, requestedUserName);
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		} else if (command == "help") {
			text = msgHelp.replace(/\{username\}/gi, requestedUserName);
			Speak(text);
			if (IsMod(requestedUser)) {
				Pause(250);
				text = msgModHelp.replace(/\{username\}/gi, requestedUserName);
				TellUser(requestedUser, text);
			}
		} else if (command == "whois" || command == "about") {
			if (speak) {
				Speak(msgAbout);
			} else if (pm) {
				TellUser(requestedUser, msgAbout);
			}
		} else if (command == "count") {
			SpeakPlayCount();
		} else if (command == "issue" || command == "bug" || command == "feature" || command == "idea") {
			TellUser(requestedUser, msgBugs);
		} else if (command == "1ndone" || command == "1anddone") {
			djMaxPlays = maxPlays;
			Speak(msgOneAndDone);
		} else if (command == "resetmaxplays" || command == "reset") {
			djMaxPlays = djMaxPlays;
			Speak("We have reset to max plays of " + maxPlays);
		}

		/**** MODERATOR FUNCTIONS ****/
		/*else if (command == "a" || command == "awesome") {
			if (IsMod(data.userid)) {
				AwesomeSong();
			}
		} else if (command == "l" || command == "lame") {
			if (IsMod(data.userid)) {
				LameSong();
			}
		}*/
		else if (command == "realcount") {
			if (IsMod(requestedUser)) {
				if (param === "") {
					TellUser(requestedUser, "Usage: !realcount xxxxx");
				} else {
					SetRealCount(param);
				}
			}
		} else if (command == "skip") {
			if (IsMod(requestedUser)) {
				bot.skip();
			}
		} else if (command == "autodj" && pm) {
			if (IsMod(requestedUser)) {
				if (param == "true" || param == "false") {
					useAutoDj = param;
					TellUser(requestedUser, "Auto DJ set to " + useAutoDj);
				} else {
					TellUser(requestedUser, "Usage: !autodj true or false. Currently it is set to " + useAutoDj);
				}
			}
		} else if (command == "autobop" && pm) {
			if (IsMod(requestedUser)) {
				if (param == "true" || param == "false") {
					useAutoBop = param;
					TellUser(requestedUser, "Auto bop set to " + useAutoBop);
				} else {
					TellUser(requestedUser, "Usage: !autobop true or false. Currently it is set to " + useAutoBop);
				}
			}
		}  else if (command == "consolelog" && pm) {
			if (IsMod(requestedUser)) {
				if (param == "true" || param == "false") {
					logtoconsole = param;
					TellUser(requestedUser, "Auto DJ set to " + logtoconsole);
				} else {
					TellUser(requestedUser, "Usage: !consolelog true or false. Currently it is set to " + logtoconsole);
				}
			}
		} else if (command == "setlaptop" && pm) {
			if (IsMod(requestedUser)) {
				if (param === "") {
					TellUser(requestedUser, "Usage: !setlaptop xxxxx");
				} else {
					bot.modifyLaptop(param);
				}
			}
		} else if (command == "setavatar" && pm) {
			if (IsMod(requestedUser)) {
				if (param === "") {
					TellUser(requestedUser, "Usage: !setavatar #");
				} else {
					bot.setAvatar(param);
				}
			}
		} else if (command == "kill" && pm) {
			if (IsMod(requestedUser)) {
				bot.roomDeregister();
        		process.exit(0);
			}
		}else if (command == "addsong") {
			AddSong(requestedUser);
		}
		else if (command == "nowait") {
			text = "You want me to suspend the wait requirement?";
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		}
		else if (command == "mystats") {
			text = "You want me to tell you about your stats?";
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		}
		else if (command == "myplays") {
			text = "You want me to tell you about your plays?";
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		}
		else if (command == "topdjs") {
			text = "You want me to tell you about the top djs?";
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		}
		else if (command == "topsongs") {
			text = "You want me to tell you about the top songs?";
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		}
		else if (command == "topartists") {
			text = "You want me to tell you about the top artists?";
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		}
		else if (command == "taco") {
			text = "Sweet!  I love tacos!";
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		}
		else if (command == "slurm") {
			text = "Whimmy Wham Wham Wozzle!";
			if (speak) {
				Speak(text);
			} else if (pm) {
				TellUser(requestedUser, text);
			}
		}

		/* Catch all */
		else {
			Speak("I have no idea what you're talking about.  I'm going to go back to rocking, ok?");
		}
	}

	/* Catch all for the morons that can't read. */
	if (data.text == "q+") {
		Log("Add to Queue");
		AddToQueue(data);
	}
};

/* ============== */
/* RegisterUsers -  */
/* ============== */
global.RegisterUsers = function(pUsers) {
	Log("Registering Users");
	if (!pUsers || !pUsers.length) return;
	for (var i = 0; i < pUsers.length; ++i) {
		var sUser = pUsers[i];
		allUsers[sUser.userid] = BaseUser().extend(sUser);
		++allUsers.length;
	}
	Log("Done registering users");
};

/* ============== */
/* AwesomeSong -  */
/* ============== */
global.AwesomeSong = function(userid) {
	if (!botVoted) {
		bot.vote('up');
		botVoted = true;
	}
};

/* ============== */
/* LameSong -  */
/* ============== */
global.LameSong = function(userid) {
	if (!botVoted) {
		bot.vote('down');
		botVoted = true;
	}
};

/* ============== */
/* EnableQueue - Check to see if the queue should be enabled or if the playcount should be updated */
/* ============== */
try {
	require("./enableQueue.js");
} catch (e) {
	Log("Missing custom EnableQueue, loading default.");
	require("./enableQueueDefault.js");
}

/* ============== */
/* AddToQueue */
/* ============== */
global.AddToQueue = function(data) {
	var text = "";

	if (queueActive && useQueue) { /* Check if they are a DJ */
		if (djs.indexOf(data.userid) == -1) { /* Check if they are already on the queue*/
			if (djQueue.indexOf(data.userid) == -1) {
				djQueue.push(data.userid);
				text = msgAddedToQueue.replace(/\{username\}/gi, data.name).replace(/\{queuesize\}/gi, djQueue.length);
				TellUser(data.userid, text);
				Log(djQueue);
			}
		} else {
			text = msgQueueOnTable.replace(/\{username\}/gi, data.name);
			TellUser(data.userid, text);
		}
	} else {
		TellUser(data.userid, msgNoQueue);
	}
};

/* ============== */
/* RemoveFromQueue */
/* ============== */
global.RemoveFromQueue = function(userid) {
	if (queueActive && useQueue) {
		if (djQueue.indexOf(userid) != -1) {
			djQueue.splice(djQueue.indexOf(userid), 1);
		}
	}
};

/* ============== */
/* NewDjFromQueue */
/* ============== */
global.NewDjFromQueue = function(data) {
	if (queueActive && useQueue) {
		var text = "";

		if (djQueue.length > 0) {
			if (data.user[0].userid != djQueue[0]) {
				bot.remDj(data.user[0].userid);
				if (nextDj == null || nextDj == ""){
					nextDj = djQueue[0];
				}
				Log(nextDj);
				text = msgWrongQueuedDj.replace(/\{username\}/gi, allUsers[nextDj].name);
				TellUser(data.user[0].userid, text);
			} else {
				RemoveFromQueue(data.user[0].userid);
				clearInterval(refreshIntervalId);
				nextDj = "";
			}
		}
	}
};

/* ============== */
/* NextDjOnQueue */
/* ============== */
global.NextDjOnQueue = function() {
	if (queueActive && useQueue) {
		if (djQueue.length > 0) {
			var text = msgNextQueuedDj.
						replace(/\{username\}/gi, allUsers[djQueue[0]].name).
						replace(/\{timeout\}/gi, nextDjQueueTimeout);
			Speak(text);
			nextDj = djQueue[0];
			nextDjTime = new Date();
			refreshIntervalId = setInterval(CheckForNextDjFromQueue, 5000);
		} else {
			Speak(msgEmptyQueue);
		}
	}
};

/* ============== */
/* CheckForNextDjFromQueue */
/* ============== */
global.CheckForNextDjFromQueue = function() {
	if (nextDj !== "" && djQueue[0] == nextDj) {
		var currentTime = new Date();
		if (currentTime.getTime() - nextDjTime.getTime() > (nextDjQueueTimeout * 1000)) {
			RemoveFromQueue(nextDj);
			clearInterval(refreshIntervalId);
			NextDjOnQueue();
		}
	}
};

/* ============== */
/* QueueStatus */
/* ============== */
global.QueueStatus = function() { /**/
	var djList = "";
	for (var i = 0; i < djQueue.length; i++) {
		djList += allUsers[djQueue[i]].name + ", ";
	}
	if (queueActive && useQueue) {
		var text = msgQueueStatus.replace(/\{queuesize\}/gi, djQueue.length).replace(/\{queuedDjs\}/gi, djList);
	} else {
		var text = msgNoQueue;
	}
	Speak(text);
};

/* ============== */
/* CheckIfDjShouldBeRemoved */
/* ============== */
global.CheckIfDjShouldBeRemoved = function(userid) {

	for (var i = 0; i < djs.length; i++) {
		if (activeDj != djs[i] && !IsBot(djs[i])) {
			if (votedDjs.indexOf(djs[i]) == -1) {
				allUsers[djs[i]].afkCount++;
				if (allUsers[djs[i]].afkCount >= afkPlayCount) {
					allUsers[djs[i]].RemoveDJ();
					Speak(msgAFKBoot.replace(/\{username\}/gi, allUsers[djs[i]].name));
				} else if (allUsers[djs[i]].afkCount >= 1) {
					Speak(msgAFKWarn.replace(/\{username\}/gi, allUsers[djs[i]].name));
				}
			} else {
				allUsers[djs[i]].afkCount = 0;
			}
		}
	}

	//check against maxplays
	if (djs.length > suspendBootthreshold && allUsers[userid].songCount >= djMaxPlays && djMaxPlays !== 0 && !IsBot(userid)) {
		allUsers[userid].RemoveDJ();
		Speak(msgLastSong.replace(/\{username\}/gi, allUsers[userid].name));
		djWait[1] = djWait[0];
		djWait[0] = userid;
	}
	if (djs.length <= suspendBootthreshold && allUsers[userid].songCount == djMaxPlays && !IsBot(userid)) {
		Speak(msgSmallCrowd);
	}
	if (botStepDownAfterSong) {
		allUsers[userid].RemoveDJ();
		botStepDownAfterSong = false;
	}
};

/* ============== */
/*  */
/* ============== */
global.SpeakPlayCount = function() {
	var count = ['x', 'x', 'x', 'x', 'x'];
	for (var i = 0; i < djs.length; i++) {
		count[i] = allUsers[djs[i]].songCount;
	}
	var playCount = count[0] + '-' + count[1] + '-' + count[2] + '-' + count[3] + '-' + count[4];
	Speak(msgPlayCount.replace(/\{playcount\}/gi, playCount));
};

/* ============== */
/* SetRealCount */
/* ============== */
global.SetRealCount = function(param) {
	var array = param.split('-');
	if (array.length != 5) {
		Speak("Invalid syntax");
		return;
	}
	for (var i = 0; i < array.length; i++) {
		if (array[i] != 'x') {
			allUsers[djs[i]].songCount = array[i];
		}
	}
	SpeakPlayCount();
};

/* ============== */
/* CheckAutoDj - The bot will see if it should step up the decks */
/* ============== */
global.CheckAutoDj = function() {
	if (useAutoDj) {
		bot.roomInfo(function(data) {
			if (data.room.metadata.djcount !== 0) {
				if (data.room.metadata.djcount === 1 && IsBot(data.room.metadata.djs[0])) {
					StepDown();
					return;
				}

				if (data.room.metadata.djcount < botDJthreshold) {
					if (!botOnTable) {
						StepUp();
						return;
					}
				}

				if (data.room.metadata.djcount > botDJthreshold) {
					if (botOnTable && !botIsPlayingSong) {
						StepDown();
						return;
					} else if (botOnTable && botIsPlayingSong) {
						botStepDownAfterSong = true;
					}
				}
			}
		});
	}
};

/* ============== */
/* StepUp - Bot steps up to the decks */
/* ============== */
global.StepUp = function(text) {
	bot.addDj();
	Speak(msgBotJoinTable);
	botOnTable = true;
};

/* ============== */
/* StepUp - Bot steps up to the decks */
/* ============== */
global.StepDown = function(text) {
	Speak(msgBotLeaveTable);
	bot.remDj();
	botOnTable = false;
};

/* ============== */
/* AddSong - Add song to bot playlist */
/* ============== */
global.AddSong = function(userid) {
	if (IsMod(userid)) {
		Log("Add Song");
		bot.roomInfo(true, function(data) {
			var newSong = data.room.metadata.current_song._id;
			var songName = data.room.metadata.current_song.metadata.song;
			bot.playlistAdd(newSong);
			bot.vote('up');
			Speak(msgAddSong);
		});
	} else {
		Log("Not mod on add");
		Speak(msgAddSongNotMod);
	}
};

/* ============== */
/* Speak - Bot broadcasts to everyone */
/* ============== */
global.Speak = function(text) {
	bot.speak(text);
};

/* ============== */
/* TellUser - Give information to a specific user */
/* ============== */
global.TellUser = function(userid, text) {
	if (!IsBot(userid)) {
		if (!IphoneUser(userid)) {
			bot.pm(text, userid);
		} else {
			bot.speak(text);
		}
	}
};

/* ============== */
/* IphoneUser - Checks to see if the user is on an iPhone (can't PM) */
/* ============== */
global.IphoneUser = function(userid) {
	return allUsers[userid].IsiOS();
};

/* ============== */
/* IsMod - Check to see if the user is a moderator */
/* ============== */
global.IsMod = function(userid) {
	if (moderators.indexOf(userid) != -1) {
		Log("Moderator");
		return true;
	} else {
		Log("Not Moderator");
		return false;
	}
};

/* ============== */
/* UpdateDjs - Check to see if the user is a moderator */
/* ============== */
global.UpdateDjs = function() {
	bot.roomInfo(function(data) { /* Update the list since we are here */
		djs = data.room.metadata.djs;
		moderators = data.room.metadata.moderator_id;
	});
};

/* ============== */
/* IsDj - Check to see if the user is a moderator */
/* ============== */
global.IsDj = function(userid) {
	if (djs.indexOf(userid) != -1) {
		return true;
	} else {
		return false;
	}
};


/* ============== */
/* IsBot - Check to see if the user is a moderator */
/* ============== */
global.IsBot = function(userid) {
	return userid == botUserId;
};

/* ============== */
/* Pause */
/* ============== */
global.Pause = function(ms) {
	ms += new Date().getTime();
	while (new Date() < ms) {}
};


global.PopulateSongData = function(data) {
	currentsong.artist = data.room.metadata.current_song.metadata.artist;
	currentsong.song = data.room.metadata.current_song.metadata.song;
	currentsong.djname = data.room.metadata.current_song.djname;
	currentsong.djid = data.room.metadata.current_song.djid;
	currentsong.up = data.room.metadata.upvotes;
	currentsong.down = data.room.metadata.downvotes;
	currentsong.listeners = data.room.metadata.listeners;
	currentsong.started = data.room.metadata.current_song.starttime;
	currentsong.snags = 0;
};

global.AddPlayToDb = function(data) {
	var songArtist = currentsong.artist;
	var songName = currentsong.song;
	var songDJName = currentsong.djname;
	var songDJID = currentsong.djid;
	var songUp = currentsong.up;
	var songDown = currentsong.down;
	var songListeners = currentsong.listeners;
	var songSnags = currentsong.snags;
	client.query('INSERT INTO ' + dbName + '.' + dbTablePrefix + 'artist (artist,lastplayed)' + 'VALUES (?, NOW()) ON DUPLICATE KEY UPDATE lastplayed = NOW()', [songArtist]);
	client.query('SELECT id FROM ' + dbName + '.' + dbTablePrefix + 'artist WHERE artist = ?', [songArtist],
		function selectCb(error, results, fields) {
		  if (error) {
			  Log('GetData Error: ' + error.message);
			  client.end();
			  return;
		  }
	 
		  if(results.length > 0)
		  {
			var firstResult = results[0];
			artistid = firstResult['id'];
			Log('Artist ID: ' + artistid);
			client.query('INSERT INTO ' + dbName + '.' + dbTablePrefix + 'song (artist_id,song,up,down,listeners,snags,bonus)' + 'VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE up = up + ?, down = down + ?, listeners = listeners + ?, snags = snags + ?', [artistid, songName, songUp, songDown, songListeners, songSnags, 0, songUp, songDown, songListeners, songSnags]);
			client.query('SELECT id FROM ' + dbName + '.' + dbTablePrefix + 'song WHERE artist_id = ? AND song = ?', [artistid, songName],
				function selectCb(error, results, fields) {
				  if (error) {
					  Log('GetData Error: ' + error.message);
					  client.end();
					  return;
				  }
			 
				  if(results.length > 0)
				  {
					var firstResult = results[0];
					songid = firstResult['id'];
					Log('Song ID: ' + songid);
					client.query('INSERT INTO ' + dbName + '.' + dbTablePrefix + 'play (song_id,dj_id,up,down,listeners,started,snags)'+ 'VALUES (?, ?, ?, ?, ?, NOW(), ?)', [songid, songDJID, songUp, songDown, songListeners, songSnags]);
				  }
				}
			);  
		  }
		}
	);
};

global.ReDJCheck = function(data) {
	var currentTime = new Date();
	if ((currentTime.getTime() - DJwaitStart.getTime() > (reDJwaitTimeout * 1000)) & djWait[0] !== 1) {
		Log("No More Wait");
		for (var r = 0; r < reDJwait; r++) {
			djWait[r] = 1;
		}
		Speak(msgReDJAllowed);
	}

	for (var r = 0; r < reDJwait; r++) {
		if (data.user[0].userid == djWait[r]){
			Log("Cannot DJ Again So Soon");
			text = msgReDJTooSoon.replace(/\{username\}/gi, data.user[0].name);
			Speak(text);
			bot.remDj(data.user[0].userid);
		}
	}
};

global.SetUpDatabase = function() {
	//Creates DB and tables if needed, connects to db
	client.query('CREATE DATABASE ' + dbName, 
		function(error) {
			if (error && error.number != mysql.ERROR_DB_CREATE_EXISTS) {
				throw (error);
			}
		}
	);
	client.query('USE ' + dbName);

	//song table
	client.query('CREATE TABLE ' + dbTablePrefix + 'song(id INT(11) AUTO_INCREMENT,' + ' artist_id int(11),' + ' song VARCHAR(255),' + ' up INT(11),' + ' down INT(11),' + ' listeners INT(11),' + ' snags INT(11),' + ' bonus INT(11),' + 'PRIMARY KEY (artist_id, song),' + 'UNIQUE INDEX id (id))', 
		function(error) {
			//Handle an error if it's not a table already exists error
			if (error && error.number != 1050) {
				throw (error);
			}
		}
	);

	//chat table
	client.query('CREATE TABLE ' + dbTablePrefix + 'chat(id INT(11) AUTO_INCREMENT PRIMARY KEY,' + ' userid VARCHAR(255),' + ' chat VARCHAR(255),' + ' time DATETIME)', 
		function(error) {
			//Handle an error if it's not a table already exists error
			if (error && error.number != 1050) {
				throw (error);
			}
		}
	);

	//user table
	client.query('CREATE TABLE ' + dbTablePrefix + 'user(userid VARCHAR(255), ' + 'username VARCHAR(255), ' + 'lastseen DATETIME, ' + 'PRIMARY KEY (userid, username))',
		function(error) {
			//Handle an error if it's not a table already exists error
			if (error && error.number != 1050) {
				throw (error);
			}
		}
	);
	
	//play table
	client.query('CREATE TABLE ' + dbTablePrefix + 'play(id INT(11) AUTO_INCREMENT PRIMARY KEY, ' + 'song_id INT(11), ' + 'dj_id VARCHAR(255), ' + 'up INT(11), '+ 'down INT(11), '+ 'listeners INT(11), ' + 'started DATETIME, '+ 'snags INT(11))',
		function(error) {
			//Handle an error if it's not a table already exists error
			if (error && error.number != 1050) {
				throw (error);
			}
		}
	);
	
	//artist table
	client.query('CREATE TABLE ' + dbTablePrefix + 'artist(id INT(11) AUTO_INCREMENT PRIMARY KEY, ' + 'artist VARCHAR(255), ' + 'lastplayed DATETIME)',
		function(error) {
			//Handle an error if it's not a table already exists error
			if (error && error.number != 1050) {
				throw (error);
			}
		}
	);
	
	//log table
	client.query('CREATE TABLE ' + dbTablePrefix + 'log(id INT(11) AUTO_INCREMENT PRIMARY KEY, ' + 'logentry VARCHAR(5000), ' + 'logtime DATETIME)',
		function(error) {
			//Handle an error if it's not a table already exists error
			if (error && error.number != 1050) {
				throw (error);
			}
		}
	);
};

/* ============== */
/* Pause */
/* ============== */
Object.defineProperty(Object.prototype, "extend", {
	enumerable: false,
	value: function(from) {
		var props = Object.getOwnPropertyNames(from);
		var dest = this;
		props.forEach(function(name) {
			if (name in dest) {
				var destination = Object.getOwnPropertyDescriptor(from, name);
				Object.defineProperty(dest, name, destination);
			}
		});
		return this;
	}
});

/* ============== */
/* BaseUser - The base user object for tracking the users. */
/* ============== */
BaseUser = function() {
	return {
		userid: -1,
		name: "I said what what",
		isBanned: false,
		isMod: false,
		isOwner: false,
		isDJ: false,
		laptop: "pc",
		afkWarned: false,
		afkCount: 0,
		songCount: 0,
		bootAfterSong: false,
		joinedTime: Date.now(),
		Boot: function(pReason) {
			bot.bootUser(this.userid, pReason ? pReason : "");
		},
		IsiOS: function() {
			return this.laptop === "iphone";
		},
		IsBot: function() {
			return this.userid == botUserId;
		},
		RemoveDJ: function() {
			if (this.IsBot()) return;
			bot.remDj(this.userid);
		},
		Increment_SongCount: function() {
			++this.songCount;
			Log(this.name + "'s song count: " + this.songCount);
		},
		Remove: function() {
			var sUserId = this.userid;
			delete allUsers[sUserId];
		},
		Initialize: function() {
			this.songCount = 0;
			this.afkTime = Date.now();
			this.afkWarned = false;
			this.bootAfterSong = false;
			this.isDJ = djs.indexOf(this.userid) != -1;
			this.isMod = IsMod(this.userid);
			this.joinedTime = Date.now();
		}
	};
};
