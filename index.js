const fetch = require('node-fetch');

const fs = require('fs');
const os = require('os');

const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const cors = require('cors');

const mongodb = require('mongodb');
const MONGO_URL = 'mongodb://kaushik:kaushik123@ds235609.mlab.com:35609/thought-jar-test';
const ObjectId = require('mongodb').ObjectId;
//const NumberDecimal = require('mongodb').NumberDecimal; broken
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client('665725879844-0prbhschdv3mdh2ignucocl9cq3em3dm.apps.googleusercontent.com');

const Promise = require('promise');
const util = require('util');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = 10;

var http = require('http');

const app = express();


var db;
var clientID;
var users;
// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(cors())


mongodb.MongoClient.connect(MONGO_URL, function(err, client) {

  if(err) {
    throw err;
  }

    db = client.db('thought-jar-test');



    //workspace



    //end worskpace


    });

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
        clientDbId = decoded.dbId;



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
              "reqResponses": req.body['reqResponses'],
              "responsesSoFar": 0
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
    mainExc();

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



app.post('/myJars', function (req, res) {
  console.log(req.body['access-token']);
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
	 if(result[0]['surveysOwned'] === undefined) {
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

  var fullData;
  var reqResponses;
  var responsesSoFar;
  getResponsesById().then(function(surveyData) {
    removeIdentifiers(surveyData).then(function(finalData) {
      getAnalysis(finalData);
    });
  });

    async function getResponsesById() {
      let surveyData = await db.collection('surveys').find({"_id" : ObjectId(req.body.identifier)}).toArray();
      fullData = surveyData;
      reqResponses = surveyData[0].reqResponses;
      responsesSoFar = surveyData[0].responsesSoFar;
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
      }).then(response => {
        return response.text().then((text) => {
          var data = {
            'title': fullData[0]['title'],
            'questionList': fullData[0]['questionList'],
            'responsesSoFar': responsesSoFar,
            'reqResponses': parseInt(reqResponses),
            'responseCSV': text
          };
          res.send(data);
        })
      }).catch(error => console.error('Error:', error))
      .then(response => console.log('Success'));
    }

});

app.post('/myJarAnalysis', function (req, res) {
  console.log(req.body);
  var responses = {};
  responses['first'] = [];
  var surveyToBeAnalyzed;
  var questionList = [];
  getResponsesToBeAnalyzed().then(function(survey) {
    questionList = survey[0].questionList;
    console.log(questionList);
    firstLoopResponse(survey[0].responses).then(function() {

      if(req.body.oneVar === false) { // two variables to be analyzed
        secondLoopResponse(surveyToBeAnalyzed[0].responses).then(function() {
          console.log(responses);
          var questionData = Object.assign({}, responses);
          //send two var response to python
          questionData["firstQuestionField"] = questionList[parseInt(req.body.firstResponseId.slice(8))-1]["questionField"];
          questionData["secondQuestionField"] = questionList[parseInt(req.body.secondResponseId.slice(8))-1]["questionField"];
          var url;
          if(req.body.firstQuestionType === "numberanswer" && req.body.secondQuestionType === "numberanswer"){
            url = "http://localhost:8081/twoVarNumNum";
          };
          fetch(url, {
            method: 'POST',
            body: JSON.stringify(questionData),
            headers:{
              'Content-Type': 'application/json'
            }
          }).then(response => {
            return response.json().then((json) => {
              console.log(json);
              var data = {
                'src': json["srcList"]
              };
              res.send(data);
            });
          }).catch(error => console.error('Error:', error))
          .then(response => console.log('Success'));
        });
      }else{ // there is only one variable to be analyzed

        console.log(responses);
        var questionData = Object.assign({}, responses);
        //send response to python here
        questionData["firstQuestionField"] = questionList[parseInt(req.body.firstResponseId.slice(8))-1]["questionField"];
        var url;
        if(req.body.firstQuestionType === "numberanswer") {
          url = "http://localhost:8081/oneVarNum";
        } else if(req.body.firstQuestionType === "multiplechoice") {
          url = "http://localhost:8081/oneVarMC";
        } else if(req.body.firstQuestionType === "longanswer") {
          url = "http://localhost:8081/oneVarLongText";
        };
        console.log(url);
        fetch(url, {
          method: 'POST',
          body: JSON.stringify(questionData),
          headers:{
            'Content-Type': 'application/json'
          }
        }).then(response => {
          return response.json().then((json) => {
            console.log(json);
            var data = {
              'src': json["srcList"]
            };
            res.send(data);
          });
        }).catch(error => console.error('Error:', error))
        .then(response => console.log('Success'));
      }
    })
  });

  async function getResponsesToBeAnalyzed() {

    surveyToBeAnalyzed = await db.collection('surveys').find({"_id": ObjectId(req.body.identifier)}).toArray(); //req.body.identifier
    return surveyToBeAnalyzed;
  };




  async function firstLoopResponse(surveyArr) {

    for(let j = 0; j < surveyArr.length; j++) {
      responses['first'] = await responses['first'].concat(surveyArr[j].response[req.body.firstResponseId]);
      //console.log('res1', responses);
      if(j === surveyArr.length) {
        return 0;
      }
    }

}

  async function secondLoopResponse(surveyArr) {

    responses['second'] = [];
    for(let i = 0; i < surveyArr.length; i++) {
      responses['second'] = await responses['second'].concat(surveyArr[i].response[req.body.secondResponseId]);
      console.log('res2', responses);
    }

  }

});


app.post('/fillJars', function (req, res) {
  console.log("/fillJars BEING CALLED");
  console.log("access-token: " + req.body['access-token']);
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
  var surveyReward = 2; //req.body.reward;

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
              //console.log("result of adding survey to db: " + result.toArray());
            }
            db.collection('surveys').update({"_id" : ObjectId(req.body.surveyId)}, { $inc: {"responsesSoFar": 1} }, function (err, result) {
              console.log('SUCCESS adding response');
              db.collection('users').update({"_id" : ObjectId(decoded["dbId"])}, { $push: { "jarsFilled" : ObjectId(req.body.surveyId) } }, function(err, result) {
                console.log('SUCCESS adding survey to user profile');
                db.collection('users').update({"_id" : ObjectId(decoded["dbId"])}, {$inc: {"balance" : mongodb.Decimal128.fromString(surveyReward.toString())}}, function(err, result){
                  res.send('success');
                });
              });
            });
          });

      });
    });

});

app.post('/withdraw', function(req, res) {
  const withdrawMinimum = 0; //set minimum widthdraw amount. Tx will fail if not met.
  var users = db.collection('users');
  var txExecutorId;
  var txIsSafe;
  var signedWidthdrawAmtMongo = "-" + (req.body.withdrawAmount).toString();
  widthdraw();

  async function getExecId(){
    var cert = await new Promise((resolve, reject) => {
      fs.readFile('cert-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', function(err, result) {
        resolve(result)
      });
    });

    return txExecutorId = await new Promise((resolve, reject) => {

      jwt.verify(req.body['access-token'], cert, function(err, decoded) {
        resolve(decoded['dbId']);
      });

    });


  }

  async function checkBalanceSafe() {
    var currentData = await users.find({"_id" : ObjectId(txExecutorId)}).toArray();
    console.log("cData: " + JSON.stringify(currentData));
    var currentBalance = currentData[0]['balance'];
    if(currentBalance >= withdrawMinimum && currentBalance >= req.body.widthdrawAmount) {
      return txIsSafe = true; //safe to make tx
    } else {
      return txIsSafe = false; //not safe to make tx
    }
  }

  async function changeBalance() {
    return await users.update({"_id" : ObjectId(txExecutorId)}, { $inc: {"balance": NumberDecimal(signedWidthdrawAmtMongo) } });
    //assert balance is correct for safer operations
  }

  async function transferFunds() {

  }

  function widthdraw() {
    getExecId().then(function(){
      checkBalanceSafe().then(function() {
      //automatically called checkBalanceSafe()
        if(txIsSafe === true) {
          //tx is safe, continue on
          changeBalance().then(function() {
            //making request to payment provider
            res.send("success widthdraw")
          });
        } else {
          return res.send("balance not sufficient");
        }
    });
  });
}

});



app.post('/authenticate', function (req, res) {
  console.log(JSON.stringify(req.body));
  var changerToken;
  var tempToken;
  var gooAudience;

  setConsts().then(useToken());

 async function setConsts() {
  if(req.body.isMobile == 1) {
	changerToken = req.body.id_token;
	gooAudience =  '665725879844-hh7vs0udvd5c1akujda4ehr2gbplg6ki.apps.googleusercontent.com';
	return 0;
  } else {
	changerToken = req.body.id_token;
	gooAudience = '665725879844-0prbhschdv3mdh2ignucocl9cq3em3dm.apps.googleusercontent.com';
	return 0;
  }
}
  async function stripToken(fullToken) {
	tempToken = await fullToken.substring(4);
	tempToken = await fullToken.substring(0, fullToken.length-1);
	console.log(tempToken)
	return tempToken
  }
  console.log("AUTH REQUESTTTTTTTTTTTTT: " + req.body);
  console.log(typeof req.body.id_token)

  function useToken() {
  console.log(gooAudience)
  const ticket = client.verifyIdToken({
      idToken: req.body.id_token,
      audience: gooAudience

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
		              return 0;
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
		                return 0;
                });
            });
          });


        }

    });

  });
 };
});


app.post('/profile', function(req, res) {
  var users = db.collection('users');
  console.log("acc token: " + req.body['access-token']);
  getUserId(); //automatically calls and returns getData()

 function getUserId() {
    fs.readFile('cert-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', function(err, cert) {
      jwt.verify(req.body['access-token'], cert, function(err, decoded) {
	if(err) {
	  console.log("err: " + err);
	}
        console.log("deooded profile body: " + decoded);
	getData(decoded['dbId']); //calls get data functon below
      });
    });
  }

  async function getData(userPhone) {
    var userDBData = await users.find({"_id": ObjectId(userPhone)}).toArray();
    console.log("sent bal: " + (parseFloat(userDBData[0]['balance'].toString())).toFixed(2));
    var refinedUserData = {"balance": (parseFloat(userDBData[0]['balance'].toString())).toFixed(2), "jarsFilled": userDBData[0]['jarsFilled'].length};
    return res.send(refinedUserData);
  };

});

app.post('/inviteSMS', function(req, res) {
  var txExecutorId;

  getInviterInfo().then(function(inviterData) {
    sendSMS(inviterData[0]['fName'] + " " + inviterData[0]['lName']);
  });

  async function getInviterInfo(){
    var cert = await new Promise((resolve, reject) => {
      fs.readFile('cert-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', function(err, result) {
        resolve(result);
      });
    });

    txExecutorId = await new Promise((resolve, reject) => {
      jwt.verify(req.body['access-token'], cert, function(err, decoded) {
        console.log(decoded);
        resolve(decoded['dbId']);
      });
    });


    return await db.collection('users').find({"_id" : ObjectId(txExecutorId)}).toArray();

  }

  function sendSMS(inviterName) {
    return new Promise((resolve, reject) => {
      var options = {
        method: 'POST',
        uri: 'https://api.twilio.com/2010-04-01/Accounts/ACb0257e359e484faa3a415caadba55130/Messages.json',
        headers: {
          'Authorization': 'Basic QUNiMDI1N2UzNTllNDg0ZmFhM2E0MTVjYWFkYmE1NTEzMDoyN2Q0OWYzYjA3MDUyMjc0NzYzNTBlZDg2YTliYjk0YQ==',
          'content-type': 'application/x-www-form-urlencoded'
        },
        formData: {
          To: "+1" + req.body.phone,
          From: "+18312288506",
          Body: inviterName + " invited you to thoughtjar"
        },
        json: true // Automatically parses the JSON string in the response
    }
   console.log("inviter name: " + inviterName);

  rp(options)
      .then(function (verifyOutcome) {
          if(verifyOutcome['error_code'] == null) {
            console.log("success sending invite");
            resolve();
          } else {
            console.log("Invite failed to be verified (by Twilio API) - " + verifyOutcome);
            res.send("Invite Failed");
            reject();
          }
      })
      .catch(function (err) {
          console.log("Execution error: Invite failed to be sent - " + err);
          res.send("Invite Failed");
          reject();
      });
    });
  }

});


app.post('/checkUserExists', function(req, res) {
  var users = db.collection('users');
  mainCheck().then(function(existence) {
    res.send(existence);
  });
  async function mainCheck() {
    var doesExist = await users.find({"phone": req.body.phone}).toArray();
    return doesExist.length > 0;
  }
});

app.post('/signUp', function(req, res) {
  var users = db.collection('users');
  finishVerifySMS().then(function() {
    checkIfUserExists().then(function(existence) {
      //even though user exists check happens before, we check again for database safety
      if(existence === false) {
        //new user
        console.log("new user detected");
        hashPass(req.body.password).then(function(generatedHashedPass){
          console.log("insertingUserintoDb");
          insertUserIntoDb(generatedHashedPass);
        });
      } else {
        //user exists, should login instead
        res.send('user already exists');
      }
    });
  }).catch(() => console.log("caught rejected promise from finishVerifySMS()"));

 function finishVerifySMS() {
    return new Promise((resolve, reject) => {
    var options = {
      uri: 'https://api.authy.com/protected/json/phones/verification/check',
      qs: {
        'country_code': '1',
        'phone_number': req.body.phone,
        'verification_code': req.body.verificationCode
      },
      headers: {
          'X-Authy-API-Key': 's0jJzc3q2AL4VNapA9QufN1dKwh6PvrS'
      },
      json: true // Automatically parses the JSON string in the response
  };

  rp(options)
      .then(function (verifyOutcome) {
          if(verifyOutcome.success) {
            console.log("phone number verified");
            resolve();
          } else {
            console.log("Code failed to be verified (by Twilio API) - " + verifyOutcome);
            res.send("Failed to verify");
            reject();
          }
      })
      .catch(function (err) {
          console.log("Execution error: Code failed to be verified - " + err);
          res.send("Failed to verify");
          reject();
      });
    });
  }

  async function checkIfUserExists() {
    var doesExist = await users.find({"phone": req.body.phone}).toArray();
    return doesExist.length > 0;
  }

  async function hashPass(plainTextPass) {
    var theSalt = await bcrypt.genSalt(saltRounds);
    var theHash = await bcrypt.hash(plainTextPass, theSalt);
    return theHash;
  }

  function insertUserIntoDb(securePass) {
    console.log("inside insert function");
    db.collection('users').insertOne({
      "phone": req.body.phone,
      "verifiedP": true,
      "hashedP": securePass,
      "fName": req.body.fName,
      "lName": req.body.lName,
      "jarsFilled": [],
      "balance": 0.00,
      "access-token": 'cotton'
    }).then(function(result) {
      console.log("insert result: " + result); //result of inserting into DB
      var newUserDataResponse ={"fName": result['ops'][0]['fName'], "lName": result['ops'][0]['lName'], "phone": result['ops'][0]['phone'], "access-token": result['ops'][0]['access-token'], "dbId": result['ops'][0]['_id']};
      fs.readFile('pk-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', function (err, cert) {
          jwt.sign(newUserDataResponse, cert, { algorithm: 'RS256' }, function(err, encryptedNewUserDataResponse) {
            res.send({"access-token": encryptedNewUserDataResponse, "fName": result['ops'][0]['fName'], "lName": result['ops'][0]['lName'], "phone": result['ops'][0]['phone']});
            return 0;
          });
       });
    });
  }

});


app.post('/verifySMS', function(req, res) {
  var options = {
    method: 'POST',
    uri: 'https://api.authy.com/protected/json/phones/verification/start',
    headers: {
        'X-Authy-API-Key': 's0jJzc3q2AL4VNapA9QufN1dKwh6PvrS'
    },
    body: {
      "via": "sms",
      "phone_number": req.body.phone,
      "country_code": "1",
      "code_length": "4",
      "locale": "en"
    },
    json: true // Automatically parses the JSON string in the response
};

rp(options)
    .then(function (repos) {
        console.log("Code sent to " + req.body.phone);
        res.send("Code sent");
    })
    .catch(function (err) {
        console.log("Code failed to be sent to " + req.body.phone);
        res.send("Code failed to be sent");
    });
});

app.post('/login', function(req, res) {
  console.log(req.body.phone);
  users = db.collection('users');
  users.find({phone: req.body.phone}).toArray(function(err, result) {
    if(result.length > 0) {
      //user exists
      console.log("db res: " + JSON.stringify(result));
      if(comparePass(req.body.password, result[0].hashedP)) {
        console.log("pass matches");
        console.log("result: " + result);
        //password matches, login
        var existingUserDataResponse ={"phone": result[0]['phone'], "access-token": result[0]['access-token'], "dbId": result[0]['_id']};

        fs.readFile('pk-GHPIKGOGGF4UYRN4772YQVSF7CRVCTES.pem', function (err, cert) {
          if(err) {
            console.log("error reading file");
          } else {
            console.log("read file");
          }

            jwt.sign(existingUserDataResponse, cert, { algorithm: 'RS256' }, function(err, encryptedExistingUserDataResponse) {
              if(err) {
                console.log("error signing token");
              } else {
                console.log("signed token");
              }
              console.log("encrypted user response: " + encryptedExistingUserDataResponse);
              console.log("fName: " + result[0]['fName']);
              var sendingBack = {"access-token": encryptedExistingUserDataResponse, "fName": result[0]['fName'], "lName": result[0]['lName']};
              console.log(JSON.stringify(sendingBack));
              res.send({"access-token": encryptedExistingUserDataResponse, "fName": result[0]['fName'], "lName": result[0]['lName'], "phone": result[0]['phone']});
              //all clear, everything works
            });
        });
      } else {
        //user exists but password does not match
        console.log("incorrect password");
        res.send('incorrect password');
      }
    } else {
      //user does not exist
      console.log("user does not exist")
      res.send('User does not exist');
    }
  });

  async function comparePass(plainTextPass, hashedPass) {
    var passwordsDoMatch = await bcrypt.compare(plainTextPass, hashedPass);
    if(passwordsDoMatch) {
      //login
      return true;
    } else {
      //not correct password, but user exists
      return false;
    }
  }

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
