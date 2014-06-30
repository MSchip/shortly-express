var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bcrypt = require('bcrypt');
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.cookieParser('Shhhh this is a secret'));
  app.use(express.session());
  app.use(express.bodyParser())
  app.use(express.static(__dirname + '/public'));
});

var restricted = function(req,res,next){
  if(req.session.username){
    next()
  } else {
    req.session.error = 'Access Denied!!';
    req.redirect('/login');
  }
};


app.get('/', function(req, res) {
  res.render('index');
});

app.get('/create', function(req, res) {
  res.render('index');
});

app.get('/links', function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  })
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

app.get('/users', function(req,res){
  Users.reset().fetch().then(function(users) {
    res.send(200, users.models);
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

// render the login page
app.get('/login', function(req, res){
  res.render('login');
});
// deal with validating the users credentials
app.post('/login', function ( req, res ){
  var username = req.body.username;
  var password = req.body.password;

  new swoUser({ username: username, pasrd: password }).fetch().then(function(found) {
    if(found){
      // Log the user in
      req.session.regenerate(function(){
        res.session.username = username;
        res.redirect('/res')
      });
      // create a new session
      // Store the session token on the user instance
      console.log("found", found)
    } else {
      // response.send and error
      console.log('Authentication Failed');
      res.send('Please Re input you credentials');
    }
  });
});
// render the signup page
app.get('/signup', function(req, res){
  res.render('signup');
});

// this will deal with validating and creating a new User
//  then adding the user to the collection of Users
//  and hashing the input password
app.post('/signup', function ( req, res ){
  var username = req.body.username;
  var password = req.body.password;
  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(password, salt);



  // //hash the password


  new User({ username: username, password:hash }).fetch().then(function(found) {
    if(found){
      console.log("Please use a different name");
    } else {
      var user = new User({
        username: username,
        password: hash
      });
      user.save().then(function(newUser){
        Users.add(newUser);
        res.send(200, newUser);
      });
      console.log(Users);
    }

  });
  //   if(found){
  //     console.log("Please use a different name");
  //   } else {
  //     console.log(user.password)
  //     Users.add(user);
  //     res.redirect('/login');
  //   }
  // });





});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});
console.log('Shortly is listening on 4568');
app.listen(4568);
