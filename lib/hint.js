var fs = require('fs'),
    sys = require('sys'),
    glob = require('glob'),
    path = require('path'),
    jshint = require('./../packages/jshint/jshint.js'),
    _cache = {
        directories: {}
    };

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

function isDirectory(aPath) {
    var isDir;

    try {
        if (_cache.directories.hasOwnProperty(aPath)) {
            isDir = _cache.directories[aPath];
        } else {
            isDir = fs.statSync(aPath).isDirectory();
            _cache.directories[aPath] = isDir;
        }
    } catch (e) {
        isDir = false;
    }

    return isDir;
}


function _shouldIgnore(somePath, ignore) {
    function isIgnored(p) {
        var fnmatch = glob.fnmatch(p, somePath, ~(glob.FNM_PATHNAME | glob.FNM_CASEFOLD)),
            lsmatch = isDirectory(p) && p.match(/^[^\/]*\/?$/) &&
                somePath.match(new RegExp("^" + p + ".*"));

        return !!(fnmatch || lsmatch);
    }

    return ignore.some(function (ignorePath) {
        return isIgnored(ignorePath);
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

        _cache = {
            directories: {}
        };

        reporter(results);
    }
};
