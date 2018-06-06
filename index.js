const fs = require('fs');
const os = require('os');

const express = require('express');
const bodyParser = require('body-parser');

const mongodb = require('mongodb');
const MONGO_URL = 'mongodb://kaushik:kaushik123@ds235609.mlab.com:35609/thought-jar-test';
const ObjectId = require('mongodb').ObjectId;

const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client('665725879844-0prbhschdv3mdh2ignucocl9cq3em3dm.apps.googleusercontent.com');

const async = require("async");
const Promise = require('promise');

const jwt = require('jsonwebtoken');

const app = express();

var db;
var clientID;
var users;
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

//workspace





//end worskpace

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.post('/createSurvey', function (req, res) {

    //decrypt access-token
    var clientDbId;
    fs.readFile('cert-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', (err, cert) => {
      jwt.verify(req.body['access-token'], cert, (err, decoded) => {
        console.log('token printing');
        console.log(decoded);
        console.log(decoded.dbId);
        clientDbId = decoded.dbId; // bar



            var surveyCollection = db.collection('surveys');

            const numberQuestions = Object.keys(req.body['questionsList']).length;
            var questionsList = [];
            for(var key in req.body['questionsList']) {
              console.log(key);

              let surveyQuestionData = {
                questionType: req.body['questionsList'][key][0],
                questionField: req.body['questionsList'][key][1],
                answerOptions: req.body['questionsList'][key][2]
              };
              questionsList = questionsList.concat(surveyQuestionData);
            }
            console.log(questionsList);

            const surveyData = {
              "title": req.body['title'],
              "description": req.body['description'],
              "numQuestions": numberQuestions,
              "questionList": questionsList,
              "clientDbId": clientDbId
            };

            surveyCollection.insert(surveyData, function(err, result) {

              if(err) {
                throw err;
              } else {
                console.log(result);
                var users = db.collection('users');
                console.log(clientDbId);
                users.update({ "_id" : clientDbId }, { $set: { "surveysOwned": result } }, function (err, result1) {
                  if(err){
                    console.log('error');
                  }else{
                    console.log('aaaaaa');
                  }
                  console.log("success2");
                  res.send("success");
                });

              }

            });

      });

    })


  });

app.get('/respond', function (req, res) {
  //token passed through url
  //access token with req.query.uTx
});

app.post('/authenticate', function (req, res) {

  console.log(req.body);

  const ticket = client.verifyIdToken({
      idToken: req.body.id_token,
      audience: '665725879844-0prbhschdv3mdh2ignucocl9cq3em3dm.apps.googleusercontent.com',

    /*const payload = ticket.getPayload();
    const userEmail = payload['email'];
    console.log(userEmail); */
    // If request specified a G Suite domain:
    //const domain = payload['hd'];

  }).then(function (newTx) {
    var newUserTx = newTx;
    console.log(newTx);
    console.log('email: ' + newTx['payload']['email']);
  //  var userEmail = newTx['payload']['email'];
    //search db and see if email exists
    //if exists, send back cookie
    //if does not exist, create new document with user and send back cookie
    users = db.collection('users');
    users.find({email: newTx['payload']['email']}).toArray(function (err, result) {
      console.log(result);

        if(result.length > 0) {
          //if user exists

          console.log('user exists');
          var existingUserDataResponse ={"name": result[0]['fullName'], "email": result[0]['email'], "access-token": result[0]['access-token'], "dbId": result[0]['_id']};

          fs.readFile('pk-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', function (err, cert) {
              jwt.sign(existingUserDataResponse, cert, { algorithm: 'RS256' }, function(err, encryptedExistingUserDataResponse) {
                res.send({"access-token": encryptedExistingUserDataResponse, "name": result[0]['fullName'], "email": result[0]['email']});
              });
          });

        } else {

          db.collection('users').insertOne({
            "email": newUserTx['payload']['email'],
            "fullName": newUserTx['payload']['name'],
            "access-token": 'cotton'
          }).then(function(result) {
            console.log(result);
            var newUserDataResponse ={"name": result['ops'][0]['fullName'], "email": result['ops'][0]['email'], "access-token": result['ops'][0]['access-token'], "dbId": result['ops'][0]['_id']};
            fs.readFile('pk-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', function (err, cert) {
                jwt.sign(newUserDataResponse, cert, { algorithm: 'RS256' }, function(err, encryptedNewUserDataResponse) {
                  res.send({"access-token": encryptedNewUserDataResponse, "name": result['ops'][0]['fullName'], "email": result['ops'][0]['email']});
                });
            });
          });


        }

    });

  });

});

app.post('/logout', function (req, res) {

  users = db.collection('users');
  console.log(req.body.dbId);

  users.update({ "_id" : req.body.dbId }, { $set: { "token": 'null' } }, function (err, result) {
    console.log("successfully logged out");
    res.send("successfully logged out");
  });

});

app.listen(5000, () => console.log('Listening on port 5000 ...'));
