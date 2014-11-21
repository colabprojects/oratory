//the angular magic:
var itemApp = angular.module('app', ['ui.router']);
//socket magic:
var socket = io();
//cookies:
var email = $.cookie('email');
//debug:
var debug = {};

//create the service for database interaction and info
itemApp.factory('master', function($http, $q, $state){
  var service = {};

  service.items=[];
  service.item={};

  service.refreshItems=function(){
    return $http.post('/api/getItems').then(function (response) {
      return angular.copy(response.data, service.items);
    });
  };
  //init data
  service.refreshItems();

  service.color = function (item) { 
    var type = _(service.getDbInfo.types).findWhere({name: item.type}); 
    return type && type.color;
  };

  service.saveItem = function(itemToBeSaved){
    return $http.post('/api/saveItem', itemToBeSaved);
  };

  service.deleteItem = function(itemToBeDeleted){
    return $http.post('/api/deleteItem', itemToBeDeleted).success(function (data){
      return service.refreshItems().then(function (data){
        return window.history.back(); 
      }); 
    });
  };

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
  service.sharedData.showMoreDetail={};
  if (email) { service.sharedData.email = email; }
  service.sharedData.showDeleted = false;
  service.sharedData.pages = ['everything', 'inventory', 'projects','books','map','calendar'];

  service.sharedData.notIncluded = ['name','type','uid','image','thumb','need'];

  service.sharedData.attachmentTypes = ['resource', 'tool', ''];
  service.sharedData.formAttachments = [];

  service.sharedData.changePage = function (page) { $state.go(page); };
  service.sharedData.scrollTop = function () {
    $('html, body').animate({
        scrollTop: $("#site-wrapper").offset().top
    }, 1000);
  };

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
      templateUrl: 'html/defaultView.html',
      controller: function($scope, $state, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.pageFilter = '';
        $scope.sharedData.orderBy = '-edited';
        $scope.sharedData.viewFilter = '';
      }

    })
    .state('inventory', {
      url: '/inventory',
      templateUrl:'html/defaultView.html',
      controller: function ($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.pageFilter = function(item) {
          return item.type === 'tool' || item.type ==='resource' || item.oldType === 'tool' || item.oldType === 'resource';
        };
        $scope.sharedData.viewFilter = '';
      }
    })
    .state('projects', {
      url: '/projects',
      templateUrl:'html/defaultView.html',
      controller: function ($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.orderBy = '-totalPriority';
        master.setItemPriorities($scope.sharedData.email, 'project');
        $scope.sharedData.pageFilter = function(item) {
          return item.type==='project' || item.oldType === 'project';
        };
        $scope.sharedData.viewFilter = '';
      }
    })
    .state('books', {
      url: '/books',
      templateUrl:'html/defaultView.html',
      controller: function ($scope, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.pageFilter = function(item) {
          return item.type==='book' || item.oldType === 'book';
        };
        $scope.sharedData.viewFilter = '';
      }
    })
    .state('map', {
      url: '/map',
      templateUrl:'html/mapView.html',
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
      templateUrl:'html/calendarView.html',
      controller: function ($scope, allEvents, master) {
        $scope.insertCalendar= function() {
          $scope.sharedData=master.sharedData;
          allEvents;
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
      url: '/edit/:uid/:chain',
      resolve:{
        itemToBeEdit: function ($http, $stateParams, master) {
          return $http.post('/api/requestLock', {uid:$stateParams.uid,email:master.sharedData.email}).then(function (response){
            return response.data;
          });
        },
        allChanges: function ($http, $stateParams, master) {
          return $http.post('/api/getItems', {type:'staged',forUID:$stateParams.uid}).then(function (response){
            return response.data;
          });
        }
      },
      templateUrl: 'html/editView.html',
      controller: function ($scope, $state, $stateParams, itemToBeEdit, allChanges, master) {
        $scope.sharedData=master.sharedData;
        master.item=$scope.item=itemToBeEdit;
        $scope.page=$state.current.name;
        $scope.sharedData.showMoreDetail[$stateParams.uid]=true;
        $scope.allChanges=_(allChanges).where({forUID:$stateParams.uid});

        //check if owner if not - propose changes only
        $scope.isOwner=false;
        if ( _.contains($scope.item.owners, $scope.sharedData.email)) {
          $scope.isOwner=true;
          console.log('is owner: '+$scope.isOwner+'because '+$scope.sharedData.email+' is found in '+$scope.item.owners);
        };


      }
    })
    .state('view', {
      url: '/view/:uid',
      resolve:{
        itemToBeView: function ($http, $stateParams, master) {
          return $http.post('/api/getItem', {uid:$stateParams.uid}).then(function (response){
            return response.data;
          });
        }
      },
      templateUrl: 'html/viewView.html',
      controller: function ($scope, $state, $stateParams, $http, itemToBeView, master) {
        $scope.sharedData=master.sharedData;
        $scope.sharedData.showMoreDetail[$stateParams.uid]=true;
        master.item=$scope.item=itemToBeView;

        $scope.getHistory = function() {
          $scope.history=[];
          $http.post('/api/getItemHistory', {uid:$stateParams.uid}).then(function (response){
            _.map(response.data, function(item){ $scope.history.push(item.historyItem); });
          });
        }
      }
    });
    
    $urlRouterProvider.otherwise('/');

});

itemApp.controller('appCtrl', function ($scope, $http, $state, master) {
  $scope.dbInfo=master.getDbInfo;
  $scope.items = master.items;
  $scope.sharedData = master.sharedData;
  $scope.sharedData.options=false;

  $scope.$on('$stateChangeSuccess', function(event, toState, toParam, fromState, fromParam){ 
    $scope.page = toState.name;   
  
    if ((fromState.name === 'edit')) {
      //remove lock if someone hits "back"
      lockedItem=_($scope.items).findWhere({uid:fromParam.uid})
      if (lockedItem.lock){
        //lock is true and have to remove
        if (toParam.chain!=='true') {
          //not chaining items
          console.log('shit is still locked');
          $http.post('/api/removeLock', {uid:lockedItem.uid, email:master.sharedData.email}).then(function (res){
            lockedItem.lock = false;
          });
        }
      }
    }

  });

  $scope.$watch('sharedData.email', function(email){
    master.setItemPriorities();
  });

  $scope.showOptions = function(){
    $scope.sharedData.options=!$scope.sharedData.options;
  }
 
  $scope.showForm = function() {
    $('#add-form').animate({top:'0px'});
  };
  
  $scope.setEmailCookie = function(email) {
    if ($.cookie('email', email)) {
      $scope.emailSuccess=true;
      $scope.sharedData.email = email;
    };
  };

  $scope.removeEmail = function() {
    $.removeCookie('email');
    $scope.sharedData.email = '';
  }

  $scope.$on('cancelForm',function(){ 
    if ($state.current.name==='edit') {
      //add alert
      window.history.back();
    } else {
      $('#add-form').animate({top:'-1000px'});
    }
  });

  $scope.$watch('sharedData.showDeleted', function(hide) { 
    if (hide) { 
      master.sharedData.deletedFilter = {};
    } else {
      master.sharedData.deletedFilter = {type:'!deleted'};
    }
  });

  socket.on('new', function(item){
    $('#socket-messages').append('<p>new item! '+item.name+' was added by '+item.createdBy+'...</p>');
    master.items.push(item);
    $scope.$digest();
  });
  
  socket.on('update', function(item){
    console.log('UPDATE!');
    angular.copy(item, _(master.items).findWhere({uid:item.uid}));
    if (item.uid == master.item.uid) { angular.copy(item,master.item); }
    $scope.$digest();
  });

  socket.on('lockChange', function(item){
    console.log('lock changed! - '+item.name+' is now '+item.lock);

    _(master.items).findWhere({uid:item.uid}).lock = item.lock;
    //if (item.uid == master.item.uid) { angular.copy(item,master.item); }
    $scope.$digest();
  });

  socket.on('priorityChange', function(item){
    console.log('priority changed! - '+item.name+' is now '+item.totalPriority);
    angular.copy(item,_(master.items).findWhere({uid:item.uid}));
    master.setItemPriorities(); 
    $scope.$digest();
  });

  socket.on('comment', function(item){
    console.log('new comment for '+item.name+'!');
    angular.copy(item,_(master.items).findWhere({uid:item.uid}));
    master.setItemPriorities(); 
    $scope.$digest();
  });

  socket.on('proposedChange', function(forUID){
    _(master.items).findWhere({uid:forUID}).proposedChanges=true;
    $scope.$digest();
  });

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
        scope.templateUrl = 'html/formElement_text.html';
      }
      if (scope.field.type=='textarea') {
        scope.templateUrl = 'html/formElement_textarea.html';
      }
      if (scope.field.type=='url') {
        scope.templateUrl = 'html/formElement_URL.html';
      }
      if (scope.field.type=='image-search') {
        scope.templateUrl = 'html/formElement_image_search.html';
      }
      if (scope.field.type=='radio') {
        scope.templateUrl = 'html/formElement_radio.html';
        //defaults
        if((scope.field.default)&&(scope.formItem[!scope.field.name])) { scope.formItem[scope.field.name]=scope.field.default; }
      }
    }
  }
});

itemApp.directive('insertForm', function (master, $state, $http) {
  return {
    restrict: 'E',
    scope: {
      formItem:'=',
      isOwner:'='
    },
    templateUrl: 'html/insertForm.html',
    link: function(scope, element, attrs) {
      //db defaults for form
      scope.dbInfo=master.getDbInfo;
      scope.sharedData = master.sharedData;

      //setup form item
      if(!scope.formItem) { 
        scope.formItem={}; 
        scope.formItem.name=scope.filter; 
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
          if(!itemToBeAdded.createdBy) { 
            itemToBeAdded.createdBy = scope.sharedData.email; 
          } else {
            itemToBeAdded.editedBy = scope.sharedData.email;
          }

          master.saveItem(itemToBeAdded); 
          master.sharedData.filter=''; 
          scope.cancelForm(); 
        }
      };

      scope.stageItemChanges = function(item){
        if (scope.form.$valid) {
          item.proposedBy = scope.sharedData.email;
          $http.post('/api/stageItemChanges',item).then(function(response){
              scope.cancelForm();
          });
        }
      }

      scope.cancelForm = function(item){
        if(item){
          //need to remove lock
          $http.post('/api/removeLock', {uid:item.uid,email:master.sharedData.email}).then(function (res){
            _(master.items).findWhere({uid:res.data.uid}).lock = false;
          });
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
    templateUrl: 'html/customizeForm.html',
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
    templateUrl: 'html/listAttachments.html',
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
    templateUrl: 'html/listAttachment.html',
    link: function(scope, element, attrs) {
      scope.colors = master.color(scope.attachment);
    }
  }
});

itemApp.directive('imageSearch', function ($http, master) {
  return {
    restrict: 'E',
    scope: {
      searchTerm:'='
    },
    templateUrl: 'html/imageSearch.html',
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
        $('#result-'+index).addClass('active-result');
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
    templateUrl: 'html/itemPriority.html',
    link: function(scope, element, attrs) {
      scope.sharedData=master.sharedData;
      scope.changePriority = function(how) { 
        var temp = _.findWhere(scope.item.priority,{email:scope.sharedData.email});
        if (temp) {userPriority=temp.value}else{userPriority=0;}
        
        $http.post('/api/setPriority',{
          uid:scope.item.uid, 
          email:scope.sharedData.email, 
          value:(userPriority===how)?0:how
        })
        /*
        .then(function(response){
          angular.copy(response.data, scope.item);
          master.setItemPriorities(); 
        });
        */
      };
    }
  }
});

itemApp.directive('listItem', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      item:'=',
      page:'=',
      priority:'='
    },
    templateUrl: 'html/listItem.html',
    link: function(scope, element, attrs) {
      scope.showMoreDetail = {};
      scope.sharedData = master.sharedData;
      scope.colors = master.color(scope.item);

      if (scope.page === 'view') { scope.showMoreDetail[scope.item.uid]=true; }

      scope.$watch('item.imageURL',function(url){
        scope.editThumb = url;
      });

      scope.pickLock = function (itemToPick) {
        $http.post('/api/pickLock', {uid:itemToPick.uid,email:master.sharedData.email}).then(function (res){
          scope.showOptions(res.data.uid);
          _(master.items).findWhere({uid:res.data.uid}).lock = false;
        });
      };

      scope.showOptions = function(uid) {
        if ($('#push-wrapper-'+uid).hasClass('show-more')) {
          // Do things on Nav Close
          $('#push-wrapper-'+uid).removeClass('show-more');
        } else {
          // Do things on Nav Open
          $('#push-wrapper-'+uid).addClass('show-more');
        }

      };

      scope.showMoreDetails = function(uid) {
        scope.sharedData.showMoreDetail[uid]=!scope.sharedData.showMoreDetail[uid];

      };
    }
  }
});

itemApp.directive('itemDetail', function ($state, $filter, $http, master) {
  return {
    restrict: 'E',
    scope: {
      item:'='
    },
    templateUrl: 'html/itemDetail.html',
    link: function(scope, element, attrs) {
      scope.showRaw = {};
      scope.colors = master.color(scope.item);

      scope.addComment = function(item){
          $http.post('/api/addComment', {uid:item.uid,email:master.sharedData.email,comment:scope.comment}).then(function(res){
            scope.comment='';
          });

      }
    }
  }
});

itemApp.directive('itemToolbar', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      item:'=',
      isOwner:'='
    },
    templateUrl: 'html/itemToolbar.html',
    link: function(scope, element, attrs) {
      scope.sharedData = master.sharedData;
      scope.colors = master.color(scope.item);
      scope.deleteItem=master.deleteItem;

      scope.addOwner = function(){

      };

      scope.goBack = function(){
        window.history.back();
      }
    }
  }
});

itemApp.directive('itemProposedChanges', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      item:'=',
      allChanges:'=',
      isOwner:'='
    },
    templateUrl: 'html/itemProposedChanges.html',
    link: function(scope, element, attrs) {
      debug=scope.allChanges;
    }
  }
});

itemApp.directive('itemChange', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      original:'=',
      changed:'=',
      key:'=',
      isOwner:'='
    },
    templateUrl: 'html/itemChange.html',
    link: function(scope, element, attrs) {
      scope.changedFields = [];
      scope.item=master.item;
      scope.sharedData=master.sharedData;

      for (key in scope.changed){
        if (angular.toJson(scope.changed[key])!==angular.toJson(scope.original[key])){
          //console.log('difference in '+key+' is '+JSON.stringify(scope.changed[key])+' -- original:'+JSON.stringify(scope.original[key]));
          if((key!=='lockChangedBy')&&(key!=='lockChangedAt')&&(key!=='edited')&&(key!=='editedBy')&&(key!=='image')&&(key!=='lock')&&(key!=='imageURL')&&(key!=='owners')) {
            
            var dildo = {};
            dildo[key]=scope.changed[key];
            console.log(dildo);
            scope.changedFields.push(dildo);
          }
        }
      }
      debug=scope.changedFields;
      //check to see if dildo is empty
      

      scope.mergeChange = function (field, value, yesno){
        console.log(field+" is going to be "+value);
        console.log(scope.item)
        if (field==='thumb'){
          //special image handling
          scope.item['thumb']=value;
          scope.item['image']=scope.changed['image'];
          scope.item['imageURL']=scope.changed['imageURL'];

        } else {
          //standard update
          scope.item[field]=value;
        }

        //change decision
        //(key, email, field, decision)
        var decisionObj = {}
        decisionObj['key']=scope.key;
        decisionObj['email']=scope.sharedData.email;
        decisionObj['field']=field;
        decisionObj['decision']=yesno;

        $http.post('/api/decision',decisionObj).then(function (response){
          master.saveItem(scope.item);
        })

        /*
        var findValue={};
        findValue[field]=value;
        console.log('findvalue='+JSON.stringify(findValue))
        delete _.findWhere(scope.changedFields, findValue);
        */
      };




    }
  }
});


itemApp.directive('showComment', function ($state, $filter, $http, master) {
  return {
    restrict: 'E',
    scope: {
      comment:'='
    },
    templateUrl: 'html/showComment.html',
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
