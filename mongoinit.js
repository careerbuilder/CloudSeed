db.createCollection("users");
db.users.createIndex({email: 1}, {unique: true});
db.createCollection("parts");
db.parts.createIndex({Type: 1}, {unique: true});
db.createCollection("stacks");
db.stacks.createIndex({Name: 1}, {unique: true});
