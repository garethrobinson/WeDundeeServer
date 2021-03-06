
global.questionsLoaded = false;
global.responsesLoaded = false;

require('./connectorSetup.js')(true);
require('dotenv').config();
var fs = require('fs');
var mime = require('mime');
var request = require('request');
global.prompts = require('./dialogs/prompts.js');
const defaultDialog = require('./dialogs/default.js')
var dialogs = {};
var greets = require('./intents/greetings.js');
global.emoji = require('./dialogs/emoji.js');
dialogs.inactivity = require('./dialogs/inactivity.js');
dialogs.inactivity.init();
dialogs.fallback = require('./dialogs/fallback.js');
dialogs.fallback.init();
require('./dialogs/interrupts.js')();
dialogs.media = require('./dialogs/media.js');
dialogs.media.init();
dialogs.weather = require('./dialogs/weather.js');
dialogs.weather.init();
dialogs.beginning = require('./dialogs/beginning.js');
dialogs.beginning.init();
dialogs.wrapUp = require('./dialogs/wrapUp.js');
dialogs.wrapUp.init();
dialogs.intro = require('./dialogs/intro.js');
dialogs.intro.init();
dialogs.refusal = require('./dialogs/refusal.js');
dialogs.refusal.init();
dialogs.picture = require('./dialogs/picture.js');
dialogs.picture.init();

require('./dialogs/intentManager.js')();
require('./intents/questionFacilities.js')();
var mysql = require('mysql');
var wordpress = require('wordpress');

global.idleTime = 5000;
var ref = db.ref("server/saving-data/questions");
var secretsRef = db.ref("server/saving-data/questions/secret/answers");
var tempDir = './temp';

if (!fs.existsSync(tempDir)){
    fs.mkdirSync(tempDir);
}
LoadSecrets();
LoadData();
var chatCount = -1;
var countLoaded = false;
function LoadData(){
	var dataRef = db.ref("server/bot-data/variables/chatCount");

	dataRef.on("value", function(data) {
		chatCount = data.val();
		countLoaded = true;
	  });

}

const keyFilename="./wedundeebot-firebase-adminsdk-ibkp7-c6ba8d1dd7.json";
const projectId = "wedundeebot"
const bucketName = `wedundeebot.appspot.com`;

const gcs = require('@google-cloud/storage')({
    projectId,
    keyFilename
});

const bucket = gcs.bucket(bucketName);

global.UploadFile = function (filePath, uploadTo, callback) {
	fileMime = mime.lookup(filePath);
	bucket.upload(filePath, {
		destination: uploadTo,
		public: true,
		metadata: { contentType: fileMime, cacheControl: "public, max-age=300" }
	},
	function (err, file) {
		if (err) {
			console.log(err);
			return;
		}
		console.log(createPublicFileURL(uploadTo));
		fs.unlink(filePath, function () { console.log("Cleanup successful");});
	} );
}

global.saveLog = function (id, userData) {

	var d = new Date();
	var n = d.toDateString();
	var t = d.toTimeString();

	var path = "./temp/" + userData.name + "_" + userData.logTime + ".txt";
	fs.writeFile(path, chatlogs[id].name + " - " + n + " - " + t + '\n\n' + chatlogs[id].log, function(err) {
		if (err) {
			console.log("EEEEERRRRRR");
			return console.log(err);
		}
		else {
			console.log("The file was saved!");
			UploadFile(path, "subfolder/logs/" + userData.name + "_" + userData.logTime + ".txt", function(){
				fs.unlink(path, function () { console.log("Cleanup successful");});});
		}	
	}); 	
	
	
	delete chatlogs[id];
}

function createPublicFileURL(storageName) {
	return `http://storage.googleapis.com/${bucketName}/${encodeURIComponent(storageName)}`;
	//http://storage.googleapis.com/wedundeebot/${encodeURIComponent(storageName)}
}

dialogs.questions = require('./dialogs/questions.js');
dialogs.questions.init();

function SaveQuestion(name, question) {
	var newPostRef = ref.push();
	newPostRef.set({
		question: {
			root: {
				from: name,
				text: question,
				answered: false,
				type: "textPrompt",
				expectedResponse: []
				//,
				//answers: ["Answer A", "Anser B"]
			}
		},
		answers: [],
		checked: false
	});
};

function GetBackendQuestion(callback) {
	ref.on("value", function (snapshot) {
		console.log(snapshot.val());
		ref.off("value");

		var obj_keys = Object.keys(snapshot.val());
		var ran_key = obj_keys[Math.floor(Math.random() * obj_keys.length)];
		var selectedquestion = snapshot.val()[ran_key];
		currentQuestionID = ran_key;
		currentQuestion = selectedquestion;
		console.log(selectedquestion);
		callback(currentQuestion);
	}, function (errorObject) {
		console.log("The read failed: " + errorObject.code);
		ref.off("value");
	});
	//ref.off("value", originalCallback);
};

function AnswerQuestion(id, currentAnswers, newAnswers) {
	var keyyyy = id + "/answers";
	var obb = {};
	var arr = newAnswers;
	if (currentAnswers != null) {
		arr = currentAnswers.concat(newAnswers);
	}
	obb[keyyyy] = arr;
	ref.update(obb
	);
}

//WORDPRESS
var wpClient = wordpress.createClient({
	url: "http://www.devmode.wedundee.com",
	username: "Gaz",
	password: "Z8n-ScW-akq-Jww"
});

var intents = new builder.IntentDialog();
global.address;

//NLP
//var model = 'https://eastus2.api.cognitive.microsoft.com/luis/v2.0/apps/8fce766d-71b2-4dc6-9266-65a27c778841?subscription-key=3e3add150f3a4f9c870d810b653bfd30&timezoneOffset=0&verbose=true&q='
var model = 'https://westeurope.api.cognitive.microsoft.com/luis/v2.0/apps/64a255e8-f00e-4bdc-a775-ba4497d0ed10?subscription-key=2df22f9b688f49bd9f6a552651317bdf&verbose=true&timezoneOffset=0&q='
var recognizer = new builder.LuisRecognizer(model);
bot.recognizer(recognizer);
bot.set('persistConversationData', true);

//PROMPT CONSTRUCTORS
// Create prompts
prompts.createConfirmDialog(bot, recognizer);
prompts.createTextDialog(bot, recognizer);
prompts.createMultiDialog(bot, recognizer);


var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    /*console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);*/

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

var updateCount = 0;
/////////DIALOGS/////////
/////

bot.on('incoming', function (message) {
	console.log(message);
	bot.loadSession(message.address, function (err, session) {
	
	if (message.attachments.length > 0) {
		console.log("Got an attachment");
		console.log(message.attachments[0]);
		console.log(message.attachments[0].name);
		download(message.attachments[0].contentUrl,
			'temp'+message.address.conversation.id+'.png',
			function () {
				var filename = session.userData.uploadID;
				console.log('done');
				UploadFile('./temp' + message.address.conversation.id + '.png', "subfolder/images/" + filename + ".png")
			}
		);
	}
		if (err)
			console.log("ERR: " + err);
	
	});
}
);	
bot.on('routing', function (session) {
	/*session.send({
     type: 'gaz',
     text: "unlock"
	});*/

}
);
bot.on('conversationUpdate', function (message) {
	
	if ((message.membersAdded[0].name == "WeDundee"||message.membersAdded[0].name == "WeDundeeDev")) {
		console.log("Set address");
	//
				console.log(message.address);
		bot.loadSession(message.address, function (err, session) {
			
			if (err)
				console.log("ERR: " + err);

			session.send({type: 'count',
			text: chatCount})
			if (session.userData.name) {
				bot.send(new builder.Message()
					.address(address)
					.text("Hello " + session.userData.name + ", it's so nice to see your face again."));
			} else {
				var summary = dialogs.weather.GetCurrentWeather().summary.toLowerCase();
				
				//session.beginDialog('/intro/start');
			}
		});
	} else {
		var add = message.address;
		if (timeDict[add.conversation.id] != null) {
			clearTimeout(timeDict[add.conversation.id]);
			console.log("Clear timeout");
		}
		add = {
			id: add.conversation.id + '|0000002',
			channelId: 'directline',
			user: { id: message.membersAdded[0].id },
			conversation: { id: add.conversation.id },
			bot: { id: 'WeDundee@81U4UWmTR8I', name: 'WeDundee' },
			serviceUrl: 'https://directline.botframework.com/'
		};
		bot.loadSession(add, function (err, session) {

			if (!session.conversationData.init) {
				console.log("Set REAL address");
				console.log(add);
				IncreaseChatCount();
				session.send({type: 'count',
                text: chatCount})
				Init(session);

				console.log(session.userData);
				if (err)
					console.log("ERR: " + err);
				session.conversationData.address = add;
			}
				console.log("msg sent");
				session.conversationData.lastMessageTime = Date.now();
		});
	}
});

//Middleware
bot.use({
	botbuilder: function (session, next) {
		logIncomingMessage(session, next);
	},
	send: function (event, next) {		
		logOutgoingMessage(event, next);
	}
});

logIncomingMessage = function (session, next) {
	if (!chatlogs[session.message.address.user.id]) {
		chatlogs[session.message.address.user.id] = {name:"Default", log:""};
	}
	if (session.message.type == 'message' && session.message.text.length>0) {
		chatlogs[session.message.address.user.id].name = session.userData.name;
		chatlogs[session.message.address.user.id].log += (session.userData.name + ': ' + session.message.text + '\n');
	}	
	next();
}

logOutgoingMessage = function (event, next) {
	if (event.type == 'message') {
		chatlogs[event.address.user.id].log += ('BOT: ' + event.text + '\n');
	}	
	next();
}

bot.dialog('/inactive', [
	function (session, args) {
		bot.beginDialog(global.address, args);
	}, function (session, args) {
		global.startTimer();
	}
]);
var timeout;

//ROOT
bot.dialog('/', 	
	[
		function (session, args, next) {	
			global.IdleStop(session);
			if (!session.userData.name) {
				if (!args || !args.greeting) {
					session.beginDialog("/root/introductions")
				} else {
					session.beginDialog('/intro');				
				}		
				return;
			} else {
				if (!session.conversationData.hello) {
					session.beginDialog('/confirmIdentity');
				} else {
					if ((!session.userData.knowsAboutQuestions && !session.userData.knowsWhatsUp )|| session.userData.questionCount < 1) {
						session.beginDialog('/beginning/intro');
					} else {
						if (session.dialogStack().length < 2) {
							console.log("Small talk time!");
							var randum = dialogs.fallback.getRandom();
							session.beginDialog(randum);
						} else {
							console.log("Trying to idle with a stack");
							console.log(session.dialogStack());
						}	
					}	
				}	
				return;
			}
		},
		function (session, args, next) {	
			if (!session.userData.completed) {
				console.log("We have fallen back to the root");
				global.IdleWait(session, function () { session.replaceDialog('/'); });
			} else {
				Wait(session, function () {
					session.beginDialog('/root/stillHere');
				}, 25000)
			}
	}	
	]
);


bot.dialog('/root/stillHere', [
	function (session, args, next) {		
		prompts.beginSoftConfirmDialog(session, {questionText: "Still here, huh?"});		
	},
	function (session, args, next) {
		console.log(args);
		if (args.response == 1) {
			session.send("Nice to have you around!");
		} else {
			session.send("Liar!");
		}
		global.IdleWait(session, function () { session.replaceDialog('/'); });
	}
]);

bot.dialog('/root/introductions', [	
	function (session, args, next) {	
		prompts.beginConfirmDialog(session, {questionText: "I feel like I hardly know you yet. Why don't we do some introductions?"});		
	},
	function (session, args, next) {
		console.log(args);
		if (args.response == 1) {
			session.beginDialog('/intro');
		} else {
			session.beginDialog("/refusal/introduction");
		}
	}
]);

function check(val) {
	console.log(val);
}

var doneIntro = false;

global.chatlogs = {};
global.timeDict = {};
global.globalTimeDict = {};

global.WaitForInput = function(session, time, func) {
	timeDict[session.userData.name] = setTimeout(func, time);        
}

bot.dialog('/confirmIdentity', [
	function (session, args, next) {
		ResetForSession(session);
		console.log("Confirm");
		console.log(session.message.address);
		if (args) {
			prompts.beginMultiDialog(session, {
				skip: false,
				text: args.q ,
				unsureResponse: "You don't know if you're you?",
				prompt: "Are you " + session.userData.name + "?"
			});
		}
		else {
			prompts.beginMultiDialog(session, {
				skip: false,
				text:  "Welcome back... " + session.userData.name + "?",
				unsureResponse: "You don't know if you're you?",
				prompt: "Are you " + session.userData.name + "?"
			});
			global.Wait(session, function () { session.endDialogWithResult({ type: "confirm", response: 1, skipped: true });}, 14000)
		}	
	},
	function (session, args, next) {
		global.WaitStop(session);
		if (!args.type || (args.type == "confirm" && args.response == 1)) {
			if (args.skipped) {
				session.send("Certainly looks like you anyway!");
			} else {
				session.send("Lovely. It's good to have you back!");				
			}	
			session.conversationData.hello = true;
			if (session.userData.usedQuestions && session.userData.usedQuestions.length > 2) {
				HoldDialog(session, '/picture/picture');
			} else {
				HoldDialog(session, '/beginning/intro');
			}
				
		} else if (args.type == "confirm" && args.response == 0) {
			session.send("Oh sorry! I thought you looked like " + session.userData.name + ". How embarrasing for them!");
			global.ResetData(session);
			HoldDialog(session, '/intro');
		} else if (args.type == "confirm" && args.response == 2) {
			session.replaceDialog('/confirmIdentity', { q: "Well? Are you " + session.userData.name + "?" });
		} 

	}
]
);

function IncreaseChatCount() {
	console.log("Chat increase");
	if (countLoaded) {
		chatCount++;
		var dataRef = db.ref("server/bot-data/variables/chatCount");
		dataRef.set(chatCount);
	}	
}

//INTRO
bot.dialog('/intro',
	[
		function (session, args) {			
			session.beginDialog('/profile');
		},
		function (session, results, next) {
			if (!session.userData.name) {
				session.replaceDialog('/intro');
				return;
			}
			if (session.userData.name.includes(" ")) {
				session.beginDialog("/intro/confirmName");
			} else {
				next();
			}
		},
		function (session, results, next) {			
			session.conversationData.hello = true;
			session.send('Great! Nice to meet you %s!', session.userData.name);
			
			HoldDialog(session, '/beginning/intro');
		}, function (session, args) {
			console.log("end intro");
			session.endDialog();
		}

	]
);

	

bot.dialog('/intro/confirmName',
	[
		//TODO: better handling
		function (session, args) {
			var split = session.userData.name.split(' ');
			prompts.beginConfirmDialog(session, {questionText: "Can I just call you " + split[0] + "?"});
		},
		function (session, args, next) {
			if (args.response == 1) {
				session.userData.name = ToUpper( session.userData.name.split(' ')[0]);
				session.endDialog();
			} else {
				prompts.beginConfirmDialog(session, {questionText: "Well how about " + session.userData.name.split(' ')[1] + "?"});
			}
		},
		function (session, args, next) {
			if (args.response == 1) {
				session.userData.name = ToUpper( session.userData.name.split(' ')[1]);
				session.endDialog();
			} else {
				prompts.beginTextDialog(session, { text: 'Well, what should I call you?' });
			}
		},
		function (session, args, next) {
			session.userData.name = args.text;
			prompts.beginConfirmDialog(session, {questionText: "So, you're " + args.text + "?"});
		},
		function (session, args, next) {
			if (args.response == 1) {
				session.endDialog();
			} else {
				prompts.beginConfirmDialog(session, {questionText: "Ok then. I am just going to call you 'Human'... You are human aren't you?"});
			}
		},
		function (session, args, next) {
			if (args.response == 1) {
				session.userData.name = 'Human';
				session.send("Phew, you can't be too careful, there are a lot of chat bots around these days...");
				session.endDialog();
			} else {
				session.send("Are you a chat bot?");
				prompts.beginMultiDialog(session);
			}
		},
		function (session, args, next) {
			if (!args.type) {
				if (args.text && args.text.match(/chat bot\?/ig)) {
					prompts.beginConfirmDialog(session, {questionText: "I can’t tell you, it’s classified. Are you a chat bot?"});
					return;
				} else {
					prompts.beginConfirmDialog(session, {questionText: "Eh? Are you a chat bot?"});				
				}
			} else {
				next(args);
			}				
		},
		function (session, args, next) {
			
			if (args.type && args.type == "confirm") {
				if (args.response == 1) {
					session.send("Ok. I will call you 'Bot'... Your secret's safe with me " + global.emoji.wink);
					session.userData.name = 'Bot';
					
				} else {
					session.send("Ok. I will call you 'Lifeform'.");
					session.userData.name = 'Lifeform';
				}
				global.Wait(session, function () { session.endDialog(); });
			}			
		}
	]
)

global.getWeatherIcon = function (icon) {
	switch (icon) {
		case "clear-day":
			return "clear skies"			
		case "clear-night":
			return "dark skies"
		case "rain":
			return "raining " + global.emoji.frown;
		case "snow":
			return "snowing! How exciting!"
		case "sleet":
			return "sleeting. Horrible."
		case "wind":
			return "quite windy"
		case "fog":
			return "foggy"
		case "cloudy":
			return "overcast"
		case "partly-cloudy-day":
			return "a wee bit cloudy"
		case "partly-cloudy-night":
			return "a wee bit cloudy"
		default:
			return "about what you'd expect to be honest"	
	}
}

function getWeatherMood(icon) {
	if (icon == "clear-day") {
		return "good";
	} else if (icon == "rain"||icon == "snow"||icon == "sleet"||icon == "wind"||icon == "fog"){
		return "bad";
	} else if (icon == "clear-night"||icon == "partly-cloudy-night"){
		return "night";
	} else {
		return "ok";
	}
}



global.defaultTime = 6500;
global.weatherInfo = {icon:"cloudy"
};
//PROFILE
bot.dialog('/profile', [
	function (session, args, next) {
		CW = dialogs.weather.GetCurrentWeather();
		weatherInfo.icon = CW.icon;
		session.send('Welcome to We Dundee, where the weather is currently '+ Math.round(CW.temperature) +String.fromCharCode(176)+ 'C and ' + getWeatherIcon(weatherInfo.icon));
		HoldNext(session, { mood: getWeatherMood(weatherInfo.icon) });
	},
	function (session, args, next) {
		summary = CW.summary.toLowerCase();
		msg = "";
		console.log("Mood: " + args.mood);
		switch (args.mood) {
			case "good":
				msg = "It’s always sunny in Dundee. " + global.emoji.wink;	
				break;	
			case "ok":
				msg = "Hmmm… a bit more sun would be nice.";		
				break;
			case "bad":
				msg = "Ok. That doesn't sound great, hope you have a coat.";	
				break;
			case "night":
				msg = "Isn't this past your bed time?";	
				break;
		}
		session.send(msg);
		HoldNext(session);
	},
	function (session, args, next) {
		session.send("Anyway...");
		HoldNext(session, {}, 5000);
	},
	function (session, args) {
		session.beginDialog('/askName');
	},
	function (session, results) {

		session.endDialog();
	}
]);

bot.dialog('/askName',
	[
		function (session, args) {	
			args = args || {};
			prompts.beginMultiDialog(session, { text: args.text || 'So, what is your name?', threshold: 0.9 });
		},
	function (session, args, next) {
		if (args.type && args.type == "confirm") {
			if (args.response == 1) {
				prompts.beginTextDialog(session, { text: 'Well, what is your name then?' });				
			} else {
				session.replaceDialog('/askName', { text: "Oh go on! Please?" });
				return
			}
		} else {
			next(args);
		}
	},
	function (session, args) {
		if (args.text.length < 2) {
			session.send("There's no way that's your name!");
		} else {
			session.userData.name = ToUpper(args.text);
			session.endDialogWithResult(args);
		}	
	}
])

//SMALLTALK
bot.dialog('/smallTalk', [
	function (session, args) {
		//console.log(session.message.address);

		const dialogs = [
			//	'/userWeather',
			'/genericQuestion'
		]
		session.beginDialog(dialogs[Math.floor(Math.random() * dialogs.length)])
	}
]);

//IMG RESULTS
function callback(results) {
	console.log(results);
	var msg = new builder.Message().address(address);
	msg.text('Here you go!');
	msg.textLocale('en-US');
	msg.addAttachment({
		contentType: "image/jpeg",
		contentUrl: results[0].link,
		name: "Law"
	});
	bot.send(msg);

}

bot.dialog('/displayThought',
	[
		function (session, args, next) {
			if (!session.dialogData.done) {
				session.dialogData.done = true;
				session.send("Here's something someone wanted to see in the city back in 2013...");
				session.sendTyping();
				console.log("Getting thought");
				wpClient.getPosts({ post_type: 'thoughts', number: 1, offset: Math.floor(Math.random() * 1000) }, function (error, posts) {
					if (error) console.log(error);
					console.log("Found " + posts.length + " posts!");
					if (posts.length > 0) {
						console.log(posts[0]);
						if (posts[0].content.length > 200) {
							session.send("Wow... It's a long one!");
							HoldNext(session, { thoughtText: posts[0].content }, 7000);
						} else {
							HoldNext(session, { thoughtText: posts[0].content }, 7000);
						}
					}
			
				});
			}			
		},
		function (session, args, next) {
			console.log("THOUGHT TEXT");
			console.log(args.thoughtText);
			session.send(args.thoughtText);
			HoldNext(session, {},10000);
		},
		function (session, args, next) {
			session.endDialog();
		}
	]
);

bot.dialog('/playMusic',
	[
		function (session, args, next) {
			var msg = new builder.Message().address(session.message.address);
			msg.text("Here's some music from Dundee. (You might need to click or tap the screen!)");
			msg.textLocale('en-US');
			msg.addAttachment({
				contentType: "audio/mpeg3",
				contentUrl: 'http://wedundeesite.azurewebsites.net/audio/laeto_01_dead_planets.mp3',
				name: "Laeto"
			});
			bot.send(msg);
			HoldNext(session);
		}, function (session, args, next) {
			session.send("Just type 'Stop music' if you've had enough!");
			session.endDialog();
		}
	]
);

bot.dialog('/otherSite',
	[
		function (session, args, next) {
			/*var msg = new builder.Message().address(session.message.address);
			msg.text("Taking you to an external site");
			msg.textLocale('en-US');
			msg.addAttachment({
				contentType: "web/link",
				contentUrl: 'http://www.dca.org.uk',
				name: "DCA"
			});*/
			if (args.URL) {
				session.send('Here it is! <a href="' + args.URL + '" target="_blank">' + args.URL + '</a>');
			} else {
				session.send('Sorry! I seem to have lost the link. Please file a complaint with the appropriate bureau.');				
			}
			HoldNext(session);

		}, function (session, args, next) {
			session.send("See you soon!");
			session.endDialog();
		}
	]
);


//GenericQuestion
bot.dialog('/genericQuestion', [
	function (session, args) {
		session.send(greets.getGenericQuestion());
		prompts.beginTextDialog(session);

	},
	function (session, args) {
		console.log("Response: " + args.text);
		if (args.text) {
			session.send(greets.getQuestionResponse());
		} else {
			session.send(greets.getUnsureResponse());
		}
	}
]);


//Location
bot.dialog('/location',
	[
		function (session, args) {
			if (session.userData.dundonian) {
				console.log("Skipping location");
				session.endDialog();
				session.beginDialog('/genericQuestion');
			} else {
				prompts.beginConfirmDialog(session, {questionText: "So " + session.userData.name + ", are you living in Dundee now?"});
			}
		},
		function (session, results) {
			session.userData.livingInDundee = results.response;
			if (session.userData.livingInDundee) {
				session.beginDialog('/location.permission');
			} else {
				session.send("Well then, feel free to ask me questions about the city and I'll try to answer them.");
				session.endDialog();
			}
		}
	]
);


bot.dialog('/location.permission', [
	function (session, args) {
		session.send("Can I ask you some questions?");
		prompts.beginConfirmDialog(session, { questionText: "Can I ask you some questions?", allowSkip: true });
	},
	function (session, args) {
		if (args.response == 1) {
			session.beginDialog('/answerQuestion');
		} else {
			session.send("That’s ok, what would you like to ask me instead?");
			session.endDialog();
		}
	},
	function (session, results) {
		console.log("end location/permission")
		session.endDialog();
	}
]
);


////////END DIALOGS///////
bot.dialog('/askQuestion', [
	function (session, args) {
		if (args) {
			session.send(args.qText || "What is your question?");
		} else {
			session.send( "What is your question?");			
		}	
		prompts.beginTextDialog(session);
	},
	function (session, args) {
		if (args.text.includes('?')) {
			SaveQuestion(session.userData.name, args.text);
			session.send("I'll save that one for later. Once I have more information I'll get back to you!");
			session.endDialog();
		} else {
			session.replaceDialog('/askQuestion', { qText: "Can you try that again, but make sure it's a question this time?" });
		}	
	}
]).triggerAction({ matches: /^QTEST/ });  

bot.dialog('/quickAskQuestion', 
	function (session, args) {
		SaveQuestion(session.userData.name, args.text);
		session.send("I'll add that to my list. Once I have more information I'll get back to you!");
		global.Wait(session, function () {
			session.endDialog();
		});
	}
);

bot.dialog('/answerQuestion', [
	function (session, args) {
		session.send(greets.getPositiveResponse() + "! Heads up! These are unmoderated right now so there might be a dev message!");
		setTimeout(function () {
			GetBackendQuestion(function (quest) { session.beginDialog('/answerQuestion.quest', { questionData: quest }); });

		}, 7000);
	}
]);
//TODO: Remove
const secretss = [
	"Rockstar North, makers of Grand Theft Auto, was founded in Dundee",
	"The inventor of adhesive postage stamps, James Chalmers, was born in Dundee",
	"The first radio broadcast was sent from Dundee",
	"The Law  hill is an extinct volcanic plug",
	"The Law has a disused rail tunnel running through it",
	"we have more sunshine hours than any other city in Scotland"
]
global.realSecrets = [];
function LoadSecrets() {
	secretsRef.on("value", function (snapshot) {
		console.log("Secrets loaded!");
		secretsRef.off("value");
		global.realSecrets = snapshot.val();


		var obj_keys = Object.keys(realSecrets);
		console.log(realSecrets);
		for (k = 0; k < obj_keys.length; k++) {
			if (realSecrets[obj_keys[k]].checked == null || realSecrets[obj_keys[k]].checked == false) {
				console.log("Del secret");
				console.log(realSecrets[obj_keys[k]].answer);
				delete realSecrets[obj_keys[k]];
			}
		}
		console.log(realSecrets);
		obj_keys = Object.keys(realSecrets);
				
		//console.log(snapshot.val());
	}, function (errorObject) {
		console.log("The read failed: " + errorObject.code);
		secretsRef.off("value");
	});
}
function GetSecret(obj) {
	console.log(realSecrets);
	var obj_key = Object.keys(realSecrets);
	if (realSecrets != null && obj_key.length > 0) {
		var obj_key = Object.keys(obj);
		console.log(obj_key);
		return obj[obj_key[Math.floor(Math.random() * obj_key.length)]].answer;
	} else {
		console.log("No valid secrets");
		return secretss[Math.floor(Math.random() * secretss.length)]
	}	
}
bot.dialog('/loadSecret', [
	function (session, args) {
		session.conversationData.heardSecret = true;
		session.send(GetSecret(realSecrets));
		/*if (realSecrets) {
			session.send(GetSecret(realSecrets).answer);
		} else {
			session.send(secretss[Math.floor(Math.random() * secretss.length)]);
		}	*/
		global.Wait(session, function () {
			session.sendTyping();
			console.log("endSecret");
			session.endDialog();
		});
	}
]);

bot.dialog('/answerQuestion.quest', [
	function (session, args) {
		session.send(args.questionData.question);
		prompts.beginTextDialog(session, args.questionData.botResponse);
	},
	function (session, args) {
		console.log(args.text);
		if (args.response) {
			AnswerQuestion(currentQuestionID, currentQuestion.currentAnswers, [args.text]);
			if (Math.random > 1.4) {
				session.send(greets.getQuestionResponse());
			} else {
				session.send(args.botResponse);
			}
		} else {
			session.send(greets.getUnsureResponse());
		}
		session.endDialog();
	}
]);
var currentQuestionID;
var currentQuestion;
bot.dialog('/askMemory', [
	function (session, args) {
		prompts.beginConfirmDialog(session, {questionText: "Do you have any fond memories of Dundee?"});
	},
	function (session, results) {
		if (results.response) {
			builder.Prompts.text(session, 'Why not share one?');
		}
		else {
			session.endDialog();
		}
	}
]);

function ResetForSession(session) {
	session.userData.questionCount = 0;
}
global.ResetData = function (session) {
	
	session.conversationData.hello = false;
	session.conversationData.messageStack = [];
	session.conversationData.test = "PFDSFDF";
	session.userData.questionCount = 0;
	session.userData.count = 0;
		session.userData.name = null;
		session.userData.dundonian = {};
		session.userData.livingInDundee = {};
		session.userData.usedQuestions = [];
		session.userData.knowsWhatsUp = false;
		session.userData.knowsAboutQuestions = false;
		session.userData.askedAQuestion = false;
        session.userData.questionCount = 0;
		session.userData.completed = false;
		session.userData.finishedQuestions = false;
}
function Init(session) {
	console.log("init");
	console.log(session.message.address);
	var d = new Date();

	session.userData.logTime = d.getTime();
	session.conversationData.init = true;
	session.conversationData.hello = false;
	session.conversationData.messageStack = [];
	session.conversationData.test = "PFDSFDF";
	session.userData.questionCount = 0;
	session.userData.count = 0;
	session.userData.finishedQuestions = false;
		session.userData.completed = false;
	if (!session.userData.name) {
		global.ResetData(session);
	}
	session.save();
	console.log("end init");
}

global.Wait = function (session, func, time) {
	WaitStop(session);
	timeDict[session.message.address.conversation.id] = setTimeout(func, time|| global.defaultTime);
}
global.WaitStop = function (session) {
		clearTimeout(
			global.timeDict[session.message.address.conversation.id]);
}
global.IdleWait = function (session, func, time) {
	global.globalTimeDict[session.message.address.conversation.id] = setTimeout(func, time|| global.idleTime);
}
global.IdleStop = function (session) {
	if (global.globalTimeDict[session.message.address.conversation.id]) {
		clearTimeout(
			global.globalTimeDict[session.message.address.conversation.id]);
	}	
}

bot.dialog('/wait/dialog',[
	function (session, args, next) {
		if (!session.dialogData.begun) {
			console.log("Begin wait");
			session.dialogData.waitArgs = args;
			session.dialogData.begun = true;
			global.Wait(session, function () { 
			console.log("Now do next");next(args); }, session.dialogData.waitArgs.time);
		} else {
/*
			console.log("WAIT!!");
			session.send("WAIT");*/
		}	
	},
	function (session, args, next) {
			console.log("Now here for: ");
			console.log( session.dialogData.waitArgs);
		if (session.dialogData.waitArgs.passthrough) {
			session.replaceDialog(session.dialogData.waitArgs.nextDialog, session.dialogData.waitArgs.passthrough);
		} else {
			session.replaceDialog(session.dialogData.waitArgs.nextDialog);
		}	
	}	]
);
bot.dialog('/wait/replaceDialog',[
	function (session, args, next) {
		if (!session.dialogData.begun) {
			console.log("Begin replace dialog wait");
			session.dialogData.waitArgs = args;
			session.dialogData.begun = true;
			global.Wait(session, function () { 
				next(args);
			}, session.dialogData.waitArgs.time);
		} else {/*
			console.log("WAIT!!");
			session.send("WAIT");*/
		}	
	},
	function (session, args, next) {
			console.log("Now here for: ");
			console.log( session.dialogData.waitArgs);
		if (session.dialogData.waitArgs.passthrough) {
			session.replaceDialog(session.dialogData.waitArgs.nextDialog, session.dialogData.waitArgs.passthrough);
		} else {
			session.replaceDialog(session.dialogData.waitArgs.nextDialog);
		}	
	}
]
);
bot.dialog('/wait/next', [
	function (session, args, next) {
		if (!session.dialogData.begun) {
			console.log("Begin wait");
			session.dialogData.waitArgs = args;
			session.dialogData.begun = true;
			global.Wait(session, function () {
				next(args);
			}, session.dialogData.waitArgs.time);
		} else {/*
			console.log("WAIT!!");
			session.send("WAIT");*/
		}
	},
	function (session, args, next) {
		if (session.dialogData.waitArgs.passthrough) {
			console.log("Passthrough");
			console.log(session.dialogData.waitArgs.passthrough);
			session.endDialogWithResult(session.dialogData.waitArgs.passthrough);
		} else {
			session.endDialog();
		}	
	}	]
);
bot.dialog('/wait/end', [
	function (session, args, next) {
		if (!session.dialogData.begun) {
			console.log("Begin wait");
			session.dialogData.waitArgs = args;
			session.dialogData.begun = true;
			global.Wait(session, function () {
				next(args);
			}, session.dialogData.waitArgs.time);
		} else {/*
			console.log("WAIT!!");
			session.send("WAIT");*/
		}
	},
	function (session, args, next) {
		if (session.dialogData.waitArgs.passthrough) {
			console.log("Passthrough");
			console.log(session.dialogData.waitArgs.passthrough);
			session.endDialog(session.dialogData.waitArgs.passthrough);
		} else {
			session.endDialog();
		}	
	}	]
);


global.HoldDialog = function (session, dialogName, args, time) {
	console.log("holding: " + dialogName);
	session.sendTyping();
	session.beginDialog('/wait/dialog', { nextDialog: dialogName, time: time ? time : global.defaultTime, passthrough: args || {} });
}
global.HoldReplace = function (session, dialogName, args, time) {
	console.log("Hold Replace: " + dialogName);
	session.sendTyping();
	session.replaceDialog('/wait/replaceDialog', { nextDialog: dialogName, time: time ? time : global.defaultTime, passthrough: args || {} });
}
global.HoldNext = function (session, args, time) {
	session.sendTyping();
	session.beginDialog('/wait/next', { time: time ? time : global.defaultTime, passthrough: args || {} });
}
global.HoldEnd = function (session, args, time) {
	session.sendTyping();
	global.Wait(session, function () { 
		session.endDialog();
	}, time);
}
function ToUpper(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}