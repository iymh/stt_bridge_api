// const AUTHINFO = {
//    username:"test",
//    password:"test"
// };

const express = require('express');

// File upload function
const fs = require('fs');
const multer = require('multer');
const upload = multer({dest: 'tmp/'});

// const basicAuth = require('basic-auth-connect');

const cors = require('cors');
require('dotenv').config({ debug:true });

const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

if (typeof process.env.API_KEY == 'undefined') {
   console.error('Error: "API_KEY" is not set.');
   console.error('Please consider adding a .env file with API_KEY.');
   process.exit(1);
}

const speechToText = new SpeechToTextV1({
   authenticator: new IamAuthenticator({
      apikey: process.env.API_KEY,
   }),
   serviceUrl: process.env.API_BASE_URL,
});

var server = express();
server
   .use(express.urlencoded({extended: false}))
   .use(express.json())

   // CORS
   .use(cors())

   // Basic Auth
   // .use(basicAuth(
   //    AUTHINFO.username,
   //    AUTHINFO.password 
   // ))
   .use(express.static('public'))

   .get('/models', function (req, res) {
      // Query params
      // req.query.name

      // Path params
      // let path = req.params.name;
      // if (!path) {

      // List Models
      speechToText.listModels()
         .then(speechModels => {
            console.log(JSON.stringify(speechModels, null, 2));
            res.json(speechModels.result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT models."});
         });
   })

   .get('/models/*', function (req, res) {
      // Query params
      // req.query.name

      // Path params
      let path = req.params[0];
      if (!path) {
         console.log('error: no params');
         res.status(500).send({"error": "Failed STT get model."});
      }
      // Get a model
      speechToText.getModel({
         modelId: path
      })
         .then(speechModel => {
            console.log(JSON.stringify(speechModel, null, 2));
            res.json(speechModel.result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT get model."});
         });
   })

   .post('/recognize', upload.single('tmpaudio'), async function (req, res) {
      // check upload file
      let file = req.file;
      if (file) {
         console.log("file:" + file.originalname);
      }else{
         console.log('error: no params');
         res.status(500).send({"error": "Failed STT recognize. no params."});
         return;
      }

      // set query params
      const recognizeParams = {
         audio: fs.createReadStream(file.path),
         contentType: file.mimetype,
      };

      let query = req.query;
      if (query) {
         console.log(query);
         Object.keys(query).forEach(key =>{
            switch (key) {
               case "model": // 'en-US_BroadbandModel'
                  recognizeParams.model = query[key];
                  break;
               // languageCustomizationId: string
               // [prev] acousticCustomizationId: string
               // baseModelVersion: string
               // customizationWeight: 0.0-1.0
               // inactivityTimeout: 30,60,-1
               // [prev] keywords: ['max1000word','max1024char']
               // [perv] keywordsThreshold: 0.0-1.0
               // maxAlternatives: 1,3
               // [prev] wordAlternativesThreshold: 0.0-1.0
               // wordConfidence: boolean
               case "timestamps": // boolean
                  recognizeParams.timestamps = query[key];
                  break;
               // profanityFilter: boolean
               // smartFormatting: boolean
               case "speakerLabels": // boolean
                  recognizeParams.speakerLabels = query[key];
                  break;
               // redaction: boolean
               // audioMetrics: boolean
               // speechDetectorSensitivity: 0.0-1.0
               // backgroundAudioSuppression: 0.0-1.0
               // [next] lowLatency: boolean
               // [next] characterInsertionBias
               default:
                  break;
            }
         })
      }

      speechToText.recognize(recognizeParams)
         .then(speechRecognitionResults => {
            console.log(`${speechRecognitionResults.status}: ${speechRecognitionResults.statusText}`);
            res.json(speechRecognitionResults.result);

            // Remove file
            fs.unlinkSync(file.path);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT recognize."});
            return;
         });
   })

   .post('/api', async (req, res) => {
      let body = req.body;
      console.log(body);

      switch (body.api) {
         // case "query":
         //    discovery.query(body.params)
         //       .then(response => {
         //          // console.log(JSON.stringify(response.result, null, 2));
         //          res.json(response.result);
         //       })
         //       .catch(err => {
         //          console.log('error:', err);
         //          res.status(500).send({"error": "Failed Watson Discovery query."});
         //       });
         //    break;
/*
         case "listCollections":
            discovery.listCollections(body.params)
               .then(response => {
                  console.log(JSON.stringify(response.result, null, 2));
                  res.json(response.result);
               })
               .catch(err => {
                  console.log('error:', err);
                  res.status(500).send({"error": "Failed Watson Discovery listCollections."});
               });
            break;

         case "listTrainingQueries":
            discovery.listTrainingQueries(body.params)
               .then(response => {
                  console.log(JSON.stringify(response.result, null, 2));
                  res.json(response.result);
               })
               .catch(err => {
                  console.log('error:', err);
                  res.status(500).send({"error": "Failed Watson Discovery listTrainingQueries."});
               });
            break;

         case "createTrainingQuery":
            discovery.createTrainingQuery(body.params)
               .then(response => {
                  console.log(JSON.stringify(response.result, null, 2));
                  res.json(response.result);
               })
               .catch(err => {
                  console.log('error:', err);
                  res.status(500).send({"error": "Failed Watson Discovery createTrainingQuery."});
               });
            break;

         case "getTrainingQuery":
            discovery.getTrainingQuery(body.params)
               .then(response => {
                  console.log(JSON.stringify(response.result, null, 2));
                  res.json(response.result);
               })
               .catch(err => {
                  console.log('error:', err);
                  res.status(500).send({"error": "Failed Watson Discovery getTrainingQuery."});
               });
            break;

         case "updateTrainingQuery":
            discovery.updateTrainingQuery(body.params)
               .then(response => {
                  console.log(JSON.stringify(response.result, null, 2));
                  res.json(response.result);
               })
               .catch(err => {
                  console.log('error:', err);
                  res.status(500).send({"error": "Failed Watson Discovery updateTrainingQuery."});
               });
            break;
*/
         default:
            break;
      }
   });




const port = process.env.PORT || 3000;
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log('Server running on port: %d', port);
//   console.log('process.env: ', process.env);
});

