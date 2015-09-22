/*jslint browser:true, nomen:true, vars:true */
/*global define, FileReader */

define([], function () {
    'use strict';

    return {
        regex: function () {
            return function (input, field, regex) {
                var patt = new RegExp(regex);
                var out = [];
                var i;
                for (i = 0; i < input.length; i++) {
                    if (patt.test(input[i][field])) {
                        out.push(input[i]);
                    }
                }
                return out;
            };
        }
    };
});
