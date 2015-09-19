/*jslint browser:true, nomen:true, vars:true */
/*global requirejs, FileReader */

requirejs.config({
    paths: {
        'jquery': '../assets/js/jquery.min',
        'jquery.bootstrap': "../assets/dist/js/bootstrap.min",
        'jquery.cookie': "../assets/js/jquery.cookie",
        'underscore': '../assets/js/underscore.min',
        'moment': '../assets/js/moment.min',
        'ie10': "../assets/js/ie10",
        'fullcalendar': '../assets/fullcalendar/fullcalendar',
        'angular': "../assets/js/angular.min",
        'angular-ui-router': "../assets/js/angularuirouter.min",
        'angular-strap': "../assets/js/angular-strap",
        'angular-strap-tpl': "../assets/js/angular-strap.tpl",
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