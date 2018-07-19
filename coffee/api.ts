//@copyright Ophir LOJKINE

type pointer = number;
type vType = 'i8' | 'i16' | 'i32' | 'i64' | 'float' | 'double';
declare const Module: any;
declare function getValue(ptr: pointer, type: vType): pointer;
declare function setValue(ptr: pointer, value: number, type: vType);
declare function stackSave(): pointer;
declare function stackAlloc(size: number): pointer;
declare function stackRestore(stack: pointer);
declare function stringToUTF8(s: string, dst: pointer, size: number);

// Global constants
const NULL = 0;// Null pointer
export const enum SQLite {
    ABORT = 4,
    AUTH = 23,
    BLOB = 4,
    BUSY = 5,
    CANTOPEN = 14,
    CONSTRAINT = 19,
    CORRUPT = 11,
    DONE = 101,
    EMPTY = 16,
    ERROR = 1,
    FLOAT = 2,
    FORMAT = 24,
    FULL = 13,
    INTEGER = 1,
    INTERNAL = 2,
    INTERRUPT = 9,
    IOERR = 10,
    LOCKED = 6,
    MISMATCH = 20,
    MISUSE = 21,
    NOLFS = 22,
    NOMEM = 7,
    NOTADB = 26,
    NOTFOUND = 12,
    NOTICE = 27,
    NULL = 5,
    OK = 0,
    PERM = 3,
    PROTOCOL = 15,
    RANGE = 25,
    READONLY = 8,
    ROW = 100,
    SCHEMA = 17,
    TEXT = 3,
    TOOBIG = 18,
    UTF8 = 1,
    WARNING = 28,
}

var RegisterExtensionFunctions, apiTemp, sqlite3_bind_blob, sqlite3_bind_double, sqlite3_bind_int, sqlite3_bind_parameter_index, sqlite3_bind_text, sqlite3_changes, sqlite3_clear_bindings, sqlite3_close_v2, sqlite3_column_blob, sqlite3_column_bytes, sqlite3_column_double, sqlite3_column_name, sqlite3_column_text, sqlite3_column_type, sqlite3_create_function_v2, sqlite3_data_count, sqlite3_errmsg, sqlite3_exec, sqlite3_finalize, sqlite3_free, sqlite3_open, sqlite3_prepare_v2, sqlite3_prepare_v2_sqlptr, sqlite3_reset, sqlite3_result_double, sqlite3_result_null, sqlite3_result_text, sqlite3_step, sqlite3_value_blob, sqlite3_value_bytes, sqlite3_value_double, sqlite3_value_int, sqlite3_value_text, sqlite3_value_type;


Module.locateFile = function (file) {
    return __dirname + '/' + file;
};

let listeners: ((c) => void)[] = [];

// Represents an SQLite database
export class Database {
    private filename: string = 'dbfile_' + (9007199254740991 * Math.random() >>> 0);
    private db: pointer;
    // A list of all prepared statements of the database
    statements: { [stm: number]: Statement; } = Object.create(null);
    /**
     * Open a new database either by creating a new one or opening an existing one,
     * stored in the byte array passed in first argument
     * @param {Uint8Array} data An array of bytes representing an SQLite database file
     */
    constructor(data: Uint8Array) {
        if (data != null) {
            //@ts-ignore
            FS.createDataFile('/', this.filename, data, true, true);
        }
        this.handleError(sqlite3_open(this.filename, apiTemp));
        this.db = getValue(apiTemp, 'i32');
        //RegisterExtensionFunctions(@db)
    }

    /**
     * Execute an SQL query, ignoring the rows it returns.
     * @param sql SQL text to execute
     * @param params When the SQL statement contains placeholders, you can pass them in here. They will be bound to the statement before it is executed. If you use the params argument, you **cannot** provide an sql string that contains several queries (separated by ';')
     * @example db.run("INSERT INTO test VALUES (:age, :name)", {':age':18, ':name':'John'}); //Insert values in a table
     */
    run(sql: string, params?: { [placeholder: string]: any }) {
        if (!this.db) {
            throw 'Database closed';
        }
        if (params) {
            const stmt = this.prepare(sql, params);
            stmt.step();
            stmt.free();
        } else {
            this.handleError(sqlite3_exec(this.db, sql, 0, 0, apiTemp));
        }
        return this;
    }

    /** 
    Execute an SQL query, and returns the result.
  
    This is a wrapper against Database.prepare, Statement.step, Statement.get,
    and Statement.free.
  
    The result is an array of result elements. There are as many result elements
    as the number of statements in your sql string (statements are separated by a semicolon)
  
    Each result element is an object with two properties:
    'columns' : the name of the columns of the result (as returned by Statement.getColumnNames())
    'values' : an array of rows. Each row is itself an array of values
  
    ## Example use
    We have the following table, named *test* :
  
    | id | age |  name  |
    |:--:|:---:|:------:|
    | 1  |  1  | Ling   |
    | 2  |  18 | Paul   |
    | 3  |  3  | Markus |
  
    We query it like that:
    ```javascript
    var db = new SQL.Database();
    var res = db.exec("SELECT id FROM test; SELECT age,name FROM test;");
    ```
  
    `res` is now :
    ```javascript
    [
    {columns: .id, values:[[1],[2],[3]]},
    {columns: .age','name, values:[[1,'Ling,[18,'Paul,[3,'Markus]}
    ]
    ```
  
    @param sql [String] a string containing some SQL text to execute
    @return [Array<QueryResults>] An array of results.
     */
    exec(sql) {
        var curresult, pStmt, pzTail, results, stmt;
        if (!this.db) {
            throw 'Database closed';
        }
        const stack = stackSave();
        // Store the SQL string in memory. The string will be consumed, one statement
        // at a time, by sqlite3_prepare_v2_sqlptr.
        // Allocate at most 4 bytes per UTF8 char, +1 for the trailing '\0'
        const bufLen = sql.length << 2 + 1;
        let nextSqlPtr = stackAlloc(bufLen);
        stringToUTF8(sql, nextSqlPtr, bufLen);
        // Used to store a pointer to the next SQL statement in the string
        pzTail = stackAlloc(4);
        results = [];
        while (getValue(nextSqlPtr, 'i8') !== NULL) {
            setValue(apiTemp, 0, 'i32');
            setValue(pzTail, 0, 'i32');
            this.handleError(sqlite3_prepare_v2_sqlptr(this.db, nextSqlPtr, -1, apiTemp, pzTail));
            pStmt = getValue(apiTemp, 'i32'); //  pointer to a statement, or null
            nextSqlPtr = getValue(pzTail, 'i32');
            if (pStmt === NULL) {
                continue; // Empty statement
            }
            stmt = new Statement(pStmt, this);
            curresult = null;
            while (stmt.step()) {
                if (curresult === null) {
                    curresult = {
                        'columns': stmt.getColumnNames(),
                        'values': []
                    };
                    results.push(curresult);
                }
                curresult.values.push(stmt.get());
            }
            stmt.free();
        }
        stackRestore(stack);
        return results;
    }

    /** Execute an sql statement, and call a callback for each row of result.
  
    **Currently** this method is synchronous, it will not return until the callback has
    been called on every row of the result. But this might change.
  
    @param sql [String] A string of SQL text. Can contain placeholders that will be
    bound to the parameters given as the second argument
    @param params [Array<String,Number,null,Uint8Array>] (*optional*) Parameters to bind
    to the query
    @param callback [Function(Object)] A function that will be called on each row of result
    @param done [Function] A function that will be called when all rows have been retrieved
  
    @return [Database] The database object. Useful for method chaining
  
    @example Read values from a table
    db.each("SELECT name,age FROM users WHERE age >= $majority",
                {$majority:18},
                function(row){console.log(row.name + " is a grown-up.")}
            );
     */
    each(sql, params, callback, done) {
        var stmt;
        if (typeof params === 'function') {
            done = callback;
            callback = params;
            params = void 0;
        }
        stmt = this.prepare(sql, params);
        while (stmt.step()) {
            callback(stmt.getAsObject());
        }
        stmt.free();
        if (typeof done === 'function') {
            return done();
        }
    }

    /** Prepare an SQL statement
    @param sql [String] a string of SQL, that can contain placeholders ('?', ':VVV', ':AAA', '@AAA')
    @param params [Array] (*optional*) values to bind to placeholders
    @return [Statement] the resulting statement
    @throw [String] SQLite error
    */
    prepare(sql, params) {
        var pStmt, stmt;
        setValue(apiTemp, 0, 'i32');
        this.handleError(sqlite3_prepare_v2(this.db, sql, -1, apiTemp, NULL));
        pStmt = getValue(apiTemp, 'i32'); //  pointer to a statement, or null
        if (pStmt === NULL) {
            throw 'Nothing to prepare';
        }
        stmt = new Statement(pStmt, this);
        if (params != null) {
            stmt.bind(params);
        }
        this.statements[pStmt] = stmt;
        return stmt;
    }

    /** Exports the contents of the database to a binary array
    @return [Uint8Array] An array of bytes of the SQLite3 database file
    */
    export() {
        var _, binaryDb, ref, stmt;
        ref = this.statements;
        for (_ in ref) {
            stmt = ref[_];
            stmt.free();
        }
        this.handleError(sqlite3_close_v2(this.db));
        binaryDb = FS.readFile(this.filename, {
            encoding: 'binary',
            flags: undefined
        });
        this.handleError(sqlite3_open(this.filename, apiTemp));
        this.db = getValue(apiTemp, 'i32');
        return binaryDb;
    }

    /** Close the database, and all associated prepared statements.
  
    The memory associated to the database and all associated statements
    will be freed.
  
    **Warning**: A statement belonging to a database that has been closed cannot
    be used anymore.
  
    Databases **must** be closed, when you're finished with them, or the
    memory consumption will grow forever
     */
    close() {
        var _, ref, stmt;
        ref = this.statements;
        for (_ in ref) {
            stmt = ref[_];
            stmt.free();
        }
        this.handleError(sqlite3_close_v2(this.db));
        FS.unlink('/' + this.filename);
        return this.db = null;
    }

    /** 
    * Analyze a result code, and throw an error with a descriptive message otherwise
    */
    handleError(returnCode: SQLite) {
        if (returnCode !== SQLite.OK) {
            throw new Error(sqlite3_errmsg(this.db));
        }
    }

    /** Returns the number of rows modified, inserted or deleted by the
    most recently completed INSERT, UPDATE or DELETE statement on the
    database Executing any other type of SQL statement does not modify
    the value returned by this function.
  
    @return [Number] the number of rows modified
    */
    getRowsModified() {
        return sqlite3_changes(this.db);
    }

    /** Register a custom function with SQLite
    @example Register a simple function
        db.create_function("addOne", function(x) {return x+1;})
        db.exec("SELECT addOne(1)") // = 2
  
    @param name [String] the name of the function as referenced in SQL statements.
    @param func [Function] the actual function to be executed.
    */
    create_function(name, func) {
        var func_ptr, wrapped_func;
        wrapped_func = function (cx, argc, argv) {
            var arg, args, data_func, i, k, ref, result, value_ptr, value_type;
            // Parse the args from sqlite into JS objects
            args = [];
            for (i = k = 0, ref = argc; (0 <= ref ? k < ref : k > ref); i = 0 <= ref ? ++k : --k) {
                value_ptr = getValue(argv + (4 * i), 'i32');
                value_type = sqlite3_value_type(value_ptr);
                data_func = (function () {
                    switch (false) {
                        case value_type !== 1:
                            return sqlite3_value_int;
                        case value_type !== 2:
                            return sqlite3_value_double;
                        case value_type !== 3:
                            return sqlite3_value_text;
                        case value_type !== 4:
                            return function (ptr) {
                                var blob_arg, blob_ptr, j, l, ref1, size;
                                size = sqlite3_value_bytes(ptr);
                                blob_ptr = sqlite3_value_blob(ptr);
                                blob_arg = new Uint8Array(size);
                                //TODO need optimization
                                for (j = l = 0, ref1 = size; (0 <= ref1 ? l < ref1 : l > ref1); j = 0 <= ref1 ? ++l : --l) {
                                    blob_arg[j] = HEAP8[blob_ptr + j];
                                }
                                return blob_arg;
                            };
                        default:
                            return function (ptr) {
                                //TODO throw error
                                return null;
                            };
                    }
                })();
                arg = data_func(value_ptr);
                args.push(arg);
            }
            // Invoke the user defined function with arguments from SQLite
            result = func.apply(null, args);
            // Return the result of the user defined function to SQLite
            if (!result) {
                return sqlite3_result_null(cx);
            } else {
                switch (typeof result) {
                    case 'number':
                        return sqlite3_result_double(cx, result);
                    case 'string':
                        return sqlite3_result_text(cx, result, -1, -1);
                }
            }
        };
        // Generate a pointer to the wrapped, user defined function, and register with SQLite.
        func_ptr = addFunction(wrapped_func);
        this.handleError(sqlite3_create_function_v2(this.db, name, func.length, SQLite.UTF8, 0, func_ptr, 0, 0, 0));
        return this;
    }

};

/** Represents an prepared statement.

Prepared statements allow you to have a template sql string,
that you can execute multiple times with different parameters.

You can't instantiate this class directly, you have to use a [Database](Database.html)
object in order to create a statement.

**Warning**: When you close a database (using db.close()), all its statements are
closed too and become unusable.

@see Database.html#prepare-dynamic
@see https://en.wikipedia.org/wiki/Prepared_statement
 */
class Statement {
    private pos: number = 1;
    private allocatedmem: pointer[] = [];
    //Statements can't be created by the API user, only by Database::prepare
    constructor(
        private stmt: pointer,
        private db: Database
    ) { }

    /** Bind values to the parameters, after having reseted the statement
  
    SQL statements can have parameters, named *'?', '?NNN', ':VVV', '@VVV', '$VVV'*,
    where NNN is a number and VVV a string.
    This function binds these parameters to the given values.
  
    *Warning*: ':', '@', and '$' are included in the parameters names
  
    ## Binding values to named parameters
    @example Bind values to named parameters
    var stmt = db.prepare("UPDATE test SET a=@newval WHERE id BETWEEN $mini AND $maxi");
    stmt.bind({$mini:10, $maxi:20, '@newval':5});
    - Create a statement that contains parameters like '$VVV', ':VVV', '@VVV'
    - Call Statement.bind with an object as parameter
  
    ## Binding values to parameters
    @example Bind values to anonymous parameters
    var stmt = db.prepare("UPDATE test SET a=? WHERE id BETWEEN ? AND ?");
    stmt.bind([5, 10, 20]);
    - Create a statement that contains parameters like '?', '?NNN'
    - Call Statement.bind with an array as parameter
  
    ## Value types
    Javascript type | SQLite type
    --- | ---
    number | REAL, INTEGER
    boolean | INTEGER
    string | TEXT
    Array, Uint8Array | BLOB
    null | NULL
    @see http://www.sqlite.org/datatype3.html
  
    @see http://www.sqlite.org/lang_expr.html#varparam
    @param values [Array,Object] The values to bind
    @return [Boolean] true if it worked
    @throw [String] SQLite Error
     */
    bind(values) {
        if (!this.stmt) {
            throw 'Statement closed';
        }
        this.reset();
        if (Array.isArray(values)) {
            return this.bindFromArray(values);
        } else {
            return this.bindFromObject(values);
        }
    }

    /** Execute the statement, fetching the the next line of result,
    that can be retrieved with [Statement.get()](#get-dynamic) .
  
    @return [Boolean] true if a row of result available
    @throw [String] SQLite Error
    */
    step() {
        if (!this.stmt) {
            throw 'Statement closed';
        }
        this.pos = 1;
        const ret = sqlite3_step(this.stmt);
        switch (ret) {
            case SQLite.ROW:
                return true;
            case SQLite.DONE:
                return false;
            default:
                return this.db.handleError(ret);
        }
    }

    /** Internal methods to retrieve data from the results of a statement that has been executed */
    getNumber(pos = this.pos++) {
        return sqlite3_column_double(this.stmt, pos);
    }

    getString(pos = this.pos++) {
        return sqlite3_column_text(this.stmt, pos);
    }

    getBlob(pos = this.pos++) {
        var i, k, ptr, ref, result, size;
        size = sqlite3_column_bytes(this.stmt, pos);
        ptr = sqlite3_column_blob(this.stmt, pos);
        result = new Uint8Array(size);
        //TODO need optimization
        for (i = k = 0, ref = size; (0 <= ref ? k < ref : k > ref); i = 0 <= ref ? ++k : --k) {
            result[i] = HEAP8[ptr + i];
        }
        return result;
    }

    /** Get one row of results of a statement.
    If the first parameter is not provided, step must have been called before get.
    @param [Array,Object] Optional: If set, the values will be bound to the statement, and it will be executed
    @return [Array<String,Number,Uint8Array,null>] One row of result
  
    @example Print all the rows of the table test to the console
  
    var stmt = db.prepare("SELECT * FROM test");
    while (stmt.step()) console.log(stmt.get());
    */
    get(params) { // Get all fields
        if (params != null) {
            this.bind(params) && this.step();
        }
        const results1 = [];
        for (let field = 0, k = 0, ref = sqlite3_data_count(this.stmt); (0 <= ref ? k < ref : k > ref); field = 0 <= ref ? ++k : --k) {
            switch (sqlite3_column_type(this.stmt, field)) {
                case SQLite.INTEGER:
                case SQLite.FLOAT:
                    results1.push(this.getNumber(field));
                    break;
                case SQLite.TEXT:
                    results1.push(this.getString(field));
                    break;
                case SQLite.BLOB:
                    results1.push(this.getBlob(field));
                    break;
                default:
                    results1.push(null);
            }
        }
        return results1;
    }

    /** Get the list of column names of a row of result of a statement.
    @return [Array<String>] The names of the columns
    @example
  
        var stmt = db.prepare("SELECT 5 AS nbr, x'616200' AS data, NULL AS nothing;");
        stmt.step(); // Execute the statement
        console.log(stmt.getColumnNames()); // Will print .nbr','data','nothing
    */
    getColumnNames() {
        var i, k, ref, results1;
        results1 = [];
        for (i = k = 0, ref = sqlite3_data_count(this.stmt); (0 <= ref ? k < ref : k > ref); i = 0 <= ref ? ++k : --k) {
            results1.push(sqlite3_column_name(this.stmt, i));
        }
        return results1;
    }

    /** Get one row of result as a javascript object, associating column names with
    their value in the current row.
    @param [Array,Object] Optional: If set, the values will be bound to the statement, and it will be executed
    @return [Object] The row of result
    @see [Statement.get](#get-dynamic)
  
    @example
  
        var stmt = db.prepare("SELECT 5 AS nbr, x'616200' AS data, NULL AS nothing;");
        stmt.step(); // Execute the statement
        console.log(stmt.getAsObject()); // Will print {nbr:5, data: Uint8Array([1,2,3]), nothing:null}
    */
    getAsObject(params) {
        var i, k, len, name, names, rowObject, values;
        values = this.get(params);
        names = this.getColumnNames();
        rowObject = {};
        for (i = k = 0, len = names.length; k < len; i = ++k) {
            name = names[i];
            rowObject[name] = values[i];
        }
        return rowObject;
    }

    /** Shorthand for bind + step + reset
    Bind the values, execute the statement, ignoring the rows it returns, and resets it
    @param [Array,Object] Value to bind to the statement
    */
    run(values) {
        if (values != null) {
            this.bind(values);
        }
        this.step();
        return this.reset();
    }

    // Internal methods to bind values to parameters
    private bindString(string, pos = this.pos++) {
        var bytes, strptr;
        bytes = intArrayFromString(string);
        this.allocatedmem.push(strptr = allocate(bytes, 'i8', ALLOC_NORMAL));
        this.db.handleError(sqlite3_bind_text(this.stmt, pos, strptr, bytes.length - 1, 0));
        return true;
    }

    bindBlob(array, pos = this.pos++) {
        const blobptr = allocate(array, 'i8', ALLOC_NORMAL)
        this.allocatedmem.push(blobptr);
        this.db.handleError(sqlite3_bind_blob(this.stmt, pos, blobptr, array.length, 0));
        return true;
    }

    private bindNumber(num, pos = this.pos++) {
        const bindfunc = num === (num | 0) ? sqlite3_bind_int : sqlite3_bind_double;
        this.db.handleError(bindfunc(this.stmt, pos, num));
        return true;
    }

    bindNull(pos = this.pos++) {
        return sqlite3_bind_blob(this.stmt, pos, 0, 0, 0) === SQLite.OK;
    }

    /** Call bindNumber or bindString appropriatly*/
    private bindValue(val, pos = this.pos++) {
        //TODO better type detect
        switch (typeof val) {
            case "string":
                return this.bindString(val, pos);
            case "number":
            case "boolean":
                return this.bindNumber(+val, pos);
            case "object":
                if (val === null) {
                    return this.bindNull(pos);
                } else if (val.length != null) {
                    return this.bindBlob(val, pos);
                } else {
                    throw `Wrong API use : tried to bind a value of an unknown type (${val}).`;
                }
        }
    }

    /** Bind names and values of an object to the named parameters of the statement
    */
    private bindFromObject(valuesObj) {
        for (let name in valuesObj) {
            const value = valuesObj[name];
            const num = sqlite3_bind_parameter_index(this.stmt, name);
            if (num !== 0) {
                this.bindValue(value, num);
            }
        }
        return true;
    }

    /** Bind values to numbered parameters
    @param [Array]
    @private
    @nodoc
    */
    bindFromArray(values) {
        var k, len, num, value;
        for (num = k = 0, len = values.length; k < len; num = ++k) {
            value = values[num];
            this.bindValue(value, num + 1);
        }
        return true;
    }

    /** Reset a statement, so that it's parameters can be bound to new values
    It also clears all previous bindings, freeing the memory used by bound parameters.
    */
    reset() {
        this.freemem();
        //TODO try/finally
        return sqlite3_clear_bindings(this.stmt) === SQLite.OK && sqlite3_reset(this.stmt) === SQLite.OK;
    }

    /** Free the memory allocated during parameter binding */
    freemem() {
        this.allocatedmem.map(_free);
        this.allocatedmem.length = 0;
    }

    /** Free the memory used by the statement
    @return [Boolean] true in case of success
    */
    free() {
        this.freemem();
        //TODO try/finally
        const res = sqlite3_finalize(this.stmt) === SQLite.OK;
        delete this.db.statements[this.stmt];
        this.stmt = NULL;
        return res;
    }
}

Module.onRuntimeInitialized = function () {
    apiTemp = stackAlloc(4);
    sqlite3_open = Module.cwrap('sqlite3_open', 'number', ['string', 'number']);
    sqlite3_close_v2 = Module.cwrap('sqlite3_close_v2', 'number', ['number']);
    sqlite3_exec = Module.cwrap('sqlite3_exec', 'number', ['number', 'string', 'number', 'number', 'number']);
    sqlite3_free = Module.cwrap('sqlite3_free', '', ['number']);
    sqlite3_changes = Module.cwrap('sqlite3_changes', 'number', ['number']);
    // Prepared statements
    //# prepare
    sqlite3_prepare_v2 = Module.cwrap('sqlite3_prepare_v2', 'number', ['number', 'string', 'number', 'number', 'number']);
    // Version of sqlite3_prepare_v2 to which a pointer to a string that is already
    // in memory is passed.
    sqlite3_prepare_v2_sqlptr = Module.cwrap('sqlite3_prepare_v2', 'number', ['number', 'number', 'number', 'number', 'number']);
    //# Bind parameters

    //int sqlite3_bind_text(sqlite3_stmt*, int, const char*, int n, void(*)(void*));
    // We declare const char* as a number, because we will manually allocate the memory and pass a pointer to the function
    sqlite3_bind_text = Module.cwrap('sqlite3_bind_text', 'number', ['number', 'number', 'number', 'number', 'number']);
    sqlite3_bind_blob = Module.cwrap('sqlite3_bind_blob', 'number', ['number', 'number', 'number', 'number', 'number']);
    //int sqlite3_bind_double(sqlite3_stmt*, int, double);
    sqlite3_bind_double = Module.cwrap('sqlite3_bind_double', 'number', ['number', 'number', 'number']);
    //int sqlite3_bind_double(sqlite3_stmt*, int, int);
    sqlite3_bind_int = Module.cwrap('sqlite3_bind_int', 'number', ['number', 'number', 'number']);
    //int sqlite3_bind_parameter_index(sqlite3_stmt*, const char *zName);
    sqlite3_bind_parameter_index = Module.cwrap('sqlite3_bind_parameter_index', 'number', ['number', 'string']);
    //# Get values
    // int sqlite3_step(sqlite3_stmt*)
    sqlite3_step = Module.cwrap('sqlite3_step', 'number', ['number']);
    sqlite3_errmsg = Module.cwrap('sqlite3_errmsg', 'string', ['number']);
    // int sqlite3_data_count(sqlite3_stmt *pStmt);
    sqlite3_data_count = Module.cwrap('sqlite3_data_count', 'number', ['number']);
    sqlite3_column_double = Module.cwrap('sqlite3_column_double', 'number', ['number', 'number']);
    sqlite3_column_text = Module.cwrap('sqlite3_column_text', 'string', ['number', 'number']);
    sqlite3_column_blob = Module.cwrap('sqlite3_column_blob', 'number', ['number', 'number']);
    sqlite3_column_bytes = Module.cwrap('sqlite3_column_bytes', 'number', ['number', 'number']);
    sqlite3_column_type = Module.cwrap('sqlite3_column_type', 'number', ['number', 'number']);
    //const char *sqlite3_column_name(sqlite3_stmt*, int N);
    sqlite3_column_name = Module.cwrap('sqlite3_column_name', 'string', ['number', 'number']);
    // int sqlite3_reset(sqlite3_stmt *pStmt);
    sqlite3_reset = Module.cwrap('sqlite3_reset', 'number', ['number']);
    sqlite3_clear_bindings = Module.cwrap('sqlite3_clear_bindings', 'number', ['number']);
    // int sqlite3_finalize(sqlite3_stmt *pStmt);
    sqlite3_finalize = Module.cwrap('sqlite3_finalize', 'number', ['number']);
    //# Create custom functions
    sqlite3_create_function_v2 = Module.cwrap('sqlite3_create_function_v2', 'number', ['number', 'string', 'number', 'number', 'number', 'number', 'number', 'number', 'number']);
    sqlite3_value_type = Module.cwrap('sqlite3_value_type', 'number', ['number']);
    sqlite3_value_bytes = Module.cwrap('sqlite3_value_bytes', 'number', ['number']);
    sqlite3_value_text = Module.cwrap('sqlite3_value_text', 'string', ['number']);
    sqlite3_value_int = Module.cwrap('sqlite3_value_int', 'number', ['number']);
    sqlite3_value_blob = Module.cwrap('sqlite3_value_blob', 'number', ['number']);
    sqlite3_value_double = Module.cwrap('sqlite3_value_double', 'number', ['number']);
    sqlite3_result_double = Module.cwrap('sqlite3_result_double', '', ['number', 'number']);
    sqlite3_result_null = Module.cwrap('sqlite3_result_null', '', ['number']);
    sqlite3_result_text = Module.cwrap('sqlite3_result_text', '', ['number', 'string', 'number', 'number']);
    RegisterExtensionFunctions = Module.cwrap('RegisterExtensionFunctions', 'number', ['number']);
    for (let listener of listeners) {
        listener(Database);
    }
    listeners = null;
};

Module.Database = Database;

Module.init = function (): Promise<Database> {
    if (listeners) {
        return new Promise(function (resolve) {
            return listeners.push(resolve);
        });
    } else {
        return Promise.resolve(Module.Database);
    }
};
