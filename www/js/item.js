//the angular magic:
var itemApp = angular.module('itemApp', []);
//view settings:
var showForm = false;
var showUpdateButton=false;
//message triggers:
var sent = false;
var emailSet = false;
//cookies:
//var email = $.cookie('email'); 

//ITEM CONTROLLER -----------------------------------------------------------------
itemApp.controller('itemCtrl', function($scope, $http) {
  
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


  //ITEM FUNCTIONS ------------------------------------
  $scope.addItem = function() {
    
    //save location if new
    $scope.addLocation();

    //set image if no url specified (this could be made as a function - maybe a list of most used images or generic ones?)
    if (($scope.item.image == '')||(typeof $scope.item.image == 'undefined')) { $scope.item.image = "http://s3.timetoast.com/public/uploads/photos/1687876/Unknown-7_small_square.jpeg?1312881542"; }
      
    $scope.item['uid'] = generateUID();
    $scope.item['type'] = 'item';
    $scope.item['number'] = $scope.items.length + 1; 
    $scope.item['posted'] = generateDate(); 

    //add to the ng-repeat and save (probably should be doing this differently - like it adds once it saves...)
    $scope.items.push($scope.item);
    $http.post('/api/saveItem', $scope.item);

    showForm = false;
    delete $scope.item;
  
  }; //end addItem ------------------------------------

  $scope.removeItem = function(itemUID) {
    $http.post('/api/removeItem', JSON.stringify({ uid:itemUID }));
    $('#'+itemUID).css('background-color','#EDE');
  }; //end removeItem ------------------------------------

  $scope.updateItem = function() {
    //add location if new
    $scope.addLocation();

    $scope.item['updated'] = generateDate();
    $http.post('/api/updateItem', $scope.item);

    showForm = false;
    delete $scope.item;
  }; //end updateItem ------------------------------------

  $scope.selectItem = function(fnitem) {
    //set the form field bindings
    $scope.item = fnitem;
    showUpdateButton=true;
    showForm=true;
  }; //end selectItem ------------------------------------

  $scope.checkLocation = function() {
    //this opens the element for new location (could be made better - where should this be placed? might be able to combine with addLocation)
    if (typeof $scope.item =='undefined') { return false; }
    else if($scope.item.loc == 'Other (add one)'){ 
      return true; } 
    else { return false; }
  }; //end checkLocation ------------------------------------

  $scope.addLocation = function () {
    if ($scope.item.loc == 'Other (add one)') { 
      $http.post('/api/saveLocation', {type:'location', name:$scope.item.other});
      $scope.item.loc = $scope.item.other;
      $scope.item.other = '';
      $scope.locations.push($scope.item.loc); 
    }
  }; //end addLocation ------------------------------------

  $scope.showForm = function() {
    return showForm;
  };//end showForm ------------------------------------

  $scope.showUpdateButtonFunction = function() {
    return showUpdateButton;
  };//end showForm ------------------------------------

  $scope.addItemClick = function() {
    $scope.item = {};
    showForm = true;
  };//end addItemClick ------------------------------------

  $scope.cancelForm = function() {
    showForm = false;
    console.log('canceled form')
  };//end cancelForm ------------------------------------

  $scope.testEmail = function() {
    $http.post('/sendemail');
  }//end testEmail ------------------------------------


//testing get single item
  $http.post('/api/getItem', JSON.stringify({ uid:'7fd09d83-24df-4439-86b6-91e2c0245931'})).success(function(data){
    //success function
    testes = data; //WORKS!
  });

}); // end itemCtrl



//GENERAL FUNCTIONS and DEFAULTS ---------------------------------------------------------
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

//------------------------------------------------------------------------------------





