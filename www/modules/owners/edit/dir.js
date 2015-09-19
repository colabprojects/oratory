define([], function () {
    'use strict';

    return {
        ownerForm: function (master) {
            return {
                restrict: 'E',
                scope: {
                    item: '='
                },
                templateUrl: 'modules/owners/edit/template.html',
                link: function (scope) {

                    scope.addOwner = function (newOwner) {
                        scope.item.owners.push(newOwner);
                        master.saveItem(scope.item);
                    };

                }
            };
        }
    };
});
