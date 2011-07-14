var fs = require('fs'),
    sys = require('sys'),
    glob = require('glob'),
    path = require('path'),
    jshint = require('./../packages/jshint/jshint.js');

function _lint(file, results, config) {
    var buffer;

    try {
        buffer = fs.readFileSync(file, 'utf-8');
    } catch (e) {
        sys.puts("Error: Cant open: " + file);
        sys.puts(e + '\n');
    }

    if (!jshint.JSHINT(buffer, config)) {
        jshint.JSHINT.errors.forEach(function (error) {
            if (error) {
                results.push({file: file, error: error});
            }
        });
    }
}

function _shouldIgnore(somePath, ignore) {
    return ignore.some(function (ignorePath) {
        return glob.fnmatch(ignorePath, somePath, glob.FNM_PATHNAME);
    });
}

function _collect(filePath, files, ignore) {
    if (ignore && _shouldIgnore(filePath, ignore)) {
        return;
    }

    if (fs.statSync(filePath).isDirectory()) {
        fs.readdirSync(filePath).forEach(function (item) {
            _collect(path.join(filePath, item), files, ignore);
        });
    } else if (filePath.match(/\.js$/)) {
        files.push(filePath);
    }
}

function _reporter(results) {
    var len = results.length,
        str = '',
        file, error;

    results.forEach(function (result) {
        file = result.file;
        error = result.error;
        str += file  + ': line ' + error.line + ', col ' +
            error.character + ', ' + error.reason + '\n';
    });

    sys.puts(len > 0 ? (str + "\n" + len + ' error' + ((len === 1) ? '' : 's')) : "Lint Free!");
    process.exit(len > 0 ? 1 : 0);
}

module.exports = {
    hint: function (targets, config, reporter, ignore) {
        var files = [],
            results = [];

        if (!reporter) reporter = _reporter;

        targets.forEach(function (target) {
            _collect(target, files, ignore);
        });

        files.forEach(function (file) {
            _lint(file, results, config);
        });

        reporter(results);
    }
};
