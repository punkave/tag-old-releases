var exec = require('child_process').execSync;
var _ = require('lodash');
var argv = require('boring')();
var history = exec('git log -p', {
  encoding: 'utf8'
});
var tags = exec('git tag', {
  encoding: 'utf8'
}).split('\n');
var tagMap = {};
// map existing tags
tags.forEach(function (tag) {
  tagMap[tag] = true;
});
var regex = /\ncommit (\w+)/g;
var result;
var version;
var commit;
var previousVersion;
var previousCommit;
var fs = require('fs');
var compare = require('semver-compare');
var matches = history.match(/^commit (\w+)/);
commit = matches[1];
previousCommit = commit;
var latestVersion = JSON.parse(fs.readFileSync('package.json')).version;
var previousVersion = latestVersion;
var newTags = {};

// iterate from last to first commit in history
while (true) {
  // get next commit
  result = regex.exec(history);
  if (!result) {
    break;
  }
  // get commit id from regex result
  commit = result[1];
  exec('git checkout --quiet ' + commit);
  // skip this commit if there isn't a package.json to get the version
  if (!fs.existsSync('package.json')) {
    continue;
  }
  // get the version of the application in that commit
  version = JSON.parse(fs.readFileSync('package.json')).version;
  // if the version is grather than the last one from master skip this version
  if (compare(version, latestVersion) > 0) {
    continue;
  }
  // if version is not the same of the previousVersion and is not already tagged (!tagMap[previousVersion])
  // add the previous version to the newTags object
  if (version !== previousVersion) {
    if (!tagMap[previousVersion]) {
      // Due to merges the oldest commit for a version may be a
      // ways back, so just keep overwriting and output them at the end
      newTags[previousVersion] = previousCommit;
      console.log('new candidate for ' + previousVersion + ' is ' + previousCommit);
    }
  }
  previousCommit = commit;
  previousVersion = version;
}
exec('git checkout --quiet master');
_.each(newTags, function (commit, version) {
  console.log('git tag ' + version + ' ' + commit);
  if (!argv['dry-run']) {
    exec('git tag ' + version + ' ' + commit);
  }
});
console.log('Finished. Do not forget to run "git push --tags" if you are satisfied.');