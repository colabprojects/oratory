/*jslint browser:true, nomen:true, vars:true */
/*global define, FileReader */

define([], function () {
    'use strict';

    return {
        editAttachment: function (master) {
            return {
                restrict: 'E',
                scope: {
                    attachment: '=',
                    editAttachment: '='
                },
                templateUrl: 'modules/attachments/edit/template.html',
                link: function (scope) {
                    scope.colors = master.color(scope.attachment);
                }
            };
        }
    };
});
