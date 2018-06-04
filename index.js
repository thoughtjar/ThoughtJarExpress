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

    let surveyData = [
    {
      decade: '1970s',
      artist: 'Debby Boone',
      song: 'You Light Up My Life',
      weeksAtOne: 10
    },
    {
      decade: '1980s',
      artist: 'Olivia Newton-John',
      song: 'Physical',
      weeksAtOne: 10
    },
    {
      decade: '1990s',
      artist: 'Mariah Carey',
      song: 'One Sweet Day',
      weeksAtOne: 16
    }
  ];

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
