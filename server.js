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

// Models
   // List models
   .get('/models', function (req, res) {
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

   // Get a model
   .get('/models/:id', function (req, res) {
      // Path params
      let path = req.params.id;
      if (!path) {
         console.log('error: no params');
         res.status(500).send({"error": "Failed STT get model."});
      }
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

// Synchronous
   // Recognize audio
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
               case "language_customization_id": // 'test1'
                  recognizeParams.languageCustomizationId = query[key];
                  break;
               // [prev] acousticCustomizationId: string
               // baseModelVersion: string
               case "customization_weight": // '0.0-1.0'
                  recognizeParams.customizationWeight = query[key];
                  break;

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

// Custom language models
   // Create custom language model 
   .post('/customizations', function (req, res) {
      let body = req.body;
      // Check Params
      if (!(body.name && body.base_model_name)) {
         res.status(500).send({"error": "Invalid params!"});
         return;
      }

      // set query params
      const createLanguageModelParams = {
         name: body.name,
         baseModelName: body.base_model_name
      };
      if (body.description) {
         createLanguageModelParams.description = body.description;
      }
      // dialect: string

      speechToText.createLanguageModel(createLanguageModelParams)
         .then(languageModel => {
            console.log(`${languageModel}`);
            res.json(languageModel);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT create language model."});
            return;
         });
   })

   // List custom language models
   .get('/customizations', function (req, res) {
      speechToText.listLanguageModels()
         .then(languageModels => {
            console.log(JSON.stringify(languageModels, null, 2));
            res.json(languageModels.result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT customizations."});
         });
   })

   // Get a custom language model
   .get('/customizations/:id', function (req, res) {
      // Path params
      let path = req.params.id;
      if (!path) {
         console.log('error: no params');
         res.status(500).send({"error": "Failed STT get customizations model."});
      }
      speechToText.getLanguageModel({
         customizationId: path
      })
         .then(languageModel => {
            console.log(JSON.stringify(languageModel, null, 2));
            res.json(languageModel.result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT get customizations model."});
         });
   })

   // Delete a custom language model
   .delete('/customizations/:id', function (req, res) {
      // Path params
      let id = req.params.id;
      if (!id) {
         console.log('error: no params');
         res.status(500).send({"error": "Failed STT delete customizations model."});
      }
      speechToText.deleteLanguageModel({
         customizationId: id
      })
         .then(result => {
            console.log(JSON.stringify(result, null, 2));
            res.json(result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT delete customizations model."});
         });
   })

   // Train a custom language model
   .post('/customizations/:id/train', function (req, res) {
      // Path params
      let id = req.params.id;
      if (!id) {
         console.log('error: no params');
         res.status(500).send({"error": "Failed STT train customizations model."});
      }
      speechToText.trainLanguageModel({
         customizationId: id
      })
         .then(result => {
            console.log(JSON.stringify(result, null, 2));
            res.json(result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT train customizations model."});
         });
   })

   // Reset a custom language model
   .post('/customizations/:id/reset', function (req, res) {
      // Path params
      let id = req.params.id;
      if (!id) {
         console.log('error: no params');
         res.status(500).send({"error": "Failed STT reset customizations model."});
      }
      speechToText.resetLanguageModel({
         customizationId: id
      })
         .then(result => {
            console.log(JSON.stringify(result, null, 2));
            res.json(result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT reset customizations model."});
         });
   })

// Corpora
   // List corpora
   .get('/customizations/:id/corpora', function (req, res) {
      // Path params
      let path = req.params.id;
      if (!path) {
         console.log('error: no params');
         res.status(500).send({"error": "Failed STT get corpora list."});
      }
      speechToText.listCorpora({
         customizationId: path,
         })
         .then(corpora => {
            console.log(JSON.stringify(corpora, null, 2));
            res.json(corpora.result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT models."});
         });
   })

   // Add a corpus
   .post('/customizations/:id/corpora/:corpus', upload.single('tmptext'), function (req, res) {
      // Path params
      let id = req.params.id;
      if (!id) {
         console.log('error: no params id');
         res.status(500).send({"error": "Failed STT add corpus."});
      }
      let corpus = req.params.corpus;
      if (!corpus) {
         console.log('error: no params corpus');
         res.status(500).send({"error": "Failed STT add corpus."});
      }
      // check upload file
      let file = req.file;
      if (file) {
         console.log("file:" + file.originalname);
      }else{
         console.log('error: no params');
         res.status(500).send({"error": "Failed STT add corpos. no params."});
         return;
      }

      // set query params
      const addCorpusParams = {
         customizationId: id,
         corpusFile: fs.createReadStream(file.path),
         corpusName: corpus,
      };

      speechToText.addCorpus(addCorpusParams)
         .then(result => {
            console.log(result);
            res.json(result);

            // Remove file
            fs.unlinkSync(file.path);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT add corpus."});
            return;
         });
   })

   // Get a corpus
   .get('/customizations/:id/corpora/:corpus', function (req, res) {
      // Path params
      let id = req.params.id;
      if (!id) {
         console.log('error: no params id');
         res.status(500).send({"error": "Failed STT get corpus."});
      }
      let corpus = req.params.corpus;
      if (!corpus) {
         console.log('error: no params corpus');
         res.status(500).send({"error": "Failed STT get corpus."});
      }
      speechToText.getCorpus({
         customizationId: id,
         corpusName: corpus,
      })
         .then(corpus => {
            console.log(JSON.stringify(corpus, null, 2));
            res.json(corpus.result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT get corpus."});
         });
   })

   // Delete a corpus
   .delete('/customizations/:id/corpora/:corpus', function (req, res) {
      // Path params
      let id = req.params.id;
      if (!id) {
         console.log('error: no params id');
         res.status(500).send({"error": "Failed STT delete corpus."});
      }
      let corpus = req.params.corpus;
      if (!corpus) {
         console.log('error: no params corpus');
         res.status(500).send({"error": "Failed STT delete corpus."});
      }
      speechToText.deleteCorpus({
         customizationId: id,
         corpusName: corpus,
      })
         .then(result => {
            console.log(JSON.stringify(result, null, 2));
            res.json(result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT delete corpus."});
         });
   })

// Custom words
   // List words
   .get('/customizations/:id/words', function (req, res) {
      // Path params
      let path = req.params.id;
      if (!path) {
         console.log('error: no params');
         res.status(500).send({"error": "Failed STT get words list."});
      }
      speechToText.listWords({
         customizationId: path,
         })
         .then(words => {
            console.log(JSON.stringify(words, null, 2));
            res.json(words.result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT models."});
         });
   })

   // Add custom words
   .post('/customizations/:id/words', function (req, res) {
      let FuncName = "Add Words"
      // Path params
      let id = req.params.id;
      if (!id) {
         console.log(`[${FuncName}] error: no params id`);
         res.status(500).send({"error": "Failed STT add words."});
      }

      let body = req.body;
      if (!(body && body.words)) {
         console.log(`[${FuncName}] error: no params words`);
         res.status(500).send({"error": "Failed STT add words."});
      }

      // set query params
      const addWordsParams = {
         customizationId: id,
         contentType: 'application/json',
         words: body.words,
      };

      speechToText.addWords(addWordsParams)
         .then(result => {
            console.log(`[${FuncName}] ${result}`);
            res.json(result);
         })
         .catch(err => {
            console.log(`[${FuncName}] ${err}`);
            res.status(500).send({ "error": `${err}` });
            return;
         });
   })

   // Add a word
   .put('/customizations/:id/words/:word', function (req, res) {
      // Path params
      let id = req.params.id;
      if (!id) {
         console.log('error: no params id');
         res.status(500).send({"error": "Failed STT add word."});
      }
      let word = req.params.word;
      if (!word) {
         console.log('error: no params word');
         res.status(500).send({"error": "Failed STT add word."});
      }

      // set query params
      const addWordParams = {
         customizationId: id,
         wordName: word,
      };
      if (body.word) {
         addWordParams.word = body.word;
      }
      if (body.word) {
         addWordParams.soundsLike = body.sounds_like;
      }
      if (body.word) {
         addWordParams.displayAs = body.display_as;
      }

      speechToText.addWord(addWordParams)
         .then(result => {
            console.log(result);
            res.json(result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT add word."});
            return;
         });
   })

   // Get a word
   .get('/customizations/:id/words/:word', function (req, res) {
      // Path params
      let id = req.params.id;
      if (!id) {
         console.log('error: no params id');
         res.status(500).send({"error": "Failed STT get word."});
      }
      let word = req.params.word;
      if (!word) {
         console.log('error: no params word');
         res.status(500).send({"error": "Failed STT get word."});
      }
      speechToText.getWord({
         customizationId: id,
         wordName: word,
      })
         .then(word => {
            console.log(JSON.stringify(word, null, 2));
            res.json(word.result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT get word."});
         });
   })

   // Delete a corpus
   .delete('/customizations/:id/words/:word', function (req, res) {
      // Path params
      let id = req.params.id;
      if (!id) {
         console.log('error: no params id');
         res.status(500).send({"error": "Failed STT delete word."});
      }
      let word = req.params.word;
      if (!word) {
         console.log('error: no params word');
         res.status(500).send({"error": "Failed STT delete word."});
      }
      speechToText.deleteWord({
         customizationId: id,
         wordName: word,
      })
         .then(result => {
            console.log(JSON.stringify(result, null, 2));
            res.json(result);
         })
         .catch(err => {
            console.log('error:', err);
            res.status(500).send({"error": "Failed STT delete word."});
         });
   })

const port = process.env.PORT || 3000;
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log('Watson Speech Bridge Server running on port: %d', port);
//   console.log('process.env: ', process.env);
});

