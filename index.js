const express = require('express');
const bodyParser = require('body-parser');

const MongoClient = require('mongodb').MongoClient;
const MONGO_URL = 'mongodb://kaushik:kaushik123@ds235609.mlab.com:35609';

const app = express();

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

// Use connect method to connect to the Server
MongoClient.connect(MONGO_URL, function(err, client) {
  console.log("Connected correctly to server");
  const dbName = 'thought-jar-test';
  const db = client.db(dbName);

  // Insert a single document
  db.collection('surveys').insertOne({a:1}, function(err, r) {
    client.close();
  });
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

});

app.get('/respond', function (req, res) {
  //token passed through url
  //access token with req.query.uTx
});

app.listen(5000, () => console.log('Listening on port 5000 ...'));
