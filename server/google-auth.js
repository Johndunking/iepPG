const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/presentations', 'https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';

function authorize(callback) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.error('Error loading client secret file:', err);

    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.web || credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getNewToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client);
    });
  });
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);

  // Automatically handle the auth code input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error('Error storing token', err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function checkToken(callback) {
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      return callback(`https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=${encodeURIComponent(SCOPES.join(' '))}&response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3001/oauth2callback`);
    }
    callback(null);
  });
}

module.exports = {
  authorize,
  getNewToken,
  checkToken,
};
