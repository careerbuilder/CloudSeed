var express    = require('express'); 		// call express
var bodyParser = require('body-parser');
var path       = require('path');
var favicon    = require('serve-favicon');
var app        = express(); 			// define our app using express


app.set('view engine','html');
app.engine('html', require('ejs').renderFile);
app.use(express.static(path.join(__dirname, 'client')));
app.set('views', __dirname + '/client');
app.use(bodyParser.json())
app.use(favicon(__dirname + '/favicon.ico'));

var port = 3000;

// ROUTES FOR OUR API
// =============================================================================

var auth = require('./routes/auth.js');
var parts = require('./routes/parts.js');
var stacks = require('./routes/stacks.js');
app.use(auth);
app.use(parts);
app.use(stacks);

app.get('/', function(req, res){
  res.render('index');
});

//keep this last, as it will return 404
app.use(function(req, res, next){
  res.status(404);
  // respond with html page
  if (req.accepts('html')) {
    return res.render('404', { url: req.url });
  }
  // respond with json
  if (req.accepts('json')) {
    return res.send({error: 'Not a valid endpoint'});
  }
  // default to plain-text. send()
  return res.type('txt').send('Not found');
});

app.listen(port);
console.log('Magic happens on port ' + port);
