/*jslint browser:true */
/*global define */

define([
    'angular',
    'app.svc',
    'app.ctrl',
    'app.config',
    'app.dir',
    'toolbar/dir',
    'owners/edit/dir',
    'mediaImages/edit/dir',
    'budget/list/dir',
    'attachments/edit/dir',
    'result/list/dir',
    'app.filter',
    'angular-ui-router'
], function (angular,
             appSvc, appCtrl, appCfg, appDir, appDirToolbar, appDirEditOwners, appDirEditMediaImages,
             budgetList, appDirEditAttachments, appDirListResult, appFilt) {
    'use strict';

    return angular.module('app', ['ui.router'])
        .factory(appSvc)
        .controller(appCtrl)
        .config(appCfg)
        .directive(appDir)
        //modules
        .directive(appDirToolbar)
        .directive(appDirEditOwners)
        .directive(appDirEditMediaImages)
        .directive(budgetList)
        .directive(appDirEditAttachments)
        .directive(appDirListResult)
        .filter(appFilt);
});
