define [
  'angular'
  'editOwners/dir'
], (angular, dir) ->
  angular.module('editOwners', [])
    .directive(dir)

