const SQL = require('../index');
const assert = require('assert');

module.exports = async () => {
    await SQL.init();

    var fs = require('fs');
    var path = require('path');

    var filebuffer = fs.readFileSync(path.join(__dirname, 'issue55.db'));

    //Works
    var db = new SQL.Database(filebuffer);

    var origCount = db.prepare("SELECT COUNT(*) AS count FROM networklocation").getAsObject({}).count;

    db.run("INSERT INTO networklocation (x, y, network_id, floor_id) VALUES (?, ?, ?, ?)", [123, 123, 1, 1]);

    var count = db.prepare("SELECT COUNT(*) AS count FROM networklocation").getAsObject({}).count;

    assert.equal(count, origCount + 1, "The row has been inserted");
    var dbCopy = new SQL.Database(db.export());
    var newCount = dbCopy.prepare("SELECT COUNT(*) AS count FROM networklocation").getAsObject({}).count;
    assert.equal(newCount, count, "export and reimport copies all the data");

}