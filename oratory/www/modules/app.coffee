define [
  'angular'
  'app.svc'
  'app.ctrl'
  'app.config'
  'app.dir'
  'app.filter'
  'angular-ui-router'

  #all modules must go last
  'cs!toolbar/mod'
  'cs!editOwners/mod'
], (
  angular
  appSvc
  appCtrl
  appCfg
  appDir
  appFilt
  uiRouter

  #all modules must go last
  mods...
) ->
  modNames = (mod.name for mod in mods)
  modNames.push('ui.router')
  return angular.module('app', modNames)
    .factory(appSvc)
    .controller(appCtrl)
    .config(appCfg)
    .directive(appDir)
    .filter(appFilt)
