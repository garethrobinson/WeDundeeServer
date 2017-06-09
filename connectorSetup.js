const config = require('./config.js')
module.exports = function () {
    
    var restify = require('restify');
    global.builder = require('botbuilder');

    // Get secrets from server environment
    var botConnectorOptions = {
        appId: config.appId,
        appPassword: config.appPassword
    };

    // Create bot
    var connector = new builder.ChatConnector(botConnectorOptions);
    global.bot = new builder.UniversalBot(connector);


    // Setup Restify Server
    var server = restify.createServer();

    // Handle Bot Framework messages
    server.post('/api/messages', connector.listen());

    server.listen(process.env.port || 3978, function () {
        console.log('%s listening to %s', server.name, server.url);
    });
}