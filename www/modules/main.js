/*jslint browser:true, nomen:true, vars:true */
/*global requirejs, FileReader */

requirejs.config({
    paths: {
        'jquery': '../bower_components/jquery/dist/jquery.min',
        'jquery.bootstrap': "../bower_components/bootstrap/dist/js/bootstrap.min",
        'jquery.cookie': "../bower_components/jquery-cookie/jquery.cookie",
        'underscore': '../bower_components/underscore/underscore-min',
        'moment': '../bower_components/moment/min/moment.min',
        'fullcalendar': '../bower_components/fullcalendar/dist/fullcalendar.min',
        'angular': "../bower_components/angular/angular.min",
        'angular-ui-router': "../bower_components/angular-ui-router/release/angular-ui-router.min",
        'angular-strap': "../bower_components/angular-strap/dist/angular-strap.min",
        'angular-strap-tpl': "../bower_components/angular-strap/dist/angular-strap.tpl.min",
        'socket': "/socket.io/socket.io"
    },
    shim: {
        angular: {
            deps: ['jquery'],
            exports: 'angular'
        },
        'angular-strap': ['angular'],
        'angular-strap-tpl': ['angular', 'angular-strap'],
        'angular-ui-router': ['angular'],
        'jquery.bootstrap': ['jquery'],
        'jquery.cookie': ['jquery']
    }
});

// This is the main application entry point, invoked by requirejs
// bootstraps the angularjs app with the dom
requirejs([
    'angular',
    'app',
    'angular-strap-tpl'
],
    function (angular, app) {
        'use strict';

        angular.element().ready(function () {
            angular.bootstrap(document, [app.name]);
        });
    });