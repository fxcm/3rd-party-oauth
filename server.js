var fs = require('fs');
var path = require('path');
var axios = require('axios');
var randomstring = require('randomstring');
var querystring = require('querystring');
var session = require('express-session');
var express = require('express');
var app = express();


// Load configuration
var CONFIG = JSON.parse(fs.readFileSync('./config.json', { encoding: 'utf8' }));


function encodeClientCredentials(clientId, clientSecret) {
	return new Buffer(querystring.escape(clientId) + ':' + querystring.escape(clientSecret)).toString('base64');
};


// Set express middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'))
app.use(session({
    secret: 'secret session',
    resave: false,
    saveUninitialized: true
}));

app.get('/config', function(req, res) {
    res.json({
        client_id: CONFIG.client_id,
        oauth_url: CONFIG.oauth_url
    });
});

app.get('/authorize', function(req, res) {
    var state = randomstring.generate();
    var url = new URL(CONFIG.oauth_url);
    var clientId = CONFIG.client_id;
    var redirectURL = CONFIG.redirect_url;

    url.pathname = '/oauth/authenticate';
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectURL);
    url.searchParams.set('state', state);
    

    // temp cache state
    req.session.state = state;

    res.redirect(url.toString());
});


app.get('/callback', function(req, res) {
    // Handle error responses
    if (req.query.error) {
        console.log(req.query.error);
        res.json({ error: req.query.error })
        return;
    }

    // State values from query and session
    var responseState = req.query.state;
    var sessionState = req.session.state;

    // Delete temporary state
    delete req.session.state;

    // Validate state
    if (responseState !== sessionState) {
        console.log(`State DOES NOT MATCH: expected ${sessionState} got ${responseState}`);
		res.json({error: 'State value did not match'});
		return;
    }

    // Exchange auth code for access token through back channel POST, authorization_grant flow
    var tokenURL = CONFIG.oauth_url + '/oauth/token';
    var clientId = CONFIG.client_id;
    var clientSecret = CONFIG.client_secret;
    var headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + encodeClientCredentials(clientId, clientSecret)
    }; 
    var postBody = {
        code: req.query.code,
        grant_type: 'authorization_code'
    };

    axios.request({
        method: 'POST',
        url: tokenURL,
        headers: headers,
        data: querystring.stringify(postBody)
    })
    .then(function(result) {
        console.log(result.data);
        var accessToken = result.data.access_token;
        req.session.access_token = accessToken;
        res.redirect('/');  
    })
    .catch(function(err) {
        res.json({ error: err })
    });
});


app.get('/logout', function(req, res) {
    req.session.destroy(function() {
        res.redirect('/')
    });
});

app.get('/', function(req, res) {
    res.render('index', { access_token: req.session.access_token  });
});

// Start server
app.listen(CONFIG.port, function() {
    console.log(`Server started on port:${CONFIG.port}`)
});