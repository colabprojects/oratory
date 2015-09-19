/*jslint browser:true, nomen:true, vars:true */
/*global define, FileReader */

define(['angular', 'jquery', 'underscore', 'jquery.cookie', 'jquery.bootstrap'], function (angular, $, _) {
    'use strict';

    //cookies:
    var email = $.cookie('email');
    var token = $.cookie('token');

    return {
        //create the service for database interaction and info
        master: function ($http, $state) {
            var service = {};

            service.items = [];
            service.item = {};

            service.getDbInfo = {};
            $http.get('/api/getDbInfo').then(function (response) {
                angular.copy(response.data, service.getDbInfo);

                service.getDbInfo.getFields = function (type) {
                    var type = _(service.getDbInfo.types).findWhere({name: type});
                    return type && type.formFields;
                };
            });

            service.refreshItems = function () {
                return $http.post('/api/getItems').then(function (response) {
                    return angular.copy(response.data, service.items);
                });
            };
            //init data
            service.refreshItems();

            service.color = function (item) {
                var type = _(service.getDbInfo.types).findWhere({name: item.type});
                return type && type.color;
            };

            service.saveItem = function (itemToBeSaved, value) {
                return $http.post('/api/saveItem', {item: itemToBeSaved, unlock: value});
            };

            service.pushToItem = function (pushComponents) {
                return $http.post('/api/pushToItem', pushComponents);
            };

            service.deleteItem = function (itemToBeDeleted) {
                return $http.post('/api/deleteItem', itemToBeDeleted).success(function () {
                    return service.refreshItems().then(function () {
                        return window.history.back();
                    });
                });
            };

            //SHARED DATA
            service.sharedData = {};
            service.sharedData.filter = '';
            service.sharedData.deletedFilter = {};
            service.sharedData.showMoreDetail = {};
            if (email) { service.sharedData.email = email; }
            if (token) { service.sharedData.token = token; }
            service.sharedData.showDeleted = false;
            service.sharedData.pages = ['everything', 'inventory', 'projects', 'books', 'map', 'calendar'];

            service.sharedData.notIncluded = ['name', 'type', 'uid', 'image', 'thumb', 'need'];

            service.sharedData.attachmentTypes = ['resource', 'tool', ''];
            service.sharedData.formAttachments = [];

            service.sharedData.changePage = function (page) { $state.go(page); };

            service.sharedData.scrollTop = function () {
                $('html, body').animate({
                    scrollTop: $("#site-wrapper").offset().top
                }, 1000);
            };

            service.setItemPriorities = function () {
                var who = service.sharedData.email;
                var what = $state.current.name;
                if (what === 'projects') { what = 'project'; }
                var priorityOfWhat = _.filter(service.items, function (item) { return item.type === what && item.priority; });

                _(priorityOfWhat).each(function (item) {
                    if (!item.priorityByEmail) { item.priorityByEmail = {}; }
                    var theP = _.find(item.priority, function (p) { return p.email === who; });
                    item.priorityByEmail[what] = (theP && theP.value) || 0;
                });
            };

            return service;
        }
    };
});
