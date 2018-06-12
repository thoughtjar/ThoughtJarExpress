const fetch = require('node-fetch');

const fs = require('fs');
const os = require('os');

const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');

const mongodb = require('mongodb');
const MONGO_URL = 'mongodb://kaushik:kaushik123@ds235609.mlab.com:35609/thought-jar-test';
const ObjectId = require('mongodb').ObjectId;

const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client('665725879844-0prbhschdv3mdh2ignucocl9cq3em3dm.apps.googleusercontent.com');

//const async = require('async');
//const await = require('asyncawait/await');
const Promise = require('promise');

const jwt = require('jsonwebtoken');

var http = require('http');

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

  //mainExc();

  async function mainExc() {
    var numberArray = [];
    let queryResult = await db.collection('users').find().toArray();

    for(let i = 0; i < queryResult.length; i++) {
        let token = await generateMagicToken();
        let mTokenData = {
          "mtoken": token,
          "theusersId": queryResult[i]['_id'],
          "surveyId": '123445'
        };


        let insertWaiter = await db.collection('magictokens').insert(mTokenData);

        numberArray = numberArray.concat({phone: queryResult[i]['phone'], magic: token});
        console.log(numberArray);
    };

  };


  async function generateMagicToken() {

    var token = "";
    var possibleLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 10; i++) {
      if(i % 2 == 0) {
        token += possibleLetters.charAt(Math.floor(Math.random() * possibleLetters.length));
      } else {
        token += Math.floor(Math.random() * 10);
      }
      if(token.length == 10) {return token};
    }

  }

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
              "clientDbId": clientDbId,
              "responses": [],
            };

            surveyCollection.insert(surveyData, function(err, result) {

              if(err) {
                throw err;
              } else {
                console.log(JSON.stringify(result));
                var users = db.collection('users');
                console.log(result['insertedIds']['0']);
                users.update({ "_id" : ObjectId(clientDbId) }, { $push: { "surveysOwned": result['insertedIds']['0'] } }, function (err, result1) {
                  if(err){
                    console.log('error');
                  }else{
                    console.log('success');
                  }
                  console.log("checkpoint");
                  res.send("success");
                });

              }

            });

      });

    });


  });


  app.post('/distribute', function (req, res) {
    db.collection('users').find().toArray(function (err, result) {
      console.log(result);
    });
  });



app.post('/myJars', function (req, res) {
  console.log("/myJars BEING CALLED");
  users = db.collection('users');
  fs.readFile('cert-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', (err, cert) => {
    if (err) {
      res.send("error reading key");
    }
    jwt.verify(req.body['access-token'], cert, (err, decoded) => {
      if (err) {
        res.send("error verifying token");
      }
      console.log(decoded);
      users.find({ "_id" : ObjectId(decoded['dbId'])}, { 'surveysOwned' : 1 }).toArray(function (err, result) {
        if(result[0]['surveysOwned'].length === 0) {
          var blankData = {
            "jars": []
          }
          res.send(blankData);
        }else{

            console.log(result);
            var surveysArray = result[0]['surveysOwned'];
          //  console.log("survArr: " + surveysArray[0]);
            var surveyDetailsResponse = [];
        var counter_unique = 0;
        var noResults = true;
        surveysArray.forEach(function (element) {
          //console.log("ELEMENT ===="+element);
          db.collection('surveys').find({ "_id" : ObjectId(element)}).toArray(function (err, result1) {
            counter_unique ++;
            //console.log("ELEMENT ===="+element);
            //console.log("result ===="+JSON.stringify(result1));
              surveyDetailsResponse = surveyDetailsResponse.concat({
                "identifier": result1[0]['_id'],
                "title": result1[0]['title'],
                "description": result1[0]['description']
              });
              if(counter_unique === surveysArray.length){
                noResults = false;
                var data = {"jars": surveyDetailsResponse};
                res.send(data);
              };
          });
        });
      };
    });



    });
  });

});

app.post('/myJar', function (req, res) {

  getResponsesById().then(function(surveyData) {
    removeIdentifiers(surveyData).then(function(finalData) {
      getAnalysis(finalData).then(function (analysis) {
        res.send(analysis);
      });
    });
  });

    async function getResponsesById() {
      let surveyData = await db.collection('surveys').find({"_id" : ObjectId(req.body.identifier)}).toArray();
      return await surveyData[0].responses;
    };

    async function removeIdentifiers(surveyData) {
      let finalData = [];

      for(i = 0; i < surveyData.length; i++) {
        finalData = await finalData.concat(surveyData[i].response);
        if(finalData.length === surveyData.length) {
          return finalData
        }
      }
    };

    async function getAnalysis(finalData) {
      data = {
        'responseContent': finalData
      }
      fetch("http://localhost:8081/csv", {
        method: 'POST',
        body: JSON.stringify(data),
        headers:{
          'Content-Type': 'application/json'
        }
      }).then(res => {
        console.log(res);
        return res.text().then((text) => {
          console.log(text);
        })
      }).catch(error => console.error('Error:', error))
      .then(response => console.log('Success'));
      /*
      var options = {
        host: 'localhost',
        port: '8081',
        path: '/csv',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      //var file = fs.createWriteStream("dataReturn.csv");
      let analysis = await http.request(options);
      console.log(analysis);
      //let temp = await analysis.pipe(file);
      return "ssssss"
      */
      /*
      var options = {
        uri: 'http://localhost:8081/csv',
        method: 'POST',
        body: {
          'responseContent': finalData
        },
        json: true
      };
      let analysis = await rp(options); //.pipe(fs.createWriteStream('dataReturn.csv'));
      //console.log(analysis);
      //analysis.pipe(fs.createw)
      return "ssssss"
      */
    }


});


app.post('/fillJars', function (req, res) {

  console.log("/fillJars BEING CALLED");
  surveys = db.collection('surveys');
  fs.readFile('cert-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', (err, cert) => {
    if (err) {
      res.send("error reading key");
    }
    jwt.verify(req.body['access-token'], cert, (err, decoded) => {
      if (err) {
        res.send("error verifying token");
      }
      console.log(decoded);
      surveys.find().toArray(function (err, result) {
      console.log(result);
      if(result.length === 0){
        var blankData = {
          "jars": []
        };
        res.send(blankData);
      }else{
        console.log(result);
        var surveysArray = result;
        var surveyDetailsResponse = [];
        surveysArray.forEach(function (element) {
              surveyDetailsResponse = surveyDetailsResponse.concat({
                "identifier": element['_id'],
                "title": element['title'],
                "description": element['description']
              });
              if(element === surveysArray[surveysArray.length -1]){
                var data = {"jars": surveyDetailsResponse};
                res.send(data);
              };
        });
      }
    });

    });
  });
});




app.post('/fillJar', function(req, res) {

  var accessToken = null;
  var surveyData = null;
  if(req.body.magictoken) {
    console.log(req.body["magictoken"]);
    db.collection('magictokens').find({"mtoken" : req.body["magictoken"]}).toArray(function (err, tokenHolderData) {
      if(err) {res.send("Magic Token Invalid")};
      console.log(tokenHolderData);
      if(tokenHolderData[0]['surveyId'] != req.body.identifier) {res.send("Magic Token does not match survey")};
      db.collection('users').find({"_id": ObjectId(tokenHolderData[0]['userId'])}).toArray(function (err, result) {
        console.log('user exists');
        var tokenUserDataResponse ={"name": result[0]['fullName'], "email": result[0]['email'], "access-token": result[0]['access-token'], "dbId": result[0]['_id']};
        fs.readFile('pk-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', function (err, cert) {
            jwt.sign(tokenUserDataResponse, cert, { algorithm: 'RS256' }, function(err, encryptedExistingUserDataResponse) {
              accessToken = encryptedExistingUserDataResponse;
              complete();
            });
        });
    });
  });

} else {
  accessToken = 0;
  complete();
};

  db.collection('surveys').find({"_id" : ObjectId(req.body["identifier"])}).toArray(function (err, surveySearchResult) {
    surveyData = surveySearchResult[0];
    complete();
  });

  function complete() {
    if(accessToken !== null && surveyData !== null) {
      console.log('complete');
      console.log({"access-token": accessToken, "surveyData": surveyData});
      if(accessToken == 0) {
        res.send({"surveyData": surveyData});
      } else {
        res.send({"access-token": accessToken, "surveyData": surveyData});
      }
    }
  }

});


app.post('/respond', function (req, res) {

  fs.readFile('cert-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', function (err, cert) {

      if (err) {
        res.send("error reading key");
      }

      jwt.verify(req.body['access-token'], cert, function (err, decoded) {

          if (err) {
            res.send("error verifying token");
          }

          var responseData = {"responderId": decoded['dbId'], "response": req.body.response};
          console.log("respinse data", responseData);

        db.collection('surveys').update({ "_id" : ObjectId(req.body.surveyId) }, { $push: { "responses": responseData } }, function (err, result) {
          if (err) {
            res.send('error adding to database');
          } else {
            console.log('SUCCESS adding response');
            res.send('success');
          }
        });

      });
    });

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

  users.update({ "_id" : ObjectId(req.body.dbId) }, { $set: { "token": 'null' } }, function (err, result) {
    console.log("successfully logged out");
    res.send("successfully logged out");
  });

});

app.listen(5000, () => console.log('Listening on port 5000 ...'));
