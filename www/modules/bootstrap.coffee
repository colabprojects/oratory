define [
  'angular'
  'cs!app'
  'angular-strap-tpl'
], (angular, app) ->
  angular.element().ready ->
    angular.bootstrap(document, [app.name])
