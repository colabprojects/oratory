/*jslint browser:true, nomen:true, vars:true */
/*global define, FileReader */

define(['angular', 'moment', 'jquery', 'underscore'], function (angular, moment, $, _) {
    'use strict';

    return ['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('auth', {
                url: '/auth/:key',
                templateUrl: 'html/auth.html',
                controller: function ($scope, $state, $stateParams, master) {
                    $scope.email = master.sharedData.email;

                    if ($stateParams.key) {
                        $scope.token = $stateParams.key;
                        $scope.key = $stateParams.key;
                    } else {
                        $scope.token = master.sharedData.token;
                    }

                    $scope.authUser = function () {
                        //DEV

                        master.sharedData.email = $scope.email;
                        $.cookie('email', $scope.email);
                        master.sharedData.token = '123';
                        $.cookie('token', '123');
                        $state.go('everything');


                        //PRODUCTION
                        /*
                         master.sharedData.email=$scope.email;
                         $.cookie('email', $scope.email);
                         master.sharedData.token=$scope.token;
                         $.cookie('token', $scope.token);

                         if ($scope.key) {
                         $state.go('everything');
                         }
                         else{
                         $http.post('/api/authGen', {email:$scope.email}).then(function (response){
                         //window.close();
                         $('#sentanddone').html('<h3>please close this window and check your email</h3>');
                         });
                         }
                         */

                    };

                }
            })
            .state('everything', {
                url: '/',
                templateUrl: 'html/defaultView.html',
                resolve: {
                    auth: function ($http, master) {
                        return $http.post('/api/auth', {email: master.sharedData.email, token: master.sharedData.token}).then(function (response) {
                            return response.data;
                        });
                    }
                },
                controller: function ($scope, $state, master, auth) {
                    if (auth === 'false') { $state.go('auth'); }
                    $scope.sharedData = master.sharedData;
                    $scope.sharedData.pageFilter = '';
                    $scope.sharedData.orderBy = '-edited';
                    $scope.sharedData.viewFilter = '';
                }
            })
            .state('inventory', {
                url: '/inventory',
                templateUrl: 'html/defaultView.html',
                resolve: {
                    auth: function ($http, master) {
                        return $http.post('/api/auth', {email: master.sharedData.email, token: master.sharedData.token}).then(function (response) {
                            return response.data;
                        });
                    }
                },
                controller: function ($scope, $state, auth, master) {
                    if (auth === 'false') { $state.go('auth'); }
                    $scope.sharedData = master.sharedData;
                    $scope.sharedData.pageFilter = function (item) {
                        return item.type === 'tool' || item.type === 'resource' || item.oldType === 'tool' || item.oldType === 'resource';
                    };
                    $scope.sharedData.viewFilter = '';
                }
            })
            .state('projects', {
                url: '/projects',
                templateUrl: 'html/defaultView.html',
                resolve: {
                    auth: function ($http, master) {
                        return $http.post('/api/auth', {email: master.sharedData.email, token: master.sharedData.token}).then(function (response) {
                            return response.data;
                        });
                    }
                },
                controller: function ($scope, $state, auth, master) {
                    if (auth === 'false') { $state.go('auth'); }
                    $scope.sharedData = master.sharedData;
                    $scope.sharedData.orderBy = '-totalPriority';
                    master.setItemPriorities($scope.sharedData.email, 'project');
                    $scope.sharedData.pageFilter = function (item) {
                        return item.type === 'project' || item.oldType === 'project';
                    };
                    $scope.sharedData.viewFilter = '';
                }
            })
            .state('books', {
                url: '/books',
                templateUrl: 'html/defaultView.html',
                resolve: {
                    auth: function ($http, master) {
                        return $http.post('/api/auth', {email: master.sharedData.email, token: master.sharedData.token}).then(function (response) {
                            return response.data;
                        });
                    }
                },
                controller: function ($scope, $state, auth, master) {
                    if (auth === 'false') { $state.go('auth'); }
                    $scope.sharedData = master.sharedData;
                    $scope.sharedData.pageFilter = function (item) {
                        return item.type === 'book' || item.oldType === 'book';
                    };
                    $scope.sharedData.viewFilter = '';
                }
            })
            // .state('map', {
            //   url: '/map',
            //   templateUrl:'html/mapView.html',
            //   resolve:{
            //     auth: function ($http, master) {
            //       return $http.post('/api/auth', {email:master.sharedData.email,token:master.sharedData.token}).then(function (response){
            //         return response.data;
            //       });
            //     }
            //   },
            //   controller: function ($scope, $state, auth, master) {
            //     if (auth==='false') { $state.go('auth'); }
            //     $scope.sharedData=master.sharedData;
            //     $scope.insertMap = function() {
            //       new GMaps({
            //         div: '#insert-map',
            //         lat: 0,
            //         lng: -0
            //         //mapTypeId: google.maps.MapTypeId.SATELLITE
            //       });
            //     };
            //     $scope.insertMap();
            //   }
            // })
            .state('calendar', {
                url: '/calendar',
                resolve: {
                    auth: function ($http, master) {
                        return $http.post('/api/auth', {email: master.sharedData.email, token: master.sharedData.token}).then(function (response) {
                            return response.data;
                        });
                    },
                    allEvents: function ($http) {
                        return $http.post('/api/getItems', {type: 'event'}).then(function (response) {
                            return response.data;
                        });
                    }
                },
                templateUrl: 'html/calendarView.html',
                controller: function ($scope, $state, allEvents, auth, master) {
                    if (auth === 'false') { $state.go('auth'); }
                    $scope.insertCalendar = function () {
                        $scope.sharedData = master.sharedData;
                        $('#insert-calendar').fullCalendar({
                            //settings
                            events: allEvents
                        });
                        //something about the scope.... this is my workaround:
                        setTimeout(function () { $('#insert-calendar').fullCalendar('render'); }, 100);
                    };
                    $scope.insertCalendar();
                }
            })
            .state('edit', {
                url: '/edit/:uid/:chain',
                resolve: {
                    itemToBeEdit: function ($http, $stateParams, master) {
                        return $http.post('/api/requestLock', {uid: $stateParams.uid, email: master.sharedData.email}).then(function (response) {
                            return response.data;
                        });
                    },
                    allChanges: function ($http, $stateParams, master) {
                        return $http.post('/api/getItems', {type: 'staged', forUID: $stateParams.uid, forOwner: master.sharedData.email}).then(function (response) {
                            return response.data;
                        });
                    },
                    auth: function ($http, master) {
                        return $http.post('/api/auth', {email: master.sharedData.email, token: master.sharedData.token}).then(function (response) {
                            return response.data;
                        });
                    }
                },
                templateUrl: 'html/editView.html',
                controller: function ($scope, $state, $stateParams, itemToBeEdit, allChanges, auth, master) {
                    if (auth === 'false') { $state.go('auth'); }
                    $scope.sharedData = master.sharedData;
                    master.item = $scope.item=itemToBeEdit;
                    $scope.page = $state.current.name;
                    $scope.sharedData.showMoreDetail[$stateParams.uid] = true;
                    $scope.allChanges = _(allChanges).where({forUID: $stateParams.uid});

                    //check if owner if not - propose changes only
                    $scope.isOwner = false;
                    if (_.contains($scope.item.owners, $scope.sharedData.email)) {
                        $scope.isOwner = true;
                    }
                }
            })
            .state('new', {
                url: '/new',
                templateUrl: 'html/newView.html',
                resolve: {
                    auth: function ($http, master) {
                        return $http.post('/api/auth', {email: master.sharedData.email, token: master.sharedData.token}).then(function (response) {
                            return response.data;
                        });
                    }
                },
                controller: function ($scope, $state, master, auth) {
                    if (auth === 'false') { $state.go('auth'); }
                    $scope.sharedData = master.sharedData;
                    $scope.page = $state.current.name;
                    $scope.item = {};
                }
            })
            .state('view', {
                url: '/view/:uid',
                resolve: {
                    itemToBeView: function ($http, $stateParams) {
                        return $http.post('/api/getItem', {uid: $stateParams.uid}).then(function (response) {
                            return response.data;
                        });
                    }
                },
                templateUrl: 'html/viewView.html',
                controller: function ($scope, $stateParams, $http, itemToBeView, master) {
                    $scope.sharedData = master.sharedData;
                    $scope.sharedData.showMoreDetail[$stateParams.uid] = true;
                    master.item = $scope.item=itemToBeView;

                    $scope.getHistory = function () {
                        $scope.history = [];
                        $http.post('/api/getItemHistory', {uid: $stateParams.uid}).then(function (response) {
                            _.map(response.data, function (item) { $scope.history.push(item.historyItem); });
                        });
                    };
                }
            }).
            state('proposal', {
                url: '/proposal/:uid/:resultee',
                resolve: {
                    proposalToBeView: function ($http, $stateParams) {
                        return $http.post('/api/getItem', {uid: $stateParams.uid}).then(function (response) {
                            return response.data;
                        });
                    },
                    items: function ($http) {
                        return $http.post('/api/getItems').then(function (response) {
                            return response.data;
                        });
                    }
                },
                templateUrl: 'html/proposalView.html',
                controller: function ($scope, $stateParams, $http, proposalToBeView, items, master) {
                    $scope.sharedData = master.sharedData;
                    $scope.proposal = proposalToBeView;
                    $scope.proposal.date = moment($scope.proposal.date).calendar();
                    $scope.sharedData.showMoreDetail[$scope.proposal.forUID] = false;
                    $scope.key = $stateParams.resultee;
                    $scope.sharedData.scrollTop();

                    //get item
                    master.items = items;

                    $scope.item = _(master.items).findWhere({uid: $scope.proposal.forUID});

                    $scope.viewCopy = 'http://colablife.info/#/view/' + $scope.item.uid;

                    //get results
                    var copy = {};
                    angular.copy($scope.proposal, copy);
                    $scope.results = _.omit(copy, ['_id', 'uid', 'edited', 'forUID', 'date', 'type', 'description']);

                    if ($stateParams.resultee) {
                        //who
                        $http.post('/api/checkResultee', {key: $stateParams.resultee, uid: $scope.proposal.uid}).then(function (response) {
                            //who comes back and set edit to true.
                            if (response.data) {
                                $scope.results[response.data].edit = true;
                            }
                        });
                    }

                    //push to item proposal[name] result object

                }
            });

        $urlRouterProvider.otherwise('/');

    }];
});
