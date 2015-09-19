/*jslint browser:true, nomen:true, vars:true */
/*global define, FileReader */

define(['angular', 'moment', 'socket', 'jquery', 'underscore'], function (angular, moment, io, $, _) {
    'use strict';

    var socket = io();

    return {
        //accepts a field array (of objects with a name and type)
        formElement: function () {
            return {
                restrict: 'E',
                scope: {
                    field: '=',
                    formItem: '=',
                    form: '='
                },
                template: '<div ng-include="templateUrl"></div>',
                link: function (scope) {
                    if (scope.field.type === 'text') {
                        scope.templateUrl = 'html/formElement_text.html';
                        if ((scope.field.default) && (scope.formItem[!scope.field.name])) {
                            scope.formItem[scope.field.name] = scope.field.default;
                        }
                    }
                    if (scope.field.type === 'textarea') {
                        scope.templateUrl = 'html/formElement_textarea.html';
                    }
                    if (scope.field.type === 'url') {
                        scope.templateUrl = 'html/formElement_URL.html';
                    }
                    if (scope.field.type === 'image-search') {
                        scope.templateUrl = 'html/formElement_image_search.html';
                    }
                    if (scope.field.type === 'radio') {
                        scope.templateUrl = 'html/formElement_radio.html';
                        //defaults
                        if ((scope.field.default) && (scope.formItem[!scope.field.name])) {
                            scope.formItem[scope.field.name] = scope.field.default;
                        }
                    }
                }
            };
        },

        insertForm: function (master, $http) {
            return {
                restrict: 'E',
                scope: {
                    formItem: '=',
                    isOwner: '=',
                    typeLock: '='
                },
                templateUrl: 'html/insertForm.html',
                link: function (scope) {
                    //db defaults for form
                    scope.dbInfo = master.getDbInfo;
                    scope.sharedData = master.sharedData;

                    //setup form item
                    if (!scope.formItem) {
                        scope.formItem = {};
                        scope.formItem.name = scope.filter;
                    }

                    if (scope.formItem.type !== 'deleted') {
                        scope.dbInfo.formTypes = _.without(scope.dbInfo.types, _.findWhere(scope.dbInfo.types, {name: 'deleted'}));
                    } else {
                        scope.dbInfo.formTypes = scope.dbInfo.types;
                    }

                    //init attachments
                    scope.formAttachments = {};

                    scope.$on('cancelCustom', function () {
                        scope.showCustom = false;
                    });
                    scope.$on('newUrl', function (event, url) {
                        scope.formItem.imageURL = url;
                    });

                    scope.saveItem = function (itemToBeAdded) {
                        //validate and add
                        if (scope.form.$valid) {
                            if (!itemToBeAdded.createdBy) {
                                itemToBeAdded.createdBy = scope.sharedData.email;
                            } else {
                                itemToBeAdded.editedBy = scope.sharedData.email;
                            }

                            master.saveItem(itemToBeAdded, true);
                            master.sharedData.filter = '';
                            scope.cancelForm();
                        }
                    };

                    scope.stageItemChanges = function (item) {
                        if (scope.form.$valid) {
                            item.proposedBy = scope.sharedData.email;
                            $http.post('/api/stageItemChanges', item).then(function () {
                                scope.cancelForm();
                            });
                        }
                    };

                    scope.cancelForm = function (item) {
                        if (item) {
                            //need to remove lock
                            $http.post('/api/removeLock', {
                                uid: item.uid,
                                email: master.sharedData.email
                            }).then(function (res) {
                                _(master.items).findWhere({uid: res.data.uid}).lock = false;
                            });
                        }
                        scope.$emit('cancelForm');
                        scope.formItem = {};
                    };
                    scope.cancelCustom = function () {
                        scope.$emit('cancelCustom');
                    };
                }
            };
        },

        customizeForm: function (master) {
            return {
                restrict: 'E',
                scope: {
                    type: '='
                },
                templateUrl: 'html/customizeForm.html',
                link: function (scope) {
                    //db defaults for form
                    scope.dbInfo = master.getDbInfo;

                    scope.addCustomElement = function () {
                        if (scope.formCustom.$valid) {
                            _(master.getDbInfo.types).findWhere({name: scope.type}).formFields.push({
                                name: scope.formAdd.name,
                                type: scope.formAdd.type
                            });
                            scope.$emit('cancelCustom');
                        }
                    };
                }
            };
        },

        listAttachments: function (master) {
            return {
                restrict: 'E',
                scope: {
                    formItem: '=',
                    editAttachment: '=',
                    attachmentFilter: '='
                },
                templateUrl: 'html/listAttachments.html',
                link: function (scope) {
                    //db defaults for form
                    scope.dbInfo = master.getDbInfo;
                    if (!scope.formItem.attachments) {
                        scope.formItem.attachments = [];
                    }

                    scope.getAttachables = function () {
                        return _.chain(master.items)
                            .filter(function (item) {
                                return item.type === 'tool' || item.type === 'resource';
                            })
                            .map(function (item) {
                                return angular.copy(item);
                            }).value();
                    };

                    scope.items = scope.getAttachables();

                    scope.attachmentTypes = master.sharedData.attachmentTypes;

                    var initAttachments = function () {
                        _(scope.items).each(function (item) {
                            item.checked = item.wasChecked = _(scope.formItem.attachments).find(function (attachment) {
                                return attachment === item.uid;
                            }) ? true : false;

                        });
                    };

                    initAttachments();

                    scope.addAttachments = function () {
                        //update the scoped item
                        scope.formItem.attachments = _.chain(scope.items)
                            .filter(function (item) {
                                return item.checked;
                            })
                            .map(function (item) {

                                return item.uid;

                            }).value();
                        initAttachments();
                        master.pushToItem(_(scope.formItem).pick(['uid', 'attachments']));
                    };


                    //scope.newItemAsAttachment = function(){

                    //master.saveItem({name:scope.textFilter, createdBy:master.sharedData.email, type:scope.attachmentType}).then(function(res){
                    //var all = scope.getAttachables();
                    // var newOnes = [];
                    // var current = _(scope.items).map(function(theOne){ return theOne.uid; });
                    // _.filter(all, function(theOne){ if(itdoesntmatch) { newOnes.push(theOne) });
                    // _.forEach(newOnes, function(newOne){
                    //   newOne.newItem = true;
                    //   scope.items.push(newOne);
                    // })
                    // initAttachments();

                    //scope.attachmentType = 'choose one';
                    //scope.textFilter = '';

                    //scope.$apply();

                    //});
                    //};

                }
            };
        },

        imageSearch: function ($http) {
            return {
                restrict: 'E',
                scope: {
                    searchTerm: '='
                },
                templateUrl: 'html/imageSearch.html',
                link: function (scope) {

                    scope.results = [];
                    var url = 'https://ajax.googleapis.com/ajax/services/search/images?v=1.0&safe=active&callback=JSON_CALLBACK&q=';

                    scope.$watch('searchTerm', function (searchTerm) {
                        $http.jsonp(url + searchTerm).then(function (response) {
                            scope.results = response.data.responseData.results;
                        });
                    });

                    scope.setImageUrl = function (url, index) {
                        scope.$emit('newUrl', url);
                        $('.active-result').removeClass('active-result');
                        $('#result-' + index).addClass('active-result');
                    };
                }
            };
        },

        itemPriority: function ($http, master) {
            return {
                restrict: 'E',
                scope: {
                    item: '=',
                    type: '='
                },
                templateUrl: 'html/itemPriority.html',
                link: function (scope) {
                    scope.sharedData = master.sharedData;
                    scope.changePriority = function (how) {
                        var temp = _.findWhere(scope.item.priority, {email: scope.sharedData.email});
                        var userPriority = temp ? temp.value : 0;

                        $http.post('/api/setPriority', {
                            uid: scope.item.uid,
                            email: scope.sharedData.email,
                            value: (userPriority === how) ? 0 : how
                        });
                    };
                }
            };
        },

        listItem: function ($http, master) {
            return {
                restrict: 'E',
                scope: {
                    item: '=',
                    page: '=',
                    priority: '='
                },
                templateUrl: 'html/listItem.html',
                link: function (scope) {
                    scope.showMoreDetail = {};
                    scope.sharedData = master.sharedData;
                    scope.colors = master.color(scope.item);


                    if (scope.page === 'view') {
                        scope.showMoreDetail[scope.item.uid] = true;
                    }

                    scope.$watch('item.imageURL', function (url) {
                        scope.editThumb = url;
                    });

                    scope.pickLock = function (itemToPick) {
                        $http.post('/api/pickLock', {
                            uid: itemToPick.uid,
                            email: master.sharedData.email
                        }).then(function (res) {
                            scope.showOptions(res.data.uid);
                            _(master.items).findWhere({uid: res.data.uid}).lock = false;
                        });
                    };

                    scope.showOptions = function (uid) {
                        if ($('#push-wrapper-' + uid).hasClass('show-more')) {
                            // Do things on Nav Close
                            $('#push-wrapper-' + uid).removeClass('show-more');
                        } else {
                            // Do things on Nav Open
                            $('#push-wrapper-' + uid).addClass('show-more');
                        }

                    };

                    scope.showMoreDetails = function (uid) {
                        scope.sharedData.showMoreDetail[uid] = !scope.sharedData.showMoreDetail[uid];

                    };
                }
            };
        },

        itemDetail: function ($http, master) {
            return {
                restrict: 'E',
                scope: {
                    item: '='
                },
                templateUrl: 'html/itemDetail.html',
                link: function (scope) {
                    scope.showRaw = {};
                    scope.colors = master.color(scope.item);

                    scope.findAttachment = function (theUID) {
                        return _(master.items).findWhere({uid: theUID});
                    };

                    var gatherAttachments = function (attachments) {
                        scope.haves = [];
                        scope.wants = [];
                        scope.others = [];
                        _(attachments).each(function (uid) {
                            var item = scope.findAttachment(uid);
                            if (item.need === 'have') {
                                scope.haves.push(item);
                            } else if (item.need === 'want') {
                                scope.wants.push(item);
                            } else {
                                if (item.type !== 'project') {
                                    scope.others.push(item);
                                }
                            }
                        });
                    };

                    scope.$watch('item.attachments', function (newValue) {
                        gatherAttachments(newValue);
                    });

                    scope.addComment = function (item) {
                        $http.post('/api/addComment', {
                            uid: item.uid,
                            email: master.sharedData.email,
                            comment: scope.comment
                        }).then(function () {
                            scope.comment = '';
                        });
                    };


                }
            };
        },

        itemProposedChanges: function () {
            return {
                restrict: 'E',
                scope: {
                    item: '=',
                    allChanges: '=',
                    isOwner: '='
                },
                templateUrl: 'html/itemProposedChanges.html'
            };
        },

        itemChange: function ($http, master) {
            return {
                restrict: 'E',
                scope: {
                    original: '=',
                    changed: '=',
                    key: '=',
                    isOwner: '='
                },
                templateUrl: 'html/itemChange.html',
                link: function (scope) {
                    scope.changedFields = [];
                    scope.item = master.item;
                    scope.sharedData = master.sharedData;

                    socket.on('decisionChange', function (staged) {
                        angular.copy(staged.changes, scope.changed);
                    });


                    scope.mergeChange = function (field, value, yesno) {
                        if (field === 'thumb') {
                            //special image handling
                            scope.item.thumb = value;
                            scope.item.image = scope.changed.image;
                            scope.item.imageURL = scope.changed.imageURL;
                        } else {
                            //standard update
                            scope.item[field] = value;
                        }

                        //change decision
                        //(key, email, field, decision)
                        var decisionObj = {};
                        decisionObj.key = scope.key;
                        decisionObj.email = scope.sharedData.email;
                        decisionObj.field = field;
                        decisionObj.decision = yesno;
                        decisionObj.item = scope.item;

                        $http.post('/api/decision', decisionObj);
                    };
                }
            };
        },


        showComment: function (master) {
            return {
                restrict: 'E',
                scope: {
                    comment: '=',
                    item: '='
                },
                templateUrl: 'html/showComment.html',
                link: function (scope) {
                    scope.sharedData = master.sharedData;

                    scope.timeFromNow = moment(scope.comment.time).fromNow();

                    scope.removeComment = function (thisOne) {
                        if (scope.sharedData.email === scope.comment.by) {
                            scope.item.comments.splice(scope.item.comments.indexOf(thisOne), 1);
                            master.pushToItem({uid: scope.item.uid, comments: scope.item.comments});
                        }
                    };
                }
            };
        },

        addPlanForm: function (master) {
            return {
                restrict: 'E',
                scope: {
                    item: '=',
                    plan: '='
                },
                templateUrl: 'html/addPlanForm.html',
                link: function (scope) {
                    scope.dbInfo = master.getDbInfo;
                    scope.sharedData = master.sharedData;
                    if (scope.plan) {
                        scope.formPlan = scope.plan;
                    } else {
                        scope.formPlan = {};
                        scope.formPlan.type = 'plan';
                    }

                    //this should be able to take an argument for whether or not it updates the plan or creates a sibling
                    scope.savePlan = function (assign) {

                        if (scope.formPlan.steps) {

                            if (assign) {
                                //add step to item attachments
                                if (!scope.item.attachments) {
                                    scope.item.attachments = [];
                                }
                                _(scope.formPlan.steps).each(function (step) {
                                    if (step.uid) {
                                        scope.item.attachments.push(step.uid);
                                    }
                                });

                                scope.item.plan = scope.formPlan;
                            }
                            master.pushToItem(_(scope.item).pick(['uid', 'plan', 'attachments']));
                            scope.$emit('closePlan');
                        }
                    };

                }
            };
        },

        addStep: function (master) {
            return {
                restrict: 'E',
                scope: {
                    item: '=',
                    plan: '='
                },
                templateUrl: 'html/addStep.html',
                link: function (scope) {
                    scope.dbInfo = master.getDbInfo;
                    scope.sharedData = master.sharedData;
                    scope.color = master.color;
                    scope.items = master.items;


                    scope.addTextAsStep = function () {
                        if (!scope.plan.steps) {
                            scope.plan.steps = [];
                        }
                        scope.plan.steps.push({text: scope.stepSearch});
                        scope.stepSearch = '';
                    };

                    scope.addItemAsStep = function (uid) {
                        if (!scope.plan.steps) {
                            scope.plan.steps = [];
                        }
                        scope.plan.steps.push({uid: uid});
                    };

                }
            };
        },

        listSteps: function (master) {
            return {
                restrict: 'E',
                scope: {
                    plan: '=',
                    item: '=',
                    editSteps: '='
                },
                templateUrl: 'html/listSteps.html',
                link: function (scope) {
                    scope.dbInfo = master.getDbInfo;
                    scope.sharedData = master.sharedData;

                    scope.removeStep = function (index) {
                        var step = scope.plan.steps[index];
                        if (step.uid) {
                            scope.item.attachments = _.without(scope.item.attachments, step.uid);
                        }
                        scope.plan.steps.splice(index, 1);
                    };

                    scope.moveStep = function (from, to) {
                        var step = scope.plan.steps[from];
                        scope.plan.steps.splice(from, 1);
                        scope.plan.steps.splice(to, 0, step);
                    };


                }
            };
        },

        listStep: function (master) {
            return {
                restrict: 'E',
                scope: {
                    step: '='
                },
                templateUrl: 'html/listStep.html',
                link: function (scope) {
                    scope.dbInfo = master.getDbInfo;
                    scope.sharedData = master.sharedData;

                    if (scope.step.uid) {
                        scope.getItem = _(master.items).findWhere({uid: scope.step.uid});
                        scope.color = master.color(scope.getItem);
                    }


                }
            };
        }

    };
});
