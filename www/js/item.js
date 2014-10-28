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

  service.setItemPriorities = function (){
    var who = service.sharedData.email;
    var what = $state.current.name;
    if (what === 'projects') { what = 'project'; }
    var priorityByEmail, priorityOfWhat;
    priorityOfWhat = _.filter(service.items, function(item){ return item.type === what && item.priority });

    _(priorityOfWhat).each(function(item){ 
      if(!item.priorityByEmail){ item.priorityByEmail={}; }
      var theP = _.find(item.priority, function(p){ return p.email === who; });
      item.priorityByEmail[what] = (theP && theP.value) || 0;
    });
  };


  return service;
});

itemApp.config(function($stateProvider, $urlRouterProvider){
  $urlRouterProvider.when('/edit/','/');
  $urlRouterProvider.when('/edit','/');

  $stateProvider
    .state('everything', {
      url: '/',
      templateUrl: 'templates/defaultView.html',
      controller: function($scope, $state, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.pageFilter = '';
        $scope.sharedData.orderBy = '-posted';
      }
    })
    .state('newItemForm', {
      url: '/addItem',
      templateUrl:'templates/defaultView.html',
      controller: function ($scope, $state, master) {
        $scope.sharedData=master.sharedData;
        if(!$scope.sharedData.email) { $state.go('everything'); }
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
        $scope.sharedData.orderBy = '-totalPriority';
        master.setItemPriorities($scope.sharedData.email, 'project');
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
        itemToBeEdit: function ($http, $stateParams, master) {
          return $http.post('/api/requestLock', {uid:$stateParams.uid,email:master.sharedData.email}).then(function (response){
            return response.data;
          });
        }
      },
      templateUrl: 'templates/editView.html',
      controller: function ($scope, $state, itemToBeEdit, master) {
        $scope.sharedData=master.sharedData;
        debug=$scope.itemToBeEdit=itemToBeEdit;
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
      if (fromState.name) { 
        $scope.page = fromState.name; 
      }else{ 
        $scope.page = 'everything'; 
      }
    } else {
      $scope.page = toState.name; 
    }
  });

  $scope.$watch('sharedData.email', function(email){
    master.setItemPriorities();
  });

  if ($scope.email = $.cookie('email')) { $scope.emailSuccess = true; $scope.sharedData.email = $scope.email; };

  $scope.setEmailCookie = function () {
    if ($.cookie('email', $scope.email)) {
      $scope.emailSuccess=true;
      $scope.sharedData.email = $scope.email;
    };
  };//end setEmailCookie ---------------

  $scope.removeEmail = function() {
    $scope.emailSuccess = false;
    $.removeCookie('email');
    $scope.email = '';
    $scope.sharedData.email = '';
    $state.go('everything');
  }

  $scope.emailCompare = function() {
    if ($scope.sharedData.email === $scope.email) {
      $scope.emailSuccess=true;
    }else{ $scope.emailSuccess = false; }
  };
  

  $scope.$on('cancelForm',function(){ 
    $scope.showForm=false; 
    $state.go('everything'); 
  });

  $scope.$watch('sharedData.showDeleted', function(hide) { 
    if (hide) { 
      master.sharedData.deletedFilter = {};
    } else {
      master.sharedData.deletedFilter = {type:'!deleted'};
    }
  })

});

//accepts a field array (of objects with a name and type)
itemApp.directive('formElement', function ($http) {
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
      if (scope.field.type=='radio') {
        scope.templateUrl = 'templates/formElement_radio.html';
        //defaults
        if(scope.field.default) { scope.formItem[scope.field.name]=scope.field.default; }
      }
    }
  }
});

itemApp.directive('insertForm', function (master, $http) {
  return {
    restrict: 'E',
    scope: {
      formItem:'='
    },
    templateUrl: 'templates/insertForm.html',
    link: function(scope, element, attrs) {
      //db defaults for form
      scope.dbInfo=master.getDbInfo;
      scope.sharedData = master.sharedData;
      scope.filter=master.sharedData.filter;

      //setup form item
      if(!scope.formItem) { 
        scope.formItem={}; 
        scope.formItem.name=scope.filter; 
        
        scope.formItem.createdBy = scope.sharedData.email;
      }

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
      scope.cancelForm = function(item){
        if(item){
          //need to remove lock
          $http.post('/api/removeLock', {uid:item.uid,email:master.sharedData.email})
        }
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
      formItem:'=',
      editAttachment:'=',
      attachmentFilter:'='
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

      //scope.showAddAttachmentForm = !scope.formItem.attachments || (scope.formItem.attachments.length === 0);
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

      scope.setImageUrl = function(url,index) {
        scope.$emit('newUrl', url);
        $('.active-result').removeClass('active-result');
        $('#result'+index).addClass('active-result');
      };
    }
  }
});

itemApp.directive('itemPriority', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      item:'=',
      type:'='
    },
    templateUrl: 'templates/itemPriority.html',
    link: function(scope, element, attrs) {
      scope.sharedData=master.sharedData;
      scope.changePriority = function(how) { 
        var temp = _.findWhere(scope.item.priority,{email:scope.sharedData.email});
        if (temp) {userPriority=temp.value}else{userPriority=0;}
        
        $http.post('/api/setPriority',{
          uid:scope.item.uid, 
          email:scope.sharedData.email, 
          value:(userPriority===how)?0:how
        }).then(function(response){
          angular.copy(response.data, scope.item);
          master.setItemPriorities(); 
        });

      };
    }
  }
});

itemApp.directive('listItem', function ($state, master) {
  return {
    restrict: 'E',
    scope: {
      item:'=',
      page:'=',
      priority:'='
    },
    templateUrl: 'templates/listItem.html',
    link: function(scope, element, attrs) {
      scope.sharedData = master.sharedData;
      scope.color = master.color;

      scope.$watch('item.imageURL',function(url){
        scope.editThumb = url;
      });

      scope.editItem = function(itemToBeEdit) {
        $state.go('edit',{uid: itemToBeEdit.uid});
      };

    }
  }
});

itemApp.directive('itemDetail', function ($state, $filter, master) {
  return {
    restrict: 'E',
    scope: {
      item:'='
    },
    templateUrl: 'templates/itemDetail.html',
    link: function(scope, element, attrs) {
      
    }
  }
});

itemApp.filter('regex', function() {
  return function(input, field, regex) {
    var patt = new RegExp(regex);      
    var out = [];
    for (var i = 0; i < input.length; i++){
      if(patt.test(input[i][field])){
        out.push(input[i]);
      }
    }      
    return out;
  };
});
