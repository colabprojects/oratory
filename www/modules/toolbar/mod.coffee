define [
  'angular'
  'toolbar/dir'
], (angular, dir) ->
  angular.module('toolbar', [])
    .directive(dir)
