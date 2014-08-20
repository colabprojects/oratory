//the angular magic:
var itemApp = angular.module('itemApp', []);
//view settings:
var showForm = false;
var showUpdateButton=false;
//message triggers:
var sent = false;
var emailSet = false;
//cookies:
var email = $.cookie('email'); 

//############################################################################################################################################################
//ITEM CONTROLLER ############################################################################################################################################################
//############################################################################################################################################################

itemApp.controller('itemCtrl', function ($scope, $http) {
  //get email
  $scope.email = email;
  //initilize items
  $http.get('/api/getItems').then(function (response) {
    $scope.items = response.data;
  }); //end getItems
  //initilize locations
  $scope.locations=['Other (add one)'];
  $http.get('/api/getLocations').then(function (response) {
    for (var i = 0, len = response.data.length; i < len; i++) {
      $scope.locations.push(response.data[i].name);
    }
  }); //end getLocations

  //ITEM FUNCTIONS ----------------------------------------------------------------------------------------------------------------------------
  $scope.addItem = function () {
    //save location if new
    $scope.addLocation();
    //set image if no url specified (this could be made as a function - maybe a list of most used images or generic ones?)
    if (($scope.item.image == '')||(typeof $scope.item.image == 'undefined')) { $scope.item.image = "http://s3.timetoast.com/public/uploads/photos/1687876/Unknown-7_small_square.jpeg?1312881542"; }
    //set 'hidden' fields
    $scope.item['uid'] = generateUID();
    $scope.item['type'] = 'item';
    $scope.item['number'] = $scope.items.length + 1; 
    $scope.item['posted'] = generateDate(); 
    $scope.item['owner'] = $scope.email;
    //save - then add to the ng-repeat
    $http.post('/api/saveItem', $scope.item).success(function (data) { 
      $scope.items.push(data); 
    });
    //remove form
    showForm = false;
    delete $scope.item;
  }; //end addItem ---------------

  $scope.removeItem = function (itemUID) {
    $http.post('/api/removeItem', JSON.stringify({ uid:itemUID })).success(function () {
      $('#'+itemUID).css('background-color','#EDE');
    });
    
  }; //end removeItem ---------------

  $scope.updateItem = function () {
    //remove _id
    delete $scope.item._id;
    //timestamp for update
    $scope.item['updated'] = generateDate();
    //check to see who is editing
    if ($scope.item.owner == $scope.email) { //this is the standard update call  <<<<<<<<<<<<<
      //add location if new
      $scope.addLocation();
      $http.post('/api/updateItem', $scope.item);
    } else { //stage item if different author (have a function to change ownership - maybe in the body of the email!)  <<<<<<<<<<<<<
      $scope.item['updatedBy'] = $scope.email;
      
      var key = generateUID();

      //the following creates a staged item that can be converted or 'unstaged' by a call to /api/unstage/<key>
      $http.post('/api/stageItem', { actionKey:key, data:$scope.item });
      $scope.itemChangeEmailGen($scope.item, key);
    }

    showForm = false;
    delete $scope.item;

  }; //end updateItem ---------------

  $scope.selectItem = function (fnitem) {
    //set the form field bindings
    $scope.item = fnitem;
    showUpdateButton=true;
    showForm=true;
  }; //end selectItem ---------------

  //PAGE FUNCTIONS ----------------------------------------------------------------------------------------------------------------------------
  $scope.setEmailCookie = function () {
    $.cookie('email', $scope.email);
  };//end setEmailCookie ---------------

  $scope.addLocation = function () {
    if ($scope.item.loc == 'Other (add one)') { 
      $http.post('/api/saveLocation', {type:'location', name:$scope.item.other}).success(function() {
        $scope.item.loc = $scope.item.other;
        $scope.item.other = '';
        $scope.locations.push($scope.item.loc); 
      });
    }//end if
  }; //end addLocation ---------------

  $scope.showForm = function () {
    return showForm;
  };//end showForm ---------------

  $scope.showOtherLocationField = function () {
    //this opens the element for new location (could be made better - where should this be placed? might be able to combine with addLocation)
    if (typeof $scope.item =='undefined') { return false; }
    else if($scope.item.loc == 'Other (add one)'){ 
      return true; } 
    else { return false; }
  }; //end showOtherLocationField ---------------

  $scope.showUpdateButtonFunction = function () {
    return showUpdateButton;
  };//end showUpdateButtonFunction ---------------

  $scope.addItemClick = function () {
    $scope.item = {};
    showForm = true;
  };//end addItemClick ---------------

  $scope.cancelForm = function () {
    showForm = false;
    console.log('canceled form')
  };//end cancelForm ---------------


  //remember to send this funtion the entire item - it may get deleted before it can be sent
  $scope.itemChangeEmailGen = function (itemX, actionKey) {
    var packageEmail = {};
    packageEmail.to = itemX.owner;
    packageEmail.subject = "[inventory] changes have been made to " + itemX.name;
    packageEmail.HTMLbody += "here is the full item:<br/>";
    packageEmail.HTMLbody += JSON.stringify(itemX) + "<br/>";
    packageEmail.HTMLbody += "do you approve?<br/>";
    packageEmail.HTMLbody += "<a href='http://127.0.0.1:55656/api/unStage/"+actionKey+"/true'>YES!</a>"

    $http.post('/api/sendEmail',packageEmail);
  }//end itemChangeEmailGen ---------------


  //testing get single item
  $http.post('/api/getItem', JSON.stringify({ uid:'7fd09d83-24df-4439-86b6-91e2c0245931'})).success(function(data){
    //success function
    testes = data; //WORKS!
  });

}); // end itemCtrl #########


//############################################################################################################################################################
//GENERAL FUNCTIONS ############################################################################################################################################################
//############################################################################################################################################################

function generateUID() {
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
  });
}

function generateDate() {
  var currentdate = new Date(); 
  var datetime = (currentdate.getMonth()+1) + "/"
                + currentdate.getDate() + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
  return datetime;
}

$('#itemForm').click(function(e){
      e.preventDefault();
});
