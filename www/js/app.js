/*jslint browser:true */
/*global define */

define([
    'angular',
    'app.svc',
    'app.ctrl',
    'app.config',
    'app.dir',
    'app.filter',

    'angular-ui-router'
], function (angular, appSvc, appCtrl, appCfg, appDir, appFilt) {
    'use strict';

    return angular.module('app', ['ui.router'])
        .factory(appSvc)
        .controller(appCtrl)
        .config(appCfg)
        .directive(appDir)
        .filter(appFilt);
});