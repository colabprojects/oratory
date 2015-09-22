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
                    scope.toggle={};
                    scope.proposal={};
                    scope.editorTypes = ["Owners","Media","Plan","Events","Budget","Proposals"];


                    scope.proposal = {};

                    scope.listEvents = _(master.items).filter({type: 'event'});

                    scope.listProjectsAll = _(master.items).filter({type: 'project'});
                    scope.listProjects = _(scope.listProjectsAll).map(function (project) {
                        if (project.uid !== scope.item.uid) {
                            return project;
                        }
                    });

                    scope.toggler = function(editor) {
                        console.log(scope.editorTypes);
                        console.log(editor);
                        scope.toggle[editor]=true;
                    };
                    scope.clearToggle = function () {
                        scope.toggle = {};
                        scope.editorOption="";
                    };

                    scope.goBack = function () {
                        window.history.back();
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

                    scope.createProposal = function () {
                        scope.proposal.forUID = scope.item.uid;
                        scope.proposal.date = moment().format();
                        scope.proposal.type = 'proposal';
                        $http.post('/api/saveProposal', scope.proposal).then(function (response) {
                            //set the id in the callback - new api for new proposal
                            master.pushToItem({uid: scope.item.uid, proposal: response.data, approval: false});

                        });

                        scope.addProposal = false;

                    }; 
                }
            };
        },
    };
});