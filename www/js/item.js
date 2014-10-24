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

  service.color = function (item) { 
    var type = _(service.getDbInfo.types).findWhere({name: item.type}); 
    return type && type.color;
  };

  service.saveItem = function(itemToBeSaved){
    return $http.post('/api/saveItem', itemToBeSaved).success(function (data) { 
      return service.refreshItems();
    });
  };//END SAVE ITEM

  //------------------------------

  service.deleteItem = function(itemToBeDeleted){
    return $http.post('/api/deleteItem', itemToBeDeleted).success(function (data){
      return service.refreshItems().then(function (data){
        return $state.go('everything'); 
      }); 
    });
  };

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
  service.sharedData.deletedFilter = {};
  service.sharedData.showDeleted = false;
  service.sharedData.pages = ['everything', 'inventory', 'projects','books','map','calendar'];

  service.sharedData.attachmentTypes = ['resource', 'tool', ''];
  service.sharedData.formAttachments = [];

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
        $scope.sharedData.orderBy = '-posted';
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
          return item.type === 'tool' || item.type ==='resource' || item.oldType === 'tool' || item.oldType === 'resource';
        };
      }
    })
    .state('projects', {
      url: '/projects',
      templateUrl:'templates/defaultView.html',
      controller: function ($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.orderBy = '-priority';
        $scope.sharedData.pageFilter = function(item) {
          return item.type==='project' || item.oldType === 'project';
        };
      }
    })
    .state('books', {
      url: '/books',
      templateUrl:'templates/defaultView.html',
      controller: function ($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.pageFilter = function(item) {
          return item.type==='book' || item.oldType === 'book';
        };
      }
    })
    .state('map', {
      url: '/map',
      templateUrl:'templates/mapView.html',
      controller: function ($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.insertMap = function() {
          new GMaps({
            div: '#insert-map',
            lat: 36.375892,
            lng: -85.586121
            //mapTypeId: google.maps.MapTypeId.SATELLITE
          });
        };
        $scope.insertMap();
      }
    })
    .state('calendar', {
      url: '/calendar',
      resolve:{
        allEvents: function ($http, $stateParams) {
          return $http.post('/api/getItems', {type:'event'}).then(function (response){
            return response.data;
          });
        }
      },
      templateUrl:'templates/calendarView.html',
      controller: function ($scope, allEvents, master) {
        $scope.insertCalendar= function() {
          $scope.sharedData=master.sharedData;
          debug=allEvents;
          $('#insert-calendar').fullCalendar({
            //settings
            events: allEvents
          });
          //something about the scope.... this is my workaround:
          setTimeout(function() { $('#insert-calendar').fullCalendar('render'); }, 100);
        };
        $scope.insertCalendar();
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

  $scope.$on('$stateChangeSuccess', function(event, toState, toParam, fromState, fromParam){ 
    if (toState.name == 'newItemForm') {
      if (fromState.name) { $scope.page = fromState.name; }else{ $scope.page = 'everything'; }
    } else {
      $scope.page = toState.name; 
    }
  });

  $scope.$on('cancelForm',function(){ $scope.showForm=false; $state.go('everything'); });

  $scope.$watch('sharedData.showDeleted', function(hide) { 
    if (hide) { 
      master.sharedData.deletedFilter = {};
    } else {
      master.sharedData.deletedFilter = {type:'!deleted'};
    }
  })

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
      //setup form item
      if(!scope.formItem) { scope.formItem={}; scope.formItem.name=scope.filter; }
      if (scope.formItem.type != 'deleted') {
        scope.dbInfo.formTypes = _.without(scope.dbInfo.types,_.findWhere(scope.dbInfo.types,{name:'deleted'}));
      } else {
        scope.dbInfo.formTypes = scope.dbInfo.types;
      }

      //init attachments
      scope.formAttachments = {};

      scope.$on('cancelCustom',function(){ scope.showCustom=false; });
      scope.$on('newUrl', function(event, url){ scope.formItem.imageURL = url; })

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

itemApp.directive('listAttachments', function ($filter, master) {
  return {
    restrict: 'E',
    scope: {
      formItem:'='
    },
    templateUrl: 'templates/listAttachments.html',
    link: function(scope, element, attrs) {
      //db defaults for form
      scope.dbInfo=master.getDbInfo;
      //this copies a reference WRONG
      //scope.items=master.items;
      scope.items = _.chain(master.items)
        .filter(function(item){ return item.type==='tool' || item.type ==='resource'; })
        .map(function(item){ return angular.copy(item); }).value();

      scope.$watch('items', function(){
        scope.formItem.attachments=_.chain(scope.items)
          .filter(function(item){ return item.checked; })
          .map(function(item){ return item.uid; }).value();
      },true);

      scope.attachmentTypes=master.sharedData.attachmentTypes;

      scope.addAttachments = function() {
        _(scope.items).each(function(item){ 
          item.checked = item.wasChecked = _(scope.formItem.attachments).find(function(attachment){
            return attachment === item.uid;
          })?true:false;
        });
      };

      scope.addAttachments();

      scope.showAddAttachmentForm = !scope.formItem.attachments || (scope.formItem.attachments.length === 0);
    }
  }
});

itemApp.directive('listAttachment', function ($state, $filter, master) {
  return {
    restrict: 'E',
    scope: {
      attachment:'=',
      editAttachment:'='
    },
    templateUrl: 'templates/listAttachment.html',
    link: function(scope, element, attrs) {
      scope.color = master.color;
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

itemApp.directive('itemPriority', function ($state, master) {
  return {
    restrict: 'E',
    scope: {
      item:'='
    },
    templateUrl: 'templates/itemPriority.html',
    link: function(scope, element, attrs) {
      scope.increase = function(amount) { 
        scope.item.priority = scope.item.priority + amount; 
      };
    }
  }
});

itemApp.directive('listItem', function ($state, master) {
  return {
    restrict: 'E',
    scope: {
      item:'=',
      page:'='
    },
    templateUrl: 'templates/listItem.html',
    link: function(scope, element, attrs) {
      scope.sharedData = master.sharedData;
      scope.color = master.color;

      if ((!scope.item.priority)&&(scope.item.type=='project')) { scope.item.priority = 0; }

      scope.$watch('item.imageURL',function(url){
        scope.editThumb = url;
      });

      scope.editItem = function(itemToBeEdit) {
        $state.go('edit',{uid: itemToBeEdit.uid});
      };

    }
  }
});
