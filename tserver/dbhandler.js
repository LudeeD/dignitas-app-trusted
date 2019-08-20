const sqlite3 = require('sqlite3').verbose();

const printError = (e) =>{
    if (e) console.log(e)
}

const db = new sqlite3.Database('./trust.db',[],printError)

const methods = {
    initialize  : () => {
        db.serialize( () => {
            db.run(`
                CREATE TABLE IF NOT EXISTS votes (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
                    voteID  TEXT,
                    voter   TEXT,
                    value   REAL
            )`,[],printError)
        })
    },

    insert  : (vote) => {
        db.serialize( () => {
            let stmt = db.prepare("INSERT INTO votes (voteID,voter,value) VALUES (?, ?, ?)").bind([vote.id, vote.voter, vote.value])
            stmt.run()
            stmt.finalize()
        })
    },

    retrieve_positive : (vote_id) => {
        return new Promise((resolve, reject) => {
          db.all(
              "SELECT voter,value from votes WHERE voteID = ? AND value >   0", [vote_id], 
              (err, rows) => { if(err) {reject(err)} else {resolve(rows)} }
          )
        })
    },

    retrieve_negative : (vote_id) => {
        return new Promise((resolve, reject) => {
          db.all(
              "SELECT voter,value from votes WHERE voteID = ? AND value <= 0", [vote_id], 
              (err, rows) => { if(err) {reject(err)} else {resolve(rows)} }
          )
        })
    }
}

module.exports = methods;
