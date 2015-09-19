var r = require('rethinkdb', 'oratory');

// setup the database
r.connect(
    { host: 'localhost', port: 28015}
).then(function(conn) {
    console.log("Connected to rethinkdb");
    r.dbCreate("oratory").run(conn, function(err, status) {
        r.tableCreate('items', {primaryKey: 'uid'})
            .run(conn, function(err, stat) {
                r.table("items").indexCreate("types", {multi: true})
                    .run(conn, function(err, stat) {});
            });
        r.tableCreate('history', {primaryKey: 'key'})
            .run(conn, function(err, stat) {
                r.table("history").indexCreate("forUID", {multi: true})
                    .run(conn, function(err, stat) {});
            });
    });
}).error(function(error) {
    console.log("CAN'T CONNECT TO RETHINK: " + error);
    throw(error);
});

function handleError(res) {
    return function(error) {
        res.send(500, {error: error.message});
    }
}

module.exports = {
    createConnection : function(req, res, next) {
        r.connect({ host: 'localhost', port: 28015, db: 'oratory'}).then(function(conn) {
            // Save the connection in `req`
            root.db = conn;
            // Pass the current request to the next middleware
            next();
        }).error(handleError(res));
    },
    
    closeConnection : function(req, res, next) {
        root.db.close();
        next();
    },
}
