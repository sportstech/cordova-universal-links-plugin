module.exports = function(ctx, platform, arry, value, replaceRoot) {
    // make sure android platform is part of build 
    if (ctx.opts.platforms.indexOf(platform) < 0) {
        return;
    }
    var
      fs = ctx.requireCordovaModule('fs')
      ,path = ctx.requireCordovaModule('path')
      ,deferral = ctx.requireCordovaModule('q').defer()
      ,pluginsJsonPath = path.join(ctx.opts.projectRoot, 'plugins/' + platform + '.json')
      ,source = JSON.parse( fs.readFileSync(pluginsJsonPath, 'utf8') )
      ,currentRoot, i, attr
    ;
    
    // console.log("Munge: " + arry.join("/") + ": ", value);
    currentRoot = source, attr;
    for ( i = 0; i < arry.length; i++) {
      attr = arry[i];
      // console.log("Munge: attr: '" + attr + "': ", currentRoot[ attr ]);
      if (!currentRoot[ attr ] ){
        if (i == arry.length - 1) {
          currentRoot[ attr ] = [];
        } else {
          currentRoot[ attr ] = {}
        }
      }
      currentRoot = currentRoot[ attr ];
    }
    if (replaceRoot === true) {
      currentRoot.splice(0,currentRoot.length);
    }
    currentRoot.push( value );
    
    fs.writeFileSync(pluginsJsonPath, JSON.stringify( source, null, 2 ), 'utf8');
};
