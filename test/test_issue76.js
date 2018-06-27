const SQL = require('../index');
const assert = require('assert');

(async () => {
	await SQL.init();
	// Create a database
	var db = new SQL.Database();
	// Ultra-simple query
	var stmt = db.prepare("VALUES (?)");
	// Bind null to the parameter and get the result
	assert.deepEqual(stmt.get([null]), [null],
		"binding a null value to a statement parameter");
	db.close();

})().catch(console.error)