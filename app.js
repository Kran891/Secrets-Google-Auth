//jshint esversion:6
require('dotenv').config();
const express=require('express');
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require('mongoose');
const session=require('express-session');
const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');
const GoogleStrategy=require('passport-google-oauth20').Strategy;
const FacebookStrategy=require('passport-facebook');
const findOrCreate=require('mongoose-findorcreate');
const app=express();
app.set('view engine','ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(
    session(
        {
            secret:"this is our little secret.",
            resave:false,
            saveUninitialized:false
        }
    )
);
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/secretsdbgoogle");
var userSchema=new mongoose.Schema(
    {
        username:String,
        password:String,
        googleId:String,
        facebookId:String,
        secret:String
    }
);
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



var User=mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
      
    });
  }
));
passport.use(new FacebookStrategy({
  clientID: process.env.FB_CLIENT_ID,
  clientSecret: process.env.FB_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));
app.route("/")
.get(function(req,res){
    res.render("home")
})
app.route("/register")
.get(function(req,res){
    res.render("register")
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/secrets",async function(req,res){
  let foundUsers=await User.find({secret:{$ne:null}});
  console.log(foundUsers);
   res.render("secrets",{foundUsers:foundUsers});
});

app.route("/login")
.get(function(req,res){
    res.render("login")
});
app.route("/submit")
.get(function(req,res){
  if(req.isAuthenticated())
  res.render("submit")
  else
   res.render("login");
})
.post(async function(req,res){
    var fUser=await User.findById(req.user._id)
    fUser.secret= req.body.secret;
    fUser.save();
    res.redirect("/secrets");
})
app.get("/logout",function(req,res){
  req.logout(function(err){
    if(!err){
      res.redirect("/");
    }
  });
  
});
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
app.listen(3000,function(){

    console.log("Running on port number 3000");
});
