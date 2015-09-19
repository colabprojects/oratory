/*jslint browser:true, nomen:true, vars:true */
/*global define, FileReader */

define([], function () {
    'use strict';

    return {
        listResult: function ($state, $http) {
            return {
                restrict: 'E',
                scope: {
                    proposal: '=',
                    result: '=',
                    key: '='
                },
                templateUrl: 'modules/result/list/template.html',
                link: function (scope) {
                    scope.saveResult = function () {
                        delete scope.result.edit;
                        scope.proposal[scope.result.who] = scope.result;
                        var pushComponents = {};
                        pushComponents.uid = scope.proposal.uid;
                        pushComponents.who = scope.result.who;
                        pushComponents[scope.result.who] = scope.result;
                        pushComponents.key = scope.key;
                        $http.post('/api/proposalResult', pushComponents).then(function () {
                            $state.go('proposal/:uid/:resultee', {uid: scope.proposal.uid, resultee: ''});
                        });
                    };
                }
            };
        }
    };
});
