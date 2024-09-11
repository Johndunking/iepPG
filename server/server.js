const express = require('express');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const { google } = require('googleapis');
const { generateAuthUrl, getTokenFromCode } = require('./google-auth'); // Import the required functions
const { exec } = require('child_process');
const session = require('express-session'); // Ensure you have express-session imported

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors({ origin: 'https://ieppg-48efe5776c91.herokuapp.com', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up sessions to store user tokens
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
}));

const PORT = process.env.PORT || 3001;
const path = require('path');

// OAuth2 callback route
app.get('/oauth2callback', (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Authorization code not provided.');
  }

  getTokenFromCode(code, (err, oAuth2Client, token) => {
    if (err) return res.status(500).send('Error retrieving access token.');

    // Store the user's token in the session
    req.session.token = token;

    // Redirect to the upload page or another location after successful authentication
    res.redirect('/'); 
  });
});

// Endpoint to check if the user is authenticated
app.get('/check-auth', (req, res) => {
  if (req.session.token) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Endpoint to start the OAuth authentication flow
app.get('/authenticate', (req, res) => {
  const authUrl = generateAuthUrl();
  res.redirect(authUrl);
});

// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  if (!req.session.token) {
    // If no token, redirect the user to Google OAuth
    const authUrl = generateAuthUrl();
    return res.redirect(authUrl);
  }

  const filePath = file.path;

  try {
    console.log('Attempting to extract text from PDF file using Python:', filePath);

    exec(`python3 extract_text.py ${filePath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${stderr}`);
        return res.status(500).send('Error extracting text from PDF.');
      }

      const text = stdout;
      console.log('Extracted text:', text);

      const extractedData = processData(text);
      console.log('Extracted data:', extractedData);

      const studentName = extractedData.name || 'Unknown Student';

      // Use the user's stored token for API calls
      const oAuth2Client = new google.auth.OAuth2();
      oAuth2Client.setCredentials(req.session.token);

      copyPptxTemplate(oAuth2Client, '133ir5Klbfi1Tu9OPSfGcnuB-2tJcGxsPOQTCwTk6N-Y', extractedData, (pptxCopyId) => {
        updatePresentation(oAuth2Client, extractedData, pptxCopyId, res);

        // Delete the uploaded file after processing
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting uploaded file:', err);
          } else {
            console.log('Uploaded file deleted:', filePath);
          }
        });
      });
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send('Error processing file.');
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// Catch-all handler to serve React app for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});
function processData(text) {
  const data = {};

  const nameMatch = text.match(/Student Name:\s*(.*)/);
  const birthdateMatch = text.match(/Birthdate:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  const iepDateMatch = text.match(/IEP Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  const addressMatch = text.match(/Address:\s*(.*)/);
  const phoneMatch = text.match(/Phone Number:\s*(.*)/);
  const eligibilityMatch = /in appropriate activities\s*([\s\S]+?)(?=FOR INITIAL PLACEMENTS ONLY|$)/.exec(text);
  const primaryEligibilityMatch = text.match(/Primary:\s*(.*)/);
  const secondaryEligibilityMatch = text.match(/Secondary:\s*(.*)/);

  const presentLevels = {
    strengths: /Strengths\/Preferences\/Interests\s+(.+?)(?=Parent input and concerns)/s.exec(text),
    parentConcerns: /Parent input and concerns relevant to educational progress\s+(.+?)(?=Smarter Balanced Assessment)/s.exec(text),
    assessmentData: /Other Assessment Data\s+(.+?)(?=Hearing Date:)/s.exec(text),
    academics: /Preacademic\/Academic\/Functional Skills.(.+?)(?=Communication Development)/s.exec(text),
    communication: /Communication Development\s+(.+?)(?=Gross\/Fine Motor Development)/s.exec(text),
    motor: /Gross\/Fine Motor Development\s+(.+?)(?=Social Emotional\/Behavioral)/s.exec(text),
    socialEmotional: /Social Emotional\/Behavioral\s+(.+?)(?=Vocational)/s.exec(text),
    vocational: /Vocational\s+(.+?)(?=Adaptive\/Daily Living Skills)/s.exec(text),
    dailyLiving: /Adaptive\/Daily Living Skills\s+(.+?)(?=Health)/s.exec(text),
    health: /Hearing Date:\s+(.+?)(?=Preacademic\/Academic\/Functional Skills)/s.exec(text),
  };

  const accommodationsMatch = /Program Accommodations\s+((?:[^\n]*[^\d\n]+\.\s*)+)/.exec(text);
  const specialFactorsMatchB = /Does student's behavior impede learning of self or others\?\s*Yes\s*(.+?)(?=\s*If yes, specify positive behavior interventions)/s.exec(text);
  const specialFactorsMatchP = /If yes, specify positive behavior interventions.*?:\s*(.+?)(?=\s*Behavior Goal is part of this IEP)/s.exec(text);
  const fapeMatch = /For student to receive educational benefit, goals will be written to address the following areas of need:\s*(.+?)(?=Review of Progress)/.exec(text);
  const bipMatch = /Behavior Intervention Plan\s+(.+?)(?=Transition Services)/.exec(text);

  // Extract first name from the full name
  const fullName = nameMatch ? nameMatch[1].trim() : 'Unknown';
  const firstName = fullName.includes(',') ? fullName.split(',')[1].trim().split(' ')[0] : fullName.split(' ')[0];

  data.firstName = firstName.replace("Birthdate:", "").trim();
  data.fullName = fullName;
  data.birthdate = birthdateMatch ? birthdateMatch[1].trim() : 'Unknown';
  data.iepDate = iepDateMatch ? iepDateMatch[1].trim() : 'Unknown';
  data.address = addressMatch ? addressMatch[1].trim() : 'Unknown';
  data.phoneNumber = phoneMatch ? phoneMatch[1].trim() : 'Unknown';
  data.eligibility = eligibilityMatch ? eligibilityMatch[1].replace(")", "").trim() : 'Unknown';
  data.primaryEligibility = primaryEligibilityMatch ? primaryEligibilityMatch[1].replace("Secondary:", "").trim() : 'None';
  data.secondaryEligibility = secondaryEligibilityMatch ? secondaryEligibilityMatch[1].trim() : 'None';
  data.specialFactorsB = specialFactorsMatchB ? specialFactorsMatchB[1].trim() : 'None';
  data.specialFactorsP = specialFactorsMatchP ? specialFactorsMatchP[1].trim() : 'None';
  data.accommodations = accommodationsMatch ? accommodationsMatch[1].trim() : 'None';
  

  data.presentLevels = {
    strengths: presentLevels.strengths ? presentLevels.strengths[1].trim() : 'Unknown',
    parentConcerns: presentLevels.parentConcerns ? presentLevels.parentConcerns[1].trim() : 'Unknown',
    assessmentData: presentLevels.assessmentData ? presentLevels.assessmentData[1].trim() : 'Unknown',
    academics: presentLevels.academics ? presentLevels.academics[1].trim() : 'Unknown',
    communication: presentLevels.communication ? presentLevels.communication[1].trim() : 'Unknown',
    motor: presentLevels.motor ? presentLevels.motor[1].trim() : 'Unknown',
    socialEmotional: presentLevels.socialEmotional ? presentLevels.socialEmotional[1].trim() : 'Unknown',
    vocational: presentLevels.vocational ? presentLevels.vocational[1].trim() : 'Unknown',
    dailyLiving: presentLevels.dailyLiving ? presentLevels.dailyLiving[1].trim() : 'Unknown',
    health: presentLevels.health ? presentLevels.health[1].trim() : 'Unknown',
  };

  return data;
}


  function copyPptxTemplate(auth, templateFileId, data, callback) {
    const drive = google.drive({ version: 'v3', auth });
  
    drive.files.copy({
      fileId: templateFileId,
      resource: {
        name: `${data.firstName}'s Annual IEP`,
        mimeType: 'application/vnd.google-apps.presentation', // Keep as Google Slides
      },
    }, (err, response) => {
      if (err) {
        console.error('Error copying PPTX template:', err);
        return;
      }
  
      console.log('Copied PPTX template, File ID:', response.data.id);
      callback(response.data.id);
    });
  }
  
  function updatePresentation(auth, data, presentationId, res) {
    const slides = google.slides({ version: 'v1', auth });

    const requests = [
        {
            replaceAllText: {
                containsText: {
                    text: "Student",
                    matchCase: false,
                },
                replaceText: `${data.firstName}`, // No sanitization before replacing
            },
        },
        {
            replaceAllText: {
                containsText: {
                    text: "demonstrates below average expressive language abilities and decreased speech intelligibility that interfere with his adequate functioning in the general education setting. He also has difficulty regulating his impulses and managing frustration, and exhibits behaviors consistent with ADHD-Impulsive Type. He requires special education supports to meet his education needs.",
                    matchCase: true,
                },
                replaceText: `${data.eligibility}`,  // No sanitization before replacing
            },
        },
      {
        replaceAllText: {
          containsText: {
            text: "Other Health Impairment (OHI)", // Match the existing primary eligibility text
            matchCase: false,
          },
          replaceText: `Primary: ${data.primaryEligibility}`, // No sanitization before replacing
        },
      },
      {
        replaceAllText: {
          containsText: {
            text: "Speech or Language Impairment (SLI)", // Match the existing secondary eligibility text
            matchCase: false,
          },
          replaceText: `Secondary: ${data.secondaryEligibility}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'p6_i2',
          text: `${data.presentLevels.strengths}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'p13_i2',
          text: `${data.presentLevels.vocational}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'g1550213cb60_0_114',
          text: `${data.presentLevels.communication}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'p11_i2',
          text: `${data.presentLevels.motor}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'p12_i8',
          text: `${data.presentLevels.socialEmotional}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'p14_i8',
          text: `${data.presentLevels.dailyLiving}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'g1c5c49d72e3_0_2391',
          text: `${data.presentLevels.assessmentData}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'g1550213cb60_0_87',
          text: `${data.presentLevels.academics}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'g1550213cb60_0_101',
          text: `${data.presentLevels.parentConcerns}`, // No sanitization before replacing
        },
      },    
      {
        insertText: {
          objectId: 'g1c5c49d72e3_0_1',
          text: `${data.specialFactorsB}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'g1c5c49d72e3_0_795',
          text: `${data.specialFactorsP}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'g6d7f6a8238_0_827',
          text: `${data.accommodations}`, // No sanitization before replacing
        },
      },
      {
        insertText: {
          objectId: 'p15_i2',
          text: `${data.presentLevels.health}`, // No sanitization before replacing
        },
      },
    ];
    
  
    slides.presentations.batchUpdate({
      presentationId: presentationId,
      resource: { requests },
    }, (err, response) => {
      if (err) {
        console.error('Error updating presentation:', err);
        return res.status(500).send('Error updating presentation.');
      }
  
      console.log('Updated presentation with new data.');
  
      const drive = google.drive({ version: 'v3', auth });
      drive.permissions.create({
        fileId: presentationId,
        resource: {
          role: 'reader',
          type: 'anyone',
        },
      }, (err, permission) => {
        if (err) {
          console.error('Error setting permissions:', err);
          return res.status(500).send('Error setting permissions.');
        }
  
        const link = `https://docs.google.com/presentation/d/${presentationId}/edit`;
        console.log('Presentation link:', link);
        res.json({ link });
      });
    });
  }
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });