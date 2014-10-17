//the angular magic:
var itemApp = angular.module('itemApp', ['ui.router','mgcrea.ngStrap']);
//default item image:
var defaultImage = 'images/default.jpg';
//cookies:
var email = $.cookie('email');
//debug:
var debug = {};

//create the service for database interaction and info
itemApp.factory('master', function($http, $q){
  var service = {};

  //------------------------------
  service.items=[];
  service.refreshItems=function(){
    return $http.post('/api/getItems').then(function (response) {
      //mystery
      return angular.copy(response.data,service.items);
    });
  };
  //init data
  service.refreshItems();
  //------------------------------

  service.saveItem = function(itemToBeSaved){
    var promise;
    if ((itemToBeSaved.imageURL == '')||(typeof itemToBeSaved.imageURL == 'undefined')) { 
      itemToBeSaved.thumb = defaultImage; 
    }else{
      //promise that the image will save
      promise = service.saveImage(itemToBeSaved);
      itemToBeSaved['image'] = 'images/items/'+itemToBeSaved.uid+'/itemImage.jpg';
      itemToBeSaved['thumb'] = 'images/items/'+itemToBeSaved.uid+'/itemThumb.jpg'; 
    }
    return $q.when(promise).finally(function(){
      return $http.post('/api/saveItem', itemToBeSaved).success(function (data) { 
        return service.refreshItems();
      });
    });
  };//END SAVE ITEM

  service.saveImage = function (itemI) {
    //save the image from the specified url
    return $http.post('/api/saveImage', itemI);
  }; //END SAVE IMAGE


  service.getDbInfo={
    formElements:['text','text-search','textarea', 'url'],
    types:['item','project'],
    colors:{'item':'#218559','project':'#EBB035','book':'#876f69'}
  };
  service.getTypeInfo={
    item:[
      {name:'description',type:'textarea'}, 
      {name:'location',type:'text'},
      {name:'balls',type:'text-search'},
      {name:'imageURL', type:'url'},
      {name:'website', type:'url'}
    ],
    project:[
      {name:'description',type:'textarea'},
      {name:'task',type:'text'}
    ]
  };

  return service;
});

itemApp.config(function($stateProvider, $urlRouterProvider){
  $urlRouterProvider.when('/edit/','/');
  $urlRouterProvider.when('/edit','/');

  $stateProvider
    .state('default', {
      url: '/',
      templateUrl: 'templates/defaultView.html',
      controller: function ($scope) {}
    })
    .state('newItemForm', {
      url: '/addItem',
      templateUrl:'templates/defaultView.html',
      controller: function ($scope) {
        $scope.showForm=true; 
      }
    })
    .state('edit', {
      url: '/edit/:uid',
      resolve:{
        itemToBeEdit: function ($http, $stateParams) {
          return $http.post('/api/getItem', $stateParams).then(function (response){
            return response.data;
          });
        }
      },
      templateUrl: 'templates/editView.html',
      controller: function ($scope, itemToBeEdit, master) {
        $scope.itemToBeEdit=itemToBeEdit;
      }
    });

    
    $urlRouterProvider.otherwise('/');

});

itemApp.controller('itemCtrl', function ($scope, $http, $state, master) {
  $scope.dbInfo=master.getDbInfo;
  $scope.typeInfo=master.getTypeInfo;
  $scope.items = master.items;

      //scope.formItem={};
      //scope.formItem.name=scope.filter;

  $scope.$on('cancelForm',function(){ $scope.showForm=false; $state.go('default'); });

});

//accepts a field array (of objects with a name and type)
itemApp.directive('formElement', function() {
  return {
    restrict: 'E',
    scope: {
      field:'=',
      formItem:'=',
      form:'='
    },
    template: '<div ng-include="templateUrl"></div>',
    link: function(scope, element, attrs) {
      if (scope.field.type=='text') {
        scope.templateUrl = 'templates/formElement_text.html';
      }
      if (scope.field.type=='textarea') {
        scope.templateUrl = 'templates/formElement_textarea.html';
      }
      if (scope.field.type=='text-search') {
        scope.templateUrl = 'templates/formElement_text_searchLink.html';
      }
      if (scope.field.type=='url') {
        scope.templateUrl = 'templates/formElement_URL.html';
      }

      //functions
      scope.imageSearch = function(searchTerm) {
        scope.imageSearchHref = 'https://www.google.com/search?q='+encodeURIComponent(searchTerm);
      };
    }
  }
});

itemApp.directive('insertForm', function (master) {
  return {
    restrict: 'E',
    scope: {
      filter:'=',
      formItem:'='
    },
    templateUrl: 'templates/insertForm.html',
    link: function(scope, element, attrs) {
      //db defaults for form
      scope.dbInfo=master.getDbInfo;
      scope.typeInfo=master.getTypeInfo;

      scope.addItem = function(itemToBeAdded) {
        //validate and add

        if (scope.form.$valid) { master.saveItem(itemToBeAdded); scope.cancelForm(); }
      };
      scope.cancelForm = function(){
        scope.$emit('cancelForm');
        scope.formItem={};
      };
    }
  }
});

itemApp.directive('listItem', function ($state, master) {
  return {
    restrict: 'E',
    scope: {
      item:'='
    },
    templateUrl: 'templates/listItem.html',
    link: function(scope, element, attrs) {
      scope.color = function () { return master.getDbInfo.colors[scope.item.type]; };

      scope.$watch('item.imageURL',function(url){
        scope.editThumb = url;
      });

      scope.editItem = function(itemToBeEdit) {
        $state.go('edit',{uid: itemToBeEdit.uid});
      };

    }
  }
});
