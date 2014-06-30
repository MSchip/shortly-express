var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link');

var User = db.Model.extend({
  tableName: "users",
  hasTimestamps: true,
  links: function(){
    return this.hasMany(Link);
  },
  initialize: function(){
    var self = this;
    this.on('creating', function(model, attributes, options){

      //var psw = attributes.password;

      //self.set('password', hashedPass);
    });
  }

});

module.exports = User;
