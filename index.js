const express = require('express');
const bodyParser = require('body-parser');

const mongodb = require('mongodb');
const MONGO_URL = 'mongodb://kaushik:kaushik123@ds235609.mlab.com:35609/thought-jar-test';

const app = express();

var db;

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

mongodb.MongoClient.connect(MONGO_URL, function(err, client) {

  if(err) {
    throw err;
  }

  db = client.db('thought-jar-test');

});

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.post('/createUser', function (req, res) {

});

app.post('/loginUser', function (req, res) {
  //pass a token or cookie back
});

app.post('/createSurvey', function (req, res) {

    var surveyCollection = db.collection('surveys');

    console.log(typeof req.body);

    const numberQuestions = Object.keys(req.body).length;
    var questionsList = [];
    for(var key in req.body) {
      console.log(key);

      let surveyQuestionData = {
        questionType: req.body[key][0],
        questionField: req.body[key][1],
        answerOptions: req.body[key][2]
      };
      questionsList = questionsList.concat(surveyQuestionData);
    }
    console.log(questionsList);

    const surveyData = {
      "numQuestions": numberQuestions,
      "questionList": questionsList
    };

    surveyCollection.insert(surveyData, function(err, result) {

      if(err) {
        throw err;
      } else {
        res.send("success");
      }

    });

  });

app.get('/respond', function (req, res) {
  //token passed through url
  //access token with req.query.uTx
});

app.listen(5000, () => console.log('Listening on port 5000 ...'));
