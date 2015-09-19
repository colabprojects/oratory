/*jslint browser:true, nomen:true, vars:true */
/*global define, FileReader */

define([], function () {
    'use strict';


        return {
            editMediaImageForm: function () {
                return {
                    restrict: 'E',
                    scope: {
                        mediaImage: '='
                    },
                    templateUrl: 'modules/mediaImages/edit/template.html',
                    link: function (scope, element) {
                        var takePicture = element.find(".take-picture");
                        var showPicture = element.find(".show-picture");

                        if (takePicture && showPicture) {
                            // Set events
                            takePicture.on('change', function (event) {

                                // Get a reference to the taken picture or chosen file
                                var files = event.target.files;
                                var file;
                                if (files && files.length > 0) {
                                    file = files[0];

                                    try {
                                        var fileReader = new FileReader();
                                        fileReader.onload = function (event) {
                                            scope.mediaImage = event.target.result;
                                            scope.$digest();
                                        };
                                        fileReader.readAsDataURL(file);
                                    } catch (e) {
                                        // Display error message
                                        scope.errorMsg = 'nothing is supported';
                                    }
                                }

                            });//END take picture 'on' event
                        }


                    }//link
                };
        }
    };
});
