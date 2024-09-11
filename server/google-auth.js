const { google } = require('googleapis');
const fs = require('fs');

// Google API scopes
const SCOPES = ['https://www.googleapis.com/auth/presentations', 'https://www.googleapis.com/auth/drive'];

// Function to create OAuth2 client
function createOAuth2Client() {
  const credentials = JSON.parse(fs.readFileSync('credentials.json'));
  const { client_id, client_secret, redirect_uris } = credentials.web;
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://ieppg-48efe5776c91.herokuapp.com/oauth2callback'
    : redirect_uris[0]; // Use localhost for development

  return new google.auth.OAuth2(client_id, client_secret, redirectUri);
}

// Function to generate a Google OAuth URL for user login
function generateAuthUrl() {
  const oAuth2Client = createOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
}

// Function to exchange authorization code for access token
function getTokenFromCode(code, callback) {
  const oAuth2Client = createOAuth2Client();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return callback(err);
    oAuth2Client.setCredentials(token);
    callback(null, oAuth2Client, token);
  });
}

module.exports = {
  generateAuthUrl,
  getTokenFromCode,
};