/*jslint browser:true */
/*global define */

define([
    'angular',
    'app.svc',
    'app.ctrl',
    'app.config',
    'app.dir',
    'toolbar/dir',
    'editOwners/dir',
    'app.filter',
    'angular-ui-router'
], function (angular, appSvc, appCtrl, appCfg, appDir, appDirToolbar, appDirEditOwners, appFilt) {
    'use strict';

    return angular.module('app', ['ui.router'])
        .factory(appSvc)
        .controller(appCtrl)
        .config(appCfg)
        .directive(appDir)
        //modules
        .directive(appDirToolbar)
        .directive(appDirEditOwners)
        .filter(appFilt);
});