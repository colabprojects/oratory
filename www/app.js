//the angular magic:
var itemApp = angular.module('app', ['ui.router']);
//socket magic:
var socket = io();
//cookies:
var email = $.cookie('email');
var token = $.cookie('token');
//debug:
var debug = {};

//create the service for database interaction and info
itemApp.factory('master', function($http, $q, $state){
  var service = {};

  service.items=[];
  service.item={};

  service.getDbInfo = {};
  $http.get('/api/getDbInfo').then(function (response){
    angular.copy(response.data, service.getDbInfo);

    service.getDbInfo.getFields = function(type) { 
      var type = _(service.getDbInfo.types).findWhere({name:type}); 
      return type && type.formFields;
    };

  });

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

  service.saveItem = function(itemToBeSaved,value){
    return $http.post('/api/saveItem', {item:itemToBeSaved,unlock:value});
  };

  service.pushToItem = function(pushComponents){
    return $http.post('/api/pushToItem', pushComponents);
  };

  service.deleteItem = function(itemToBeDeleted){
    return $http.post('/api/deleteItem', itemToBeDeleted).success(function (data){
      return service.refreshItems().then(function (data){
        return window.history.back(); 
      }); 
    });
  };
  
  //SHARED DATA
  service.sharedData = {};
  service.sharedData.filter = '';
  service.sharedData.deletedFilter = {};
  service.sharedData.showMoreDetail={};
  if (email) { service.sharedData.email = email; }
  if (token) { service.sharedData.token = token; }
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

  //$urlRouterProvider.when('/edit','/');

  $stateProvider
    .state('auth', {
      url: '/auth/:key',
      templateUrl: 'html/auth.html',
      controller: function($scope, $state, $http, $stateParams, master) {
        $scope.email=master.sharedData.email;
        
        if($stateParams.key) { 
          $scope.token=$stateParams.key;
          $scope.key=$stateParams.key;
        }else {
          $scope.token=master.sharedData.token;
        }

        $scope.authUser = function(){
          //DEV
          /*
          master.sharedData.email=$scope.email;
          $.cookie('email', $scope.email);
          master.sharedData.token='123';
          $.cookie('token', '123');
          $state.go('everything');
          */
          
          //PRODUCTION
          master.sharedData.email=$scope.email;
          $.cookie('email', $scope.email);
          master.sharedData.token=$scope.token;
          $.cookie('token', $scope.token);
          debug=$scope.useSpecial;

          if ($scope.key) {
            $state.go('everything');
          }
          else{
            $http.post('/api/authGen', {email:$scope.email}).then(function (response){
              //window.close();
              $('#sentanddone').html('<h3>please close this window and check your email</h3>');
            });
          }
          
        };

      }
    })
    .state('everything', {
      url: '/',
      templateUrl: 'html/defaultView.html',
      resolve:{
        auth: function ($http, master) {
          return $http.post('/api/auth', {email:master.sharedData.email,token:master.sharedData.token}).then(function (response){
            return response.data;
          });
        }
      },
      controller: function($scope, $state, master, auth) {
        if (auth==='false') { $state.go('auth'); }
        $scope.sharedData=master.sharedData;
        $scope.sharedData.pageFilter = '';
        $scope.sharedData.orderBy = '-edited';
        $scope.sharedData.viewFilter = '';
      }

    })
    .state('inventory', {
      url: '/inventory',
      templateUrl:'html/defaultView.html',
      resolve:{
        auth: function ($http, master) {
          return $http.post('/api/auth', {email:master.sharedData.email,token:master.sharedData.token}).then(function (response){
            return response.data;
          });
        }
      },
      controller: function ($scope, $state, auth, master) {
        if (auth==='false') { $state.go('auth'); }
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
      resolve:{
        auth: function ($http, master) {
          return $http.post('/api/auth', {email:master.sharedData.email,token:master.sharedData.token}).then(function (response){
            return response.data;
          });
        }
      },
      controller: function ($scope, $state, auth, master) {
        if (auth==='false') { $state.go('auth'); }
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
      resolve:{
        auth: function ($http, master) {
          return $http.post('/api/auth', {email:master.sharedData.email,token:master.sharedData.token}).then(function (response){
            return response.data;
          });
        }
      },
      controller: function ($scope, $state, auth, master) {
        if (auth==='false') { $state.go('auth'); }
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
      resolve:{
        auth: function ($http, master) {
          return $http.post('/api/auth', {email:master.sharedData.email,token:master.sharedData.token}).then(function (response){
            return response.data;
          });
        }
      },
      controller: function ($scope, $state, auth, master) {
        if (auth==='false') { $state.go('auth'); }
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
        auth: function ($http, master) {
          return $http.post('/api/auth', {email:master.sharedData.email,token:master.sharedData.token}).then(function (response){
            return response.data;
          });
        },
        allEvents: function ($http, $stateParams) {
          return $http.post('/api/getItems', {type:'event'}).then(function (response){
            return response.data;
          });
        }
      },
      templateUrl:'html/calendarView.html',
      controller: function ($scope, $state, allEvents, auth, master) {
        if (auth==='false') { $state.go('auth'); }
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
          return $http.post('/api/getItems', {type:'staged',forUID:$stateParams.uid,forOwner:master.sharedData.email}).then(function (response){
            return response.data;
          });
        },
        auth: function ($http, master) {
          return $http.post('/api/auth', {email:master.sharedData.email,token:master.sharedData.token}).then(function (response){
            return response.data;
          });
        }
      },
      templateUrl: 'html/editView.html',
      controller: function ($scope, $state, $stateParams, itemToBeEdit, allChanges, auth, master) {
        if (auth==='false') { $state.go('auth'); }
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
    .state('new', {
      url: '/new',
      templateUrl: 'html/newView.html',
      resolve:{
        auth: function ($http, master) {
          return $http.post('/api/auth', {email:master.sharedData.email,token:master.sharedData.token}).then(function (response){
            return response.data;
          });
        }
      },
      controller: function ($scope, $state, $stateParams, master, auth) {
        if (auth==='false') { $state.go('auth'); }
        $scope.sharedData=master.sharedData;
        $scope.page=$state.current.name;
        $scope.item={};
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
 
  $scope.addNew = function() {
    $state.go('new');
  };
  
  $scope.removeUser = function() {
    $.cookie('email', '');
    $.cookie('token', '');
    master.sharedData.email='';
    master.sharedData.token='';
    $state.go('auth');
  };

  $scope.$on('cancelForm',function(){ 
    window.history.back();
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
    if (item.uid == master.item.uid) { angular.copy(item,master.item); }
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
    if (item.uid == master.item.uid) { angular.copy(item,master.item); }
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
      isOwner:'=',
      typeLock:'='
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

      if (scope.formItem.type !== 'deleted') {
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

          master.saveItem(itemToBeAdded,true); 
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
      if (!scope.formItem.attachments) { scope.formItem.attachments=[]; }

      scope.items = _.chain(master.items)
        .filter(function(item){ return item.type==='tool' || item.type ==='resource'; })
        .map(function(item){ return angular.copy(item); }).value();


      scope.attachmentTypes=master.sharedData.attachmentTypes;

      var initAttachments = function() {
        _(scope.items).each(function(item){ 
          item.checked = item.wasChecked = _(scope.formItem.attachments).find(function(attachment){
            return attachment === item.uid;
          })?true:false;
         
        });
      };

      initAttachments();

      scope.addAttachments = function(){
        //update the scoped item
        scope.formItem.attachments=_.chain(scope.items)
          .filter(function(item){ return item.checked; })
          .map(function(item){ 

            return item.uid; 

        }).value();
        initAttachments();
        master.pushToItem(_(scope.formItem).pick(['uid','attachments']));
      }
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
        });
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

      scope.findAttachment = function(theUID){
        return _(master.items).findWhere({uid:theUID});
      };

      scope.$watch('item.attachments', function(newValue) {
        gatherAttachments(newValue);
      });

      var gatherAttachments = function(attachments){
        scope.haves = [];
        scope.wants = [];
        scope.others = [];
        _(attachments).each(function(uid){
          var item = scope.findAttachment(uid); 
          if (item.need==='have') { scope.haves.push(item); }
          else if (item.need==='want') { scope.wants.push(item); }
          else { if (item.type!=='project') { scope.others.push(item);} }
        });
      };
      


      scope.addComment = function(item){
          $http.post('/api/addComment', {uid:item.uid,email:master.sharedData.email,comment:scope.comment}).then(function(res){
            scope.comment='';
          });
      };


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

      scope.listEvents=_(master.items).filter({type:'event'});

      scope.listProjectsAll=_(master.items).filter({type:'project'});
      scope.listProjects=_(scope.listProjectsAll).map(function(project){ if(project.uid!==scope.item.uid){ return project; }});

      scope.goBack = function(){
        window.history.back();
      };

      scope.addMediaImageClick = function() {
        scope.addMediaImage=!scope.addMediaImage;
      };

      scope.addMediaImageSave = function(media) {
        if(!scope.item.media) { scope.item.media=[]; } 
        scope.item.media.push({'rawImage':media});
        master.saveItem(scope.item);
        scope.addMediaImage=false;
        scope.mediaImageToAdd='';
      };

      scope.addOwnerClick = function() {
        scope.addOwners=!scope.addOwners;
      };

      scope.addPlanClick = function() {
        scope.addPlan=!scope.addPlan;
      };

      scope.addEventClick = function() {
        scope.addEvent=!scope.addEvent;
      };

      scope.addEvent = function(uid){
        if(!scope.item.events) { scope.item.events=[]; }
        scope.item.events.push(uid);
        master.saveItem(scope.item);
        scope.addEvent=false;
      }

      scope.addToProject = function(theUID) {
        var parent = _(master.items).findWhere({uid:theUID});
        if(!parent.attachments) { parent.attachments = []; }
        parent.attachments.push(scope.item.uid)

        master.pushToItem(_(parent).pick(['uid','attachments']));
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

    }
  }
});

itemApp.directive('itemChange', function ($state, $http, $filter, master) {
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

      socket.on('decisionChange', function(staged){
        console.log('decision!');
        angular.copy(staged.changes,scope.changed);
      });
      

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
        decisionObj['item']=scope.item;

        $http.post('/api/decision',decisionObj).then(function (response){
          
        });
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

itemApp.directive('ownerForm', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      item:'='
    },
    templateUrl: 'html/ownerForm.html',
    link: function(scope, element, attrs) {

      scope.addOwner = function(newOwner){
        scope.item.owners.push(newOwner);
        master.saveItem(scope.item);
      };

    }
  }
});

itemApp.directive('addPlanForm', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      item:'=',
      plan:'='
    },
    templateUrl: 'html/addPlanForm.html',
    link: function(scope, element, attrs) {
      scope.dbInfo=master.getDbInfo;
      scope.sharedData=master.sharedData;
      if (scope.plan) { 
        scope.formPlan=scope.plan;
      } else {
        scope.formPlan={};
        scope.formPlan['type']='plan';
      }
      
      scope.savePlan = function(assign){
        if(!scope.item.plans) {scope.item.plans=[];}
        if(!scope.item.plan) {scope.item.plan=[];}
        debug='the form plan: '+JSON.stringify(scope.formPlan)+'     the item is: '+JSON.stringify(scope.item);
        scope.item.plans.push(scope.formPlan);
        
        if (assign){
          //add step to item attachments
          if (!scope.item.attachments) { scope.item.attachments = []; }
          _(scope.formPlan.steps).each(function(step){
            if (step.uid){ scope.item.attachments.push(step.uid); }
          });
            
          scope.item.plan = scope.formPlan;

        }

        master.pushToItem(_(scope.item).pick(['uid','plans','plan','attachments']));
      };

    }
  }
});

itemApp.directive('addStep', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      item:'=',
      plan:'='
    },
    templateUrl: 'html/addStep.html',
    link: function(scope, element, attrs) {
      scope.dbInfo=master.getDbInfo;
      scope.sharedData=master.sharedData;
      scope.color = master.color;
      scope.items = master.items;
      

      scope.addTextAsStep = function(){
        if (!scope.plan.steps) { scope.plan.steps = []; }
        scope.plan.steps.push({text:scope.stepSearch});
        scope.stepSearch='';
      };

      scope.addItemAsStep = function(uid){
        if (!scope.plan.steps) { scope.plan.steps = []; }
        scope.plan.steps.push({uid:uid});
      };

    }
  }
});





itemApp.directive('listSteps', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      plan:'=',
      item:'=',
      editSteps:'='
    },
    templateUrl: 'html/listSteps.html',
    link: function(scope, element, attrs) {
      scope.dbInfo=master.getDbInfo;
      scope.sharedData=master.sharedData;
      
      scope.removeStep = function (index) {
        var step = scope.plan.steps[index];
        if (step.uid) {
          scope.item.attachments = _.without(scope.item.attachments, step.uid);
        }
        scope.plan.steps.splice(index, 1);
      };

      scope.moveStep = function(from,to) {
        var step = scope.plan.steps[from];
        scope.plan.steps.splice(from, 1);
        scope.plan.steps.splice(to, 0, step);
      };
      

    }
  }
});

itemApp.directive('listStep', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      step:'='
    },
    templateUrl: 'html/listStep.html',
    link: function(scope, element, attrs) {
      scope.dbInfo=master.getDbInfo;
      scope.sharedData=master.sharedData;

      if (scope.step.uid) {
        scope.getItem = _(master.items).findWhere({uid:scope.step.uid});
        scope.color = master.color(scope.getItem);
      }
      

    }
  }
});

itemApp.directive('addMediaImageForm', function ($state, $http, master) {
  return {
    restrict: 'E',
    scope: {
      mediaImage:'='
    },
    templateUrl: 'html/addMediaImageForm.html',
    link: function(scope, element, attrs) {
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
            }
            catch (e) {
              // Display error message
              scope.errorMsg = 'nothing is supported';
            }
          }
        
        });//END take picture 'on' event
      }


    }//link
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

function generateKey() {
  return 'xxxxxxxxxxxx-4xxxyxxxxxx99xx-xxxxx00xxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
}



