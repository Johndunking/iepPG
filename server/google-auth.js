const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// Google API scopes
const SCOPES = ['https://www.googleapis.com/auth/presentations', 'https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';

// Function to authorize the user with OAuth2
function authorize(callback) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) {
      return console.error('Error loading client secret file:', err);
    }

    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.web || credentials.installed;

    // Choose the appropriate redirect URI based on environment
    const redirectUri = process.env.NODE_ENV === 'production' 
      ? 'https://ieppg-48efe5776c91.herokuapp.com/oauth2callback' 
      : redirect_uris[0]; // Use localhost for development

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

    // Check if a token already exists
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getNewToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client);
    });
  });
}

// Function to retrieve a new token
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

      // Store the token
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error('Error storing token', err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

// Function to check if the token exists
function checkToken(callback) {
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      // Get client credentials from the file
      fs.readFile('credentials.json', (err, content) => {
        if (err) return console.error('Error loading client secret file:', err);

        const credentials = JSON.parse(content);
        const { client_id } = credentials.web || credentials.installed;
        
        // Generate a new OAuth authorization URL
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=${encodeURIComponent(SCOPES.join(' '))}&response_type=code&client_id=${client_id}&redirect_uri=https://ieppg-48efe5776c91.herokuapp.com/oauth2callback`;
        return callback(authUrl);
      });
    } else {
      callback(null);
    }
  });
}

// Exporting the functions
module.exports = {
  authorize,
  getNewToken,
  checkToken,
};