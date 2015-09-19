/*jslint browser:true, nomen:true, vars:true */
/*global define, FileReader */

define(['underscore', 'jquery'], function (_, $) {
    'use strict';

    return {
        listBudget: function (master) {
            return {
                restrict: 'E',
                scope: {
                    budget: '=',
                    item: '=',
                    editBudget: '='
                },
                templateUrl: 'modules/budget/list/template.html',
                link: function (scope) {
                    scope.dbInfo = master.getDbInfo;
                    scope.sharedData = master.sharedData;
                    if (!scope.budget) {
                        scope.budget = {};
                    }
                    scope.budget.total = 0;

                    scope.newLine = {};

                    if (scope.editBudget) {
                        if (!scope.budget) {
                            scope.budget = {};
                            scope.budget.lines = [];
                            if (scope.item.attachments) {
                                //loop throught and add
                                _(scope.item.attachments).each(function (uid) {
                                    var attachment = _(master.items).findWhere({uid: uid});
                                    if (attachment.need === 'want') {
                                        scope.budget.lines.push({name: attachment.name, price: attachment.price});
                                    }
                                });
                            }
                        }
                    }

                    scope.getTotal = function () {
                        var total = 0;
                        if (!scope.budget.lines) {
                            scope.budget.lines = [];
                        }
                        _.forEach(scope.budget.lines, function (line) {
                            if ($.isNumeric(line.price)) {
                                total = total + Number(line.price);
                            }
                        });
                        scope.budget.total = total;
                    };
                    scope.getTotal();

                    scope.isNumber = function () {
                        if (!$.isNumeric(scope.newLine.price)) {
                            scope.newLine.price = 0;
                        }
                    };

                    scope.saveBudget = function () {
                        scope.item.budget = scope.budget;
                        master.saveItem(scope.item);
                        scope.$emit('closeBudget');
                    };

                    scope.addLine = function () {
                        scope.budget.lines.push(scope.newLine);
                        scope.getTotal();
                        scope.newLine = {};
                    };

                    scope.removeLine = function (index) {
                        scope.budget.lines.splice(index, 1);
                        scope.getTotal();
                    };
                }
            };
        }
    };
});
