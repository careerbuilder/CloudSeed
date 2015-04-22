var express    = require('express'); 		// call express
var app        = express(); 			// define our app using express
var bodyParser = require('body-parser');

app.set('view engine','html');
app.engine('html', require('ejs').renderFile);
//app.use(express.static(path.join(__dirname, 'views')));
app.use(bodyParser.json())
var port = 3000;

// ROUTES FOR OUR API
// =============================================================================
//var login = require('./routes/login.js');
var parts = require('./routes/parts.js');
var stacks = require('./routes/stacks.js');
// app.use(login);
app.use(parts);
app.use(stacks);

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
