/*
Hook executed before the 'prepare' stage. Only for iOS project.
It will check if project name has changed. If so - it will change the name of the .entitlements file to remove that file duplicates.
If file name has no changed - hook would not do anything.
*/

var path = require('path'),
  fs = require('fs'),
  ConfigXmlHelper = require('./lib/configXmlHelper.js')
  ,munge = require('./lib/munge.js')
  ,configParser = require('./lib/configXmlParser.js')
;

module.exports = function(ctx) {
  run(ctx);
};

/**
 * Run the hook logic.
 *
 * @param {Object} cordovaContext - cordova context object
 */
function run(cordovaContext) {
  var projectRoot = cordovaContext.opts.projectRoot,
    iosProjectFilePath = path.join(projectRoot, 'platforms', 'ios'),
    configXmlHelper = new ConfigXmlHelper(cordovaContext),
    oldProjectName = getOldProjectName(iosProjectFilePath),
    newProjectName = configXmlHelper.getProjectName()
    ,pluginPreferences = configParser.readPreferences(cordovaContext)
    ,nameHasNotChanged = oldProjectName.length > 0 && oldProjectName === newProjectName
  ;

  // if name has not changed - do nothing
  if (!nameHasNotChanged) {
    console.log('Project name has changed. Renaming .entitlements file.');

    // if it does - rename it
    var oldEntitlementsFilePath = path.join(iosProjectFilePath, oldProjectName, 'Resources', oldProjectName + '.entitlements'),
      newEntitlementsFilePath = path.join(iosProjectFilePath, oldProjectName, 'Resources', newProjectName + '.entitlements');

    try {
      fs.renameSync(oldEntitlementsFilePath, newEntitlementsFilePath);
    } catch (err) {
      console.warn('Failed to rename .entitlements file.');
      console.warn(err);
    }
  }
  
  if (cordovaContext.opts.platforms.indexOf('ios') > -1) {
    var schemes = [], mungeValue;
    var plistString = "<array><dict>";
    plistString += "<key>CFBundleTypeRole</key><string>Editor</string>";
    plistString += "<key>CFBundleURLIconFile</key><string>icon</string>";
    plistString += "<key>CFBundleURLName</key><string>" + configXmlHelper.getPackageName() + "</string>";
    // generate list of host links
    pluginPreferences.hosts.forEach(function(host) {
      if (!/http/.test(host.scheme) && schemes.indexOf(host.scheme) == -1) {
        schemes.push(host.scheme)
      }
    });
    plistString += "<key>CFBundleURLSchemes</key><array>";
    schemes.forEach(function (scheme) {
      plistString += "<string>" + scheme +"</string>"
    })
    plistString += "</array></dict></array>"
    if (schemes.length > 0) {
      mungeValue = {
        "xml": plistString,
        "count": 1
      }
    } else {
      mungeValue = {}
    }
    // console.log("mungeValue", mungeValue)
    if (!/platform (add|rm)/.test(cordovaContext.cmdLine)) {
      munge( cordovaContext, 'ios', [ "config_munge", "files", "*-Info.plist", "parents", "CFBundleURLTypes" ], mungeValue, true);
    }
    
    // fix for https://github.com/EddyVerbruggen/Custom-URL-scheme/issues/23
    // https://github.com/m1r4ge/cordova-lib/commit/b3d38a777cef08d751e0a00aa9fbb6f455de2fe4
    var
      p = path.join(projectRoot, 'node_modules/cordova/node_modules/cordova-lib/src/plugman/util/plist-helpers.js' )
      ,jsConents = fs.readFileSync(p, 'utf8')
    ;
    jsConents = jsConents.replace('if (node[i] === node[j])', 'if (JSON.stringify(node[i]) === JSON.stringify(node[j]))');
    fs.writeFileSync(p, jsConents, 'utf8');
  }
  
  
}

// region Private API

/**
 * Get old name of the project.
 * Name is detected by the name of the .xcodeproj file.
 *
 * @param {String} projectDir absolute path to ios project directory
 * @return {String} old project name
 */
function getOldProjectName(projectDir) {
  var files = [],
    projectName = '';

  try {
    files = fs.readdirSync(projectDir);
  } catch (err) {
    return '';
  }

  // find file with .xcodeproj extension, use it as an old project name
  files.some(function(fileName) {
    if (path.extname(fileName) === '.xcodeproj') {
      projectName = path.basename(fileName, '.xcodeproj');
      return true;
    }

    return false;
  });

  return projectName;
}

// endregion
