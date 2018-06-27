EMCC=emcc

CFLAGS=-O2 -DSQLITE_OMIT_LOAD_EXTENSION -DSQLITE_DISABLE_LFS -DLONGDOUBLE_TYPE=double -DSQLITE_THREADSAFE=0 -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_FTS3_PARENTHESIS -DSQLITE_OMIT_ALTERTABLE -DSQLITE_OMIT_ANALYZE -DSQLITE_OMIT_ATTACH -DSQLITE_OMIT_AUTHORIZATION -DSQLITE_OMIT_AUTOINCREMENT -DSQLITE_OMIT_BETWEEN_OPTIMIZATION -DSQLITE_OMIT_BLOB_LITERAL -DSQLITE_OMIT_CAST -DSQLITE_OMIT_CHECK -DSQLITE_OMIT_COMPILEOPTION_DIAGS -DSQLITE_OMIT_COMPLETE -DSQLITE_OMIT_COMPOUND_SELECT -DSQLITE_OMIT_DATETIME_FUNCS -DSQLITE_OMIT_DECLTYPE -DSQLITE_OMIT_DEPRECATED -DSQLITE_OMIT_EXPLAIN -DSQLITE_OMIT_FLAG_PRAGMAS -DSQLITE_OMIT_FOREIGN_KEY -DSQLITE_OMIT_GET_TABLE -DSQLITE_OMIT_INCRBLOB -DSQLITE_OMIT_INTEGRITY_CHECK -DSQLITE_OMIT_LIKE_OPTIMIZATION -DSQLITE_OMIT_LOAD_EXTENSION -DSQLITE_OMIT_LOCALTIME -DSQLITE_OMIT_OR_OPTIMIZATION -DSQLITE_OMIT_PAGER_PRAGMAS -DSQLITE_OMIT_PRAGMA -DSQLITE_OMIT_PROGRESS_CALLBACK -DSQLITE_OMIT_REINDEX -DSQLITE_OMIT_SCHEMA_PRAGMAS -DSQLITE_OMIT_SCHEMA_VERSION_PRAGMAS -DSQLITE_OMIT_SHARED_CACHE -DSQLITE_OMIT_SUBQUERY -DSQLITE_OMIT_TEMPDB -DSQLITE_OMIT_TRACE -DSQLITE_OMIT_TRUNCATE_OPTIMIZATION -DSQLITE_OMIT_UTF16 -DSQLITE_OMIT_VACUUM -DSQLITE_OMIT_VIEW -DSQLITE_OMIT_VIRTUALTABLE -DSQLITE_OMIT_XFER_OPT -DSQLITE_UNTESTABLE

all: debug release debug-wasm release-wasm

# RESERVED_FUNCTION_POINTERS setting is used for registering custom functions
debug: EMFLAGS= -Wall -O1 -g -s INLINING_LIMIT=10 -s RESERVED_FUNCTION_POINTERS=64 -s WASM=0 -s MODULARIZE=1 -s EXPORT_NAME='SQL' -s INVOKE_RUN=0 -s STRICT=1 -s NO_DYNAMIC_EXECUTION=1 -s ASSERTIONS=1
debug: dist/sql-debug.js

debug-wasm: EMFLAGS= -Wall -O1 -g -s INLINING_LIMIT=10 -s RESERVED_FUNCTION_POINTERS=64 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME='SQL' -s INVOKE_RUN=0 -s STRICT=1 -s NO_DYNAMIC_EXECUTION=1 -s ASSERTIONS=1 -s ALLOW_MEMORY_GROWTH=1 -s BINARYEN_METHOD='native-wasm'
debug-wasm: dist/sql-debug-wasm.js

release: EMFLAGS= -Oz -s INLINING_LIMIT=50 -s RESERVED_FUNCTION_POINTERS=64 -s WASM=0 -s MODULARIZE=1 -s EXPORT_NAME='SQL' -s INVOKE_RUN=0 -s STRICT=1 -s NO_DYNAMIC_EXECUTION=1 -s ASSERTIONS=0 --llvm-lto 1 --memory-init-file 0
release: dist/sql-release.js

release-wasm: EMFLAGS= -Oz -s INLINING_LIMIT=50 -s RESERVED_FUNCTION_POINTERS=64 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME='SQL' -s INVOKE_RUN=0 -s STRICT=1 -s NO_DYNAMIC_EXECUTION=1 -s ASSERTIONS=0 -s ALLOW_MEMORY_GROWTH=1 -s BINARYEN_METHOD='native-wasm' --llvm-lto 1 --memory-init-file 0
release-wasm: dist/sql-release-wasm.js

dist/sql-%.js: dist/api.js
	$(EMCC) $(EMFLAGS) -s EXPORTED_FUNCTIONS=['_malloc','_free','_sqlite3_open','_sqlite3_exec','_sqlite3_free','_sqlite3_errmsg','_sqlite3_changes','_sqlite3_prepare_v2','_sqlite3_bind_text','_sqlite3_bind_blob','_sqlite3_bind_double','_sqlite3_bind_int','_sqlite3_bind_parameter_index','_sqlite3_step','_sqlite3_data_count','_sqlite3_column_double','_sqlite3_column_text','_sqlite3_column_blob','_sqlite3_column_bytes','_sqlite3_column_type','_sqlite3_column_name','_sqlite3_reset','_sqlite3_clear_bindings','_sqlite3_finalize','_sqlite3_close_v2','_sqlite3_create_function_v2','_sqlite3_value_bytes','_sqlite3_value_type','_sqlite3_value_text','_sqlite3_value_int','_sqlite3_value_blob','_sqlite3_value_double','_sqlite3_result_double','_sqlite3_result_null','_sqlite3_result_text','_RegisterExtensionFunctions'] -s EXTRA_EXPORTED_RUNTIME_METHODS=['cwrap','stackAlloc','stackSave','stackRestore'] c/extension-functions.c c/sqlite3.c --pre-js dist/api.js -o $@

dist/api.js: coffee/api-data.coffee coffee/api.coffee
	cat $^ | coffee --bare --compile --transpile --stdio > $@

module.tar.gz: test package.json AUTHORS README.md dist/sql.js
	tar --create --gzip $^ > $@

clean:
	rm -rf dist/sql-* dist/api.js
