/*jslint browser:true, nomen:true, vars:true */
/*global define, FileReader */

define(['angular', 'socket', 'jquery', 'underscore'], function (angular, io, $, _) {
    'use strict';

    var socket = io();

    return {
        appCtrl: function ($scope, $http, $state, master) {
            $scope.dbInfo = master.getDbInfo;
            $scope.items = master.items;
            $scope.sharedData = master.sharedData;
            $scope.sharedData.options = false;

            $scope.$on('$stateChangeSuccess', function (event, toState, toParam, fromState, fromParam) {
                $scope.page = toState.name;

                if ((fromState.name === 'edit')) {
                    //remove lock if someone hits "back"
                    var lockedItem = _($scope.items).findWhere({uid: fromParam.uid});
                    if (lockedItem.lock) {
                        //lock is true and have to remove
                        if (toParam.chain !== 'true') {
                            //not chaining items
                            $http.post('/api/removeLock', {uid: lockedItem.uid, email: master.sharedData.email}).then(function () {
                                lockedItem.lock = false;
                            });
                        }
                    }
                }

            });

            $scope.$watch('sharedData.email', function () {
                master.setItemPriorities();
            });

            $scope.showOptions = function () {
                $scope.sharedData.options = !$scope.sharedData.options;
            };

            $scope.addFilter = function (type) {
                if (_($scope.sharedData.typeFilter).contains(type)) {
                    $scope.sharedData.typeFilter = _($scope.sharedData.typeFilter).without(type);
                } else { $scope.sharedData.typeFilter.push(type); }
            };

            $scope.typeFilterText = function () {
                if (!$scope.sharedData.typeFilter.length) { return ''; }
                return 'searching ' + $scope.sharedData.typeFilter.join(', ');
            };

            $scope.filterSelected = function (name) {
                return {
                    selectedFilter: _($scope.sharedData.typeFilter).contains(name)
                };
            };

            $scope.addNew = function () {
                $state.go('new');
            };

            $scope.removeUser = function () {
                $.cookie('email', '');
                $.cookie('token', '');
                master.sharedData.email = '';
                master.sharedData.token = '';
                $state.go('auth');
            };

            $scope.$on('cancelForm', function () {
                window.history.back();
            });

            socket.on('new', function (item) {
                $('#socket-messages').append('<p>new item! ' + item.name + ' was added by ' + item.createdBy + '...</p>');
                master.items.push(item);
                $scope.$digest();
            });

            socket.on('newProposal', function () {
                $('#socket-messages').append('<p>new proposal was added...</p>');
            });

            socket.on('update', function (item) {
                angular.copy(item, _(master.items).findWhere({uid: item.uid}));
                if (item.uid === master.item.uid) { angular.copy(item, master.item); }
                $scope.$digest();
            });

            socket.on('lockChange', function (item) {
                _(master.items).findWhere({uid: item.uid}).lock = item.lock;
                if (item.uid === master.item.uid) { angular.copy(item, master.item); }
                $scope.$digest();
            });

            socket.on('priorityChange', function (item) {
                angular.copy(item, _(master.items).findWhere({uid: item.uid}));
                master.setItemPriorities();
                $scope.$digest();
            });

            socket.on('comment', function (item) {
                angular.copy(item, _(master.items).findWhere({uid: item.uid}));
                if (item.uid === master.item.uid) { angular.copy(item, master.item); }
                master.setItemPriorities();
                $scope.$digest();
            });

            socket.on('proposedChange', function (forUID) {
                _(master.items).findWhere({uid: forUID}).proposedChanges = true;
                $scope.$digest();
            });

        }
    };
});
