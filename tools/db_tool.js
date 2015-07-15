var db = require('./mongo_tools.js');
//read config
var dbtype = global.config.DB.Type.toLowerCase();

console.log("Using database type: " + dbtype);


module.exports = db;
