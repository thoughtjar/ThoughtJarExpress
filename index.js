const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.post('/createUser', function (req, res) {

});

app.post('/loginUser', function (req, res) {

});

app.post('/createSurvey', function (req, res) {

});

app.get('/respond', function (req, res) {
  //token passed through url
  //access token with req.query.uTx
});

app.listen(5000, () => console.log('Listening on port 5000 ...'));
