var exec = require('child_process').execSync;
var _ = require('lodash');
var argv = require('boring')();
var history = exec('git log -p', { encoding: 'utf8' });
var tags = exec('git tag', { encoding: 'utf8' }).split('\n');
var tagMap = {};
tags.forEach(function(tag) {
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
previousVersion = JSON.parse(fs.readFileSync('package.json')).version;
var info = JSON.parse(exec('npm view --json', { encoding: 'utf8' }));
var latestVersion = info.version;
var newTags = {};

while (true) {
  result = regex.exec(history);
  if (!result) {
    break;
  }
  commit = result[1];
  exec('git checkout --quiet ' + commit);
  if (!fs.existsSync('package.json')) {
    continue;
  }
  version = JSON.parse(fs.readFileSync('package.json')).version;
  if (compare(version, latestVersion) > 0) {
    continue;
  }
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
_.each(newTags, function(commit, version) {
  console.log('git tag ' + version + ' ' + commit);
  if (!argv['dry-run']) {
    exec('git tag ' + version + ' ' + commit);
  }
});
console.log('Finished. Do not forget to run "git push --tags" if you are satisfied.');
