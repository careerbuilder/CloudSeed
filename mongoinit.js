db.createCollection("parts");
db.parts.createIndex({Type: 1}, {unique: true});
db.createCollection("stacks");
db.parts.createIndex({Name: 1}, {unique: true});
