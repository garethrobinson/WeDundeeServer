
var greets = require('../intents/greetings.js');

const thanks = [
    "You're welcome!",
    "No problem!",
    "Any time.",
    "Just doing my job!",
    "You're too kind"
];

getRandomThanks = function () {    
    return thanks[Math.floor(Math.random() * thanks.length)];
}

module.exports = function () {

    bot.dialog('help', function (session) {
        session.send("I'm a simple echo bot.");
        session.endDialog();
    }).triggerAction({ matches: /^help/i });

    bot.dialog('/website', function (session, args) {
        session.send("WEBSITE: " + args.url);
        session.endDialog();
    });

    // ROOT
    bot.dialog('ROOT', function (session) {
        session.beginDialog('/');
    }).triggerAction({ matches: /^ROOT/ });

    //Gratitude
    bot.dialog('/gratitude', [function (session, args, next) {
        console.log("DOH DOH DOH DOH");
        session.send("You're welcome!");
        //session.endDialog();
    }

    ]
    ).triggerAction({
        matches: 'gratitude',
        onInterrupted: function (session) {
        console.log("poops");
            session.send('Please provide a destination');
        },
        onSelectAction: (session, args, next) => {
        // Add the help dialog to the dialog stack 
        // (override the default behavior of replacing the stack)
            console.log(args);    
        session.beginDialog('/gratitude');
    } });
        // toast
    bot.dialog('tast', function (session) {
        session.beginDialog("/culturalPlace/root");
    }).triggerAction({ matches: /^toast/ });

    //Greeting
    bot.dialog('/greeting', [function (session, args, next)
    {
        console.log(session.userData);
        if (!session.userData.name) {
            session.beginDialog('/', { greeting: true });
        } else {           
            if(session.conversationData.hello){
                session.send(greets.getGreetings());
            }
            session.endDialog();
            if (session.dialogStack().length == 0) {
                setTimeout(function() {
                    session.beginDialog("/");
                }, 3000);
            }
        }
    }
    ]
    ).triggerAction({ matches: 'greeting' });
    
    //ShowMe
    bot.dialog('/showThought',
        [
            function (session, args) {

                global.address = session.message.address;

                console.log(args.intent);
                if (args.intent.entities != null) {
                    console.log(builder.EntityRecognizer.findEntity(args.intent.entities, 'botThing'));
                    console.log(args.intent.entities[0].resolution);
                    if (builder.EntityRecognizer.findEntity(args.intent.entities, 'botThing').resolution.values[0] == "thought") {
                        session.beginDialog('/displayThought');
                    } else if (builder.EntityRecognizer.findEntity(args.intent.entities, 'botThing').resolution.values[0] == "picture") {
                        console.log("Getting picture");
                        session.beginDialog('/showPicture');
                    } else if (builder.EntityRecognizer.findEntity(args.intent.entities, 'botThing').resolution.values[0] == "music") {
                        console.log("Getting music");
                        session.beginDialog('/playMusic');
                    }
                }
            }
        ]
    ).triggerAction({ matches: 'showMe' });

    bot.dialog('/stopMusic',
	[
		function (session, args) {
			var msg = new builder.Message().address(session.message.address);
			msg.text('Back to silence then...');
			msg.textLocale('en-US');
			msg.addAttachment({
				contentType: "audio/stop",
				contentUrl: 'http://wedundeesite.azurewebsites.net/audio/laeto_01_dead_planets.mp3',
				name: "Laeto"
			});
			bot.send(msg);
			session.endDialog();
			//audio/mpeg3
		}
]
    ).triggerAction({ matches: /^Stop Music/i });
/*
bot.dialog('/toast',
	[
		function (session, args) {
			
            session.send('A');
            console.log("A");
            session.beginDialog('/toast2');
        },
        function (session, args) {
			
            session.send('B');
            console.log("B");
		}
]
    ).triggerAction({ matches: /^toast/i });
    bot.dialog('/toast2',
        [
            function (session, args) {
            session.send('C');
            console.log("C");
            session.endDialog();    
            }
        ]
    );*/
    bot.dialog('/interrupt',
	[
        function (session, args) {
            console.log(session.dialogStack());
            session.send("HEY! Don't interrupt me!");
            session.endDialogWithResult({ interrupt: true });
		}
    ]
    ).triggerAction({
        matches: /^INTERRUPT/,
        onSelectAction: (session, args, next) => {
        // Add the help dialog to the dialog stack 
        // (override the default behavior of replacing the stack)
            console.log(args);    
        session.beginDialog(args.action.split("*:")[1].split(')')[0], args);
    } }
    );

    bot.dialog('/thanks',
    [
        function (session, args) {
            session.send(getRandomThanks());
        }
    ]
    ).triggerAction({ matches: 'gratitude' });    

    bot.dialog('/population',
        [
            function (session, args, next) {
                session.send('There are 148,270 people in Dundee city currently, I have only met a few of of them - but there is plenty time.');
                setTimeout(next, 10000);
            }, 
            function (session, args, next) {            
                session.send('Would you like to know the population density?');
                prompts.beginConfirmDialog(session, {skip:true});
            },
            function (session, args, next) {
                if (args.response == 1) {
                    session.send('2,478/km2 or as I prefer 6,420/mi2, this might not be much if you compare it to Tokyo but it’s the second highest in Scotland.');
                } else if(args.response == 0 || args.response == 2){
                    session.send("Ok then, I thought it was interesting!");                
                }  
                session.endDialog();
            }
    ]
    ).triggerAction({ matches: 'question.population' });    
     
    bot.dialog('sec', function (session) {
        
        session.beginDialog('/secret/root');
    }).triggerAction({ matches: /^FAME/ });  

    // RESET
    bot.dialog('RESET', function (session) {
        
        global.ResetData(session);
        session.send("RESETTING.");
        session.beginDialog('/');
    }).triggerAction({ matches: /^RESET/ });  
}