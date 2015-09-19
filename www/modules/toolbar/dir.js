define(['angular', 'moment', 'socket', 'jquery', 'underscore'], function (angular, moment, io, $, _) {
    'use strict';

    var socket = io();

    return {
        itemToolbar: function ($http, master) {
            return {
                restrict: 'E',
                scope: {
                    item: '=',
                    isOwner: '='
                },
                templateUrl: 'modules/toolbar/template.html',
                link: function (scope) {
                    scope.sharedData = master.sharedData;
                    scope.colors = master.color(scope.item);
                    scope.deleteItem = master.deleteItem;

                    scope.proposal = {};

                    scope.listEvents = _(master.items).filter({type: 'event'});

                    scope.listProjectsAll = _(master.items).filter({type: 'project'});
                    scope.listProjects = _(scope.listProjectsAll).map(function (project) {
                        if (project.uid !== scope.item.uid) {
                            return project;
                        }
                    });

                    scope.goBack = function () {
                        window.history.back();
                    };

                    scope.addMediaImageClick = function () {
                        scope.addMediaImage = !scope.addMediaImage;
                    };

                    scope.addMediaImageSave = function (media) {
                        if (media) {
                            if (!scope.item.media) {
                                scope.item.media = [];
                            }
                            scope.item.media.push({'rawImage': media});
                            master.saveItem(scope.item);
                            scope.addMediaImage = false;
                            scope.mediaImageToAdd = '';
                        }
                    };

                    scope.addOwnerClick = function () {
                        scope.addOwners = !scope.addOwners;
                    };

                    scope.addPlanClick = function () {
                        scope.addPlan = !scope.addPlan;
                    };
                    scope.$on('closePlan', function () {
                        scope.addPlan = false;
                    });

                    scope.addBudgetClick = function () {
                        scope.addBudget = !scope.addBudget;
                    };

                    scope.$on('closeBudget', function () {
                        scope.addBudget = false;
                    });

                    scope.addEventClick = function () {
                        scope.addEvent = !scope.addEvent;
                    };

                    scope.addProposalClick = function () {
                        scope.addProposal = !scope.addProposal;
                        scope.proposal = {};
                        scope.proposal.forUID = scope.item.uid;
                        scope.proposal.date = moment().format();
                        scope.proposal.type = 'proposal';
                    };

                    scope.addEvent = function (uid) {
                        if (!scope.item.events) {
                            scope.item.events = [];
                        }
                        scope.item.events.push(uid);
                        master.saveItem(scope.item);
                        scope.addEvent = false;
                    };

                    scope.createProposal = function () {
                        $http.post('/api/saveProposal', scope.proposal).then(function (response) {
                            //set the id in the callback - new api for new proposal
                            master.pushToItem({uid: scope.item.uid, proposal: response.data, approval: false});

                        });
                        scope.addProposal = false;

                    };

                    scope.addToProject = function (theUID) {
                        var parent = _(master.items).findWhere({uid: theUID});
                        if (!parent.attachments) {
                            parent.attachments = [];
                        }
                        parent.attachments.push(scope.item.uid);

                        master.pushToItem(_(parent).pick(['uid', 'attachments']));
                    };

                }
            };
        },
    };
});
