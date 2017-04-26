var express = require('express');
var request = require('request-promise-native');
var mustacheExpress = require('mustache-express');

var app = express();

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');

/**
 * Application config
 *
 * To get below data you need to configure OAtuth application in GitHub
 *
 */

const CLIENT_ID = 'XXX';
const CLIENT_SECRET = 'XX';
const REDIRECT_URL = 'XXX';

const OWNER = 'XXX'
const REPO = 'XXX'
const SEARCH_PATH = 'XXX'

/**
 * GitHub API wrappers
 *
 * Returning promises
 *
 */

function getAccessToken(code, state) {
  var form = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_url: REDIRECT_URL,
    code: code,
    state: state
  };
  return request.post({
      url:'https://github.com/login/oauth/access_token',
      form: form,
      headers: {
        Accept: 'application/json'
      }
  })
}

function getUserRepos(accessToken) {
  return request.get({
    url: `https://api.github.com/user/repos`,
    qs: {
      access_token: accessToken.access_token
    },
    headers: {
      'User-Agent': 'request-promise-native'
    },
    json: true
  });
}

function getContents(accessToken, file) {
  var url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${SEARCH_PATH}`;
  if (file != null) {
    url += `/${file}`
  }
  return request.get({
    url: url,
    qs: {
      access_token: accessToken.access_token
    },
    headers: {
      'User-Agent': 'request-promise-native'
    },
    json: true
  });
}

/**
 * Application methods
 *
 * Returning promises
 *
 */

function getAllFiles(accessToken) {
    return getContents(accessToken)
}

function getFirstFile(accessToken, allFiles) {
  return allFiles.then(function (files) {
    return getContents(accessToken, files[0].name);
  });
}

app.get('/', function (req, res) {
  var config = {
    scope: 'user,repo',
    state: Math.random(),
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_url: REDIRECT_URL
  };
  res.render('index.mustache', config);
});

app.get('/app', function (req, res) {
  getAccessToken(req.query.code, req.query.state)
  .then(function (accessTokenResp) {
      var accessToken = JSON.parse(accessTokenResp);
      getUserRepos(accessToken)
      .then(function (repos) {
          var repo = repos.find(r => r.name === REPO);
          var ok = repo != null;
          if (ok) {
            var allFiles = getAllFiles(accessToken);
            var firstFile = getFirstFile(accessToken, allFiles);
            var data = Promise.all([allFiles, firstFile]);
            data.then(function (data) {
              var file = data[1];
              var content = Buffer.from(file.content, 'base64');
              res.render('index.mustache', {
                files: data[0],
                file: content.toString()
              });
            });
          } else {
            res.render('forbidden.mustache');
          }
      });
  });

});

var server = app.listen(3000, function () {
   var host = server.address().address
   var port = server.address().port

   console.log("GitHub API sample app listening at http://%s:%s", host, port)
});
