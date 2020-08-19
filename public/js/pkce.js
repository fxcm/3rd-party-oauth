(function () {
    // Generate a secure random string using the browser crypto functions
    function generateRandomString() {
        var array = new Uint32Array(28);
        window.crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
    }

    // Calculate the SHA256 hash of the input text. 
    // Returns a promise that resolves to an ArrayBuffer
    function sha256(plain) {
        var encoder = new TextEncoder();
        var data = encoder.encode(plain);
        return window.crypto.subtle.digest('SHA-256', data);
    }

    // Base64-urlencodes the input string
    function base64urlencode(str) {
        // Convert the ArrayBuffer to string using Uint8 array to convert to what btoa accepts.
        // btoa accepts chars only within ascii 0-255 and base64 encodes them.
        // Then convert the base64 encoded to base64url encoded
        //   (replace + with -, replace / with _, trim trailing =)
        return btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    // Return the base64-urlencoded sha256 hash for the PKCE challenge
    async function pkceChallengeFromVerifier(v) {
        hashed = await sha256(v);
        return base64urlencode(hashed);
    }

    // Parse a query string into an object
    function parseQueryString(querystring) {
        if (querystring == "") return {};

        return querystring
            .split('&')
            .map(function(s) { return s.split("=") })
            .reduce(function(obj, arr) {
                obj[arr[0]] = arr[1];
                return obj;
            }, {});
    }

    // Attach PKCE login handler
    function attachPKCELoginHandler(config) {
        // Initiate the PKCE Auth Code flow when the link is clicked
        var loginHTML = document.getElementById("login")
        if (loginHTML) {
            loginHTML.addEventListener("click", async function (e) {
                e.preventDefault();
    
                // Create and store a random "state" value
                var state = generateRandomString();
                localStorage.setItem("pkce_state", state);
    
                // Create and store a new PKCE code_verifier (the plaintext random secret)
                var code_verifier = generateRandomString();
                localStorage.setItem("pkce_code_verifier", code_verifier);
    
                // Hash and base64-urlencode the secret to use as the challenge
                var code_challenge = await pkceChallengeFromVerifier(code_verifier);
    
                // Build the authorization URL
                var url = config.oauth_url 
                    + '/oauth/authenticate'
                    + "?response_type=code"
                    + "&client_id=" + encodeURIComponent(config.client_id)
                    + "&state=" + encodeURIComponent(state)
                    + "&redirect_uri=" + encodeURIComponent(location.origin)
                    + "&code_challenge=" + encodeURIComponent(code_challenge)
                    + "&code_challenge_method=S256"
                    ;
    
                // Redirect to the authorization server
                window.location = url;
            });
        }
    }

    // Make POST to exchange code for access token
    function exchangeCodeForToken(config, queries) {
        // Verify state matches what we set at the beginning
        if (localStorage.getItem("pkce_state") != queries.state) {
            alert("Invalid state");
            return;
        } 

        var url = config.oauth_url + '/oauth/token';
        var params = {
            grant_type: "authorization_code",
            code: queries.code,
            client_id: config.client_id,
            redirect_uri: config.redirect_uri,
            code_verifier: localStorage.getItem("pkce_code_verifier")
        }
        var body = Object.keys(params)
            .map(function(key) { return key + '=' + params[key] })
            .join('&');

        fetch(url, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        })
        .then(function(resp) { return resp.json() })
        .then(function(data) {
            console.log(data);
            window.history.replaceState({}, null, "/");
            document.getElementById('login-links').style.display = 'none';
            var tokenHtml = document.createElement('p')
            tokenHtml.innerText = 'Access Token ' + data.access_token;
            document.body.appendChild(tokenHtml);
        })
        .catch(function(err) {
            console.error(err);
        })

        // Clean these up since we don't need them anymore
        localStorage.removeItem("pkce_state");
        localStorage.removeItem("pkce_code_verifier");
    }

    // Load config from server side, 
    // then handle start of pkce flow
    fetch('/config')
        .then(function(resp) { return resp.json() })
        .then(function(config) {
            // attach login event handler for PKCE flow
            attachPKCELoginHandler(config);

            // extract querystring from url
            var queries = parseQueryString(window.location.search.substring(1));

            // check for auth code from auth server
            // exchange code for token
            if (queries.code) {
                exchangeCodeForToken(config, queries)                
            }
        })
})();