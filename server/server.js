const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const cors = require('cors');
const { google } = require('googleapis');
const { authorize } = require('./google-auth');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('<h1>Server is running</h1>');
});

app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const dataBuffer = fs.readFileSync(file.path);
  try {
    console.log('Attempting to parse PDF file:', file.path);
    const data = await pdfParse(dataBuffer);
    const text = data.text;
    console.log('Extracted text:', text);

    const extractedData = processData(text);
    console.log('Extracted data:', extractedData);

    const studentName = extractedData.name || 'Unknown Student';

    authorize(auth => {
      copyPptxTemplate(auth, '1DmatmN-eM3dgtrOsb6bDCU6xefTBSXf3', studentName, (pptxCopyId) => {
        convertPptxToGoogleSlides(auth, pptxCopyId, studentName, (presentationId) => {
          updatePresentation(auth, extractedData, presentationId, res);
        });
      });
    });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).send('Error parsing PDF.');
  }
});

function processData(text) {
  const data = {};
  
  const nameMatch = /Name:\s*(.+?)(?=Student ID|IEP Date)/.exec(text);
  const ageMatch = /Age:\s*(.*)/.exec(text);
  const schoolMatch = /School:\s*(.*)/.exec(text);
  const gradeMatch = /Grade:\s*(.*)/.exec(text);
  const eligibilityMatch = /Primary\s*(.+?)(?=Secondary)/.exec(text);
  
  const presentLevels = {
    strengths: /Strengths\/Preferences\/Interests\s+(.+?)(?=Parent input and concerns)/s.exec(text),
    parentConcerns: /Parent input and concerns relevant to educational progress\s+(.+?)(?=Smarter Balanced Assessment)/s.exec(text),
    assessmentData: /Other Assessment Data\s+(.+?)(?=Preacademic\/Academic\/Functional Skills)/s.exec(text),
    academics: /Preacademic\/Academic\/Functional Skills.*?Reading\s+Strengths\s+(.+?)(?=Challenges)/s.exec(text),
    communication: /Communication Development\s+(.+?)(?=Gross\/Fine Motor Development)/s.exec(text),
    motor: /Gross\/Fine Motor Development\s+(.+?)(?=Social Emotional\/Behavioral)/s.exec(text),
    socialEmotional: /Social Emotional\/Behavioral\s+(.+?)(?=Vocational)/s.exec(text),
    vocational: /Vocational\s+(.+?)(?=Adaptive\/Daily Living Skills)/s.exec(text),
    dailyLiving: /Adaptive\/Daily Living Skills\s+(.+?)(?=Health)/s.exec(text),
    health: /Health\s+(.+?)(?=For student to receive educational benefit)/s.exec(text),
  };
  
  const accommodationsMatch = /SUPPLEMENTARY AIDS & SERVICES AND OTHER SUPPORTS FOR SCHOOL PERSONNEL, OR FOR STUDENT, OR ON BEHALF OF THE STUDENT\s+([^]+?)(?=Program Modifications)/.exec(text);
  const specialFactorsMatch = /Special Factors\s+(.+?)(?=Educational Benefit)/.exec(text);
  const goalsMatch = /IEP GOALS AND OBJECTIVES\s+([^]+?)(?=STATEWIDE ASSESSMENTS)/.exec(text);
  const fapeMatch = /For student to receive educational benefit, goals will be written to address the following areas of need:\s*(.+?)(?=Review of Progress)/.exec(text);
  const bipMatch = /Behavior Intervention Plan\s+(.+?)(?=Transition Services)/.exec(text);

  data.name = nameMatch ? nameMatch[1].trim() : 'Unknown';
  data.age = ageMatch ? ageMatch[1].trim() : 'Unknown';
  data.school = schoolMatch ? schoolMatch[1].trim() : 'Unknown';
  data.grade = gradeMatch ? gradeMatch[1].trim() : 'Unknown';
  data.eligibility = eligibilityMatch ? eligibilityMatch[1].trim() : 'Unknown';

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

  data.accommodations = accommodationsMatch ? accommodationsMatch[1].trim() : 'Unknown';
  data.specialFactors = specialFactorsMatch ? specialFactorsMatch[1].trim() : 'Unknown';
  data.goals = goalsMatch ? goalsMatch[1].trim() : 'Unknown';
  data.fape = fapeMatch ? fapeMatch[1].trim() : 'Unknown';
  data.bip = bipMatch ? bipMatch[1].trim() : 'Unknown';

  return data;
}

function copyPptxTemplate(auth, templateFileId, studentName, callback) {
  const drive = google.drive({ version: 'v3', auth });

  drive.files.copy({
    fileId: templateFileId,
    resource: {
      name: `${studentName} Annual IEP Template`,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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

function convertPptxToGoogleSlides(auth, fileId, studentName, callback) {
  const drive = google.drive({ version: 'v3', auth });

  drive.files.copy({
    fileId: fileId,
    resource: {
      name: `${studentName} Annual IEP`,
      mimeType: 'application/vnd.google-apps.presentation',
    },
  }, (err, response) => {
    if (err) {
      console.error('Error converting to Google Slides:', err);
      return;
    }

    console.log('Converted to Google Slides, Presentation ID:', response.data.id);
    callback(response.data.id);
  });
}

function updatePresentation(auth, data, presentationId, res) {
  const slides = google.slides({ version: 'v1', auth });

  // Fetch slides and get their IDs
  slides.presentations.get({ presentationId }, (err, presentation) => {
    if (err) {
      console.error('Error fetching presentation:', err);
      return res.status(500).send('Error fetching presentation.');
    }

    const slidesData = presentation.data.slides;
    const slideIds = slidesData.map(slide => slide.objectId);

    const requests = [];

    function addTextToSlide(slideIndex, text, fontSize = 10) {
      const objectId = `textbox_${slideIndex}`;
      const slideObjectId = slideIds[slideIndex];

      if (!slideObjectId) {
        console.error(`Slide ID not found for slide index ${slideIndex}`);
        return;
      }

      requests.push({
        createShape: {
          objectId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideObjectId,
            size: {
              height: {
                magnitude: 3500000,
                unit: 'EMU'
              },
              width: {
                magnitude: 4500000,
                unit: 'EMU'
              }
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 1000000,
              translateY: 1000000,
              unit: 'EMU'
            }
          }
        }
      });

      requests.push({
        insertText: {
          objectId,
          text
        }
      });
    }

    // Add data to the corresponding slides
    addTextToSlide(0, `Name: ${data.name}`);
    addTextToSlide(2, `Parent/Guardian: ${data.parentName}\nAddress: ${data.address}\nPhone Number: ${data.phoneNumber}`);
    addTextToSlide(5, `Eligibility: ${data.eligibility}`);
    addTextToSlide(7, `Strengths and Interests: ${data.presentLevels.strengths}`);
    addTextToSlide(8, `Parent Concerns: ${data.presentLevels.parentConcerns}`);
    addTextToSlide(9, `Other Assessment Data: ${data.presentLevels.assessmentData}`);
    addTextToSlide(10, `Academics: ${data.presentLevels.academics}`);
    addTextToSlide(11, `Communication: ${data.presentLevels.communication}`);
    addTextToSlide(12, `Gross and Fine Motor: ${data.presentLevels.motor}`);
    addTextToSlide(13, `Social Emotional and Behavioral: ${data.presentLevels.socialEmotional}`);
    addTextToSlide(14, `Vocational: ${data.presentLevels.vocational}`);
    addTextToSlide(15, `Daily Living Skills: ${data.presentLevels.dailyLiving}`);
    addTextToSlide(16, `Health: ${data.presentLevels.health}`);
    addTextToSlide(17, `Statewide Assessments: ${data.statewideAssessments}`);
    addTextToSlide(18, `Special Factors: ${data.specialFactors}`);
    addTextToSlide(19, `Behaviors that Impede Learning: ${data.behaviorsImpedeLearning}`);
    addTextToSlide(20, `Positive Behavior Interventions: ${data.positiveBehaviorInterventions}`);
    addTextToSlide(21, `Educational Benefit: ${data.educationalBenefit}`);
    addTextToSlide(23, `IEP Goals and Objectives: ${data.goals}`);
    addTextToSlide(25, `Offer of FAPE: ${data.fape}`);
    addTextToSlide(27, `Services: ${data.services}`);

    console.log('Prepared requests:', requests);

    slides.presentations.batchUpdate({
      presentationId,
      resource: {
        requests,
      },
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
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
