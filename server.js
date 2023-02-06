const fs = require('fs');
const path = require('path');
const axios = require('axios');
const querystring = require('querystring');
const session = require('express-session');
const express = require('express');
const app = express();


// Load configuration
const CONFIG = JSON.parse(fs.readFileSync('./config.json', {encoding: 'utf8'}));

// Set express middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'))
app.use(session({
    secret: 'secret session',
    resave: false,
    saveUninitialized: true
}));

axios.interceptors.request.use(request => {
    console.log(JSON.stringify(request, null, 2))
    return request
})

app.get('/config', function (req, res) {
    res.json({
        client_id: CONFIG.client_id,
        oauth_url: CONFIG.oauth_url
    });
});


app.get('/authorize', function (req, res) {
    const url = new URL(CONFIG.oauth_url);
    const clientId = CONFIG.client_id;
    const redirectURL = CONFIG.redirect_url;

    url.pathname = '/oauth2/authorize';
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid trading');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectURL);

    res.redirect(url.toString());
});


app.get('/authorized', function (req, res) {
    // Handle error responses
    if (req.query.error) {
        console.log(req.query.error);
        res.json({error: req.query.error})
        return;
    }

    // Exchange auth code for access token through back channel POST, authorization_grant flow
    const tokenURL = CONFIG.oauth_url + '/oauth2/token';
    let postBody = {
        grant_type: 'authorization_code',
        redirect_uri: CONFIG.redirect_url,
        code: req.query.code,
        client_id: CONFIG.client_id,
        client_secret: CONFIG.client_secret
    };

    axios.request({
        withCredentials: true,
        method: 'POST',
        url: tokenURL,
        data: querystring.stringify(postBody)
    }).then(function (result) {
        console.log(result);
        req.session.access_token = result.data.access_token;
        req.session.refresh_token = result.data.refresh_token;
        res.redirect('/');
    }).catch(function (err) {
        req.session.access_token = null;
        req.session.refresh_token = null;
        res.json({error: err})
    });
});


app.get('/logout', function (req, res) {
    const url = new URL(CONFIG.oauth_url);
    url.pathname = '/oauth2/logout';
    url.searchParams.set('client_id', CONFIG.client_id);
    url.searchParams.set('redirect_uri', CONFIG.redirect_logout_url);
    res.redirect(url.toString());
});

app.get('/refresh', function (req, res) {
    const tokenURL = CONFIG.oauth_url + '/oauth2/token';
    let postBody = {
        grant_type: 'refresh_token',
        redirect_uri: CONFIG.redirect_url,
        refresh_token: req.session.refresh_token,
        client_id: CONFIG.client_id,
        client_secret: CONFIG.client_secret
    };

    axios.request({
        withCredentials: true,
        method: 'POST',
        url: tokenURL,
        data: querystring.stringify(postBody)
    }).then(function (result) {
        console.log(result);
        req.session.access_token = result.data.access_token;
        req.session.refresh_token = result.data.refresh_token;
        res.redirect('/');
    }).catch(function (err) {
        res.json({error: err})
    });
})

app.get('/', function (req, res) {
    res.render('index', {access_token: req.session.access_token, refresh_token: req.session.refresh_token});
});

// Start server
app.listen(CONFIG.port, function () {
    console.log(`Server started on port:${CONFIG.port}`)
});
