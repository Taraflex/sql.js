(async () => {
    for (let c of [
        require('./test_blob'),
        require('./test_issue55'),
        require('./test_database'),
        require('./test_errors'),
        //require('./test_extension_functions'),
        //require('./test_functions'),
        require('./test_issue73'),
        require('./test_issue76'),
        require('./test_issue128'),
        require('./test_node_file'),
        require('./test_statement'),
        require('./test_transactions')
    ]) {
        await c();
    }
})().catch(console.error);