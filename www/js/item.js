//the angular magic:
var itemApp = angular.module('itemApp', ['ui.router','mgcrea.ngStrap']);
//cookies:
var email = $.cookie('email');
//debug:
var debug = {};

//create the service for database interaction and info
itemApp.factory('master', function($http, $q, $state){
  var service = {};

  //------------------------------

  service.items=[];
  service.refreshItems=function(){
    return $http.post('/api/getItems').then(function (response) {
      return angular.copy(response.data, service.items);
    });
  };
  //init data
  service.refreshItems();
  
  //------------------------------

  service.saveItem = function(itemToBeSaved){
    return $http.post('/api/saveItem', itemToBeSaved).success(function (data) { 
      return service.refreshItems();
    });
  };//END SAVE ITEM

  //------------------------------

  service.deleteItem = function(itemToBeDeleted){
    $http.post('/api/deleteItem', itemToBeDeleted);
  }

  //------------------------------

  //DB CONFIG
  service.getDbInfo = {};
  $http.get('/api/getDbInfo').then(function (response){

    angular.copy(response.data, service.getDbInfo);

    service.getDbInfo.getFields = function(type) { 
      var type = _(service.getDbInfo.types).findWhere({name:type}); 
      return type && type.formFields;
    };

  });
  
  //SHARED DATA
  service.sharedData = {};
  service.sharedData.filter = '';
  service.sharedData.pages = ['everything', 'inventory', 'projects','books'];

  service.sharedData.changePage = function (page) { $state.go(page); };
  return service;
});

itemApp.config(function($stateProvider, $urlRouterProvider){
  $urlRouterProvider.when('/edit/','/');
  $urlRouterProvider.when('/edit','/');

  $stateProvider
    .state('everything', {
      url: '/',
      templateUrl: 'templates/defaultView.html',
      controller: function($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.pageFilter = '';
      }
    })
    .state('newItemForm', {
      url: '/addItem',
      templateUrl:'templates/defaultView.html',
      controller: function ($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.showForm=true;
      }
    })
    .state('inventory', {
      url: '/inventory',
      templateUrl:'templates/defaultView.html',
      controller: function ($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.pageFilter = function(item) {
          return item.type==='tool' || item.type ==='resource';
        };
      }
    })
    .state('projects', {
      url: '/projects',
      templateUrl:'templates/defaultView.html',
      controller: function ($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.pageFilter = function(item) {
          return item.type==='project';
        };
      }
    })
    .state('books', {
      url: '/books',
      templateUrl:'templates/defaultView.html',
      controller: function ($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.pageFilter = function(item) {
          return item.type==='book';
        };
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
      controller: function ($scope, $state, itemToBeEdit, master) {
        $scope.sharedData=master.sharedData;
        $scope.itemToBeEdit=itemToBeEdit;
        $scope.deleteItem=master.deleteItem;

      }
    });
    
    $urlRouterProvider.otherwise('/');

});

itemApp.controller('itemCtrl', function ($scope, $http, $state, master) {
  $scope.dbInfo=master.getDbInfo;
  $scope.items = master.items;
  $scope.sharedData = master.sharedData;

  $scope.$on('$stateChangeSuccess', function(event, toState){ $scope.page = toState.name; });

  $scope.$on('cancelForm',function(){ $scope.showForm=false; $state.go('everything'); });

});

//accepts a field array (of objects with a name and type)
itemApp.directive('formElement', function($http) {
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
      if (scope.field.type=='url') {
        scope.templateUrl = 'templates/formElement_URL.html';
      }
      if (scope.field.type=='image-search') {
        scope.templateUrl = 'templates/formElement_image_search.html';
      }
    }
  }
});

itemApp.directive('insertForm', function (master) {
  return {
    restrict: 'E',
    scope: {
      formItem:'='
    },
    templateUrl: 'templates/insertForm.html',
    link: function(scope, element, attrs) {
      //db defaults for form
      scope.dbInfo=master.getDbInfo;
      scope.filter=master.sharedData.filter;

      scope.$on('cancelCustom',function(){ scope.showCustom=false; });
      scope.$on('newUrl', function(event, url){ scope.formItem.imageURL = url; })

      if(!scope.formItem) { scope.formItem={}; scope.formItem.name=scope.filter; }

      scope.saveItem = function(itemToBeAdded) {
        //validate and add
        if (scope.form.$valid) { 
          master.saveItem(itemToBeAdded); 
          master.sharedData.filter=''; 
          scope.cancelForm(); 
        }
      };
      scope.cancelForm = function(){
        scope.$emit('cancelForm');
        scope.formItem={};
      };
      scope.cancelCustom = function(){
        scope.$emit('cancelCustom');
      }
    }
  }
});

itemApp.directive('customizeForm', function (master) {
  return {
    restrict: 'E',
    scope: {
      type:'='
    },
    templateUrl: 'templates/customizeForm.html',
    link: function(scope, element, attrs) {
      //db defaults for form
      scope.dbInfo=master.getDbInfo;

      scope.addCustomElement = function(){
        if (scope.formCustom.$valid) {
          _(master.getDbInfo.types).findWhere({name:scope.type}).formFields.push({name:scope.formAdd.name, type:scope.formAdd.type});
          scope.$emit('cancelCustom');
        }
      };
    }
  }
});

itemApp.directive('imageSearch', function ($http, master) {
  return {
    restrict: 'E',
    scope: {
      searchTerm:'='
    },
    templateUrl: 'templates/imageSearch.html',
    link: function(scope, element, attrs) {

      scope.results = [];
      var url = 'https://ajax.googleapis.com/ajax/services/search/images?v=1.0&safe=active&callback=JSON_CALLBACK&q=';
      
      scope.$watch('searchTerm', function (searchTerm) {
        $http.jsonp(url + searchTerm).then(function (response) {
            scope.results = response.data.responseData.results;
        });
      });

      scope.setImageUrl = function(url) {
        scope.$emit('newUrl', url);
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
      scope.color = function () { 
        if (scope.item.deleted) { return '#FF0000'; }else{
          var type = _(master.getDbInfo.types).findWhere({name: scope.item.type}); 
         return type && type.color;
       } 
      };

      scope.$watch('item.imageURL',function(url){
        scope.editThumb = url;
      });

      scope.editItem = function(itemToBeEdit) {
        $state.go('edit',{uid: itemToBeEdit.uid});
      };

    }
  }
});
