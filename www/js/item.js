var item = angular.module('item', []);
var sent = false;
var showForm = false;
var showUpdateButton=false;
debug=[];

//ITEM CONTROLLER -----------------------------------------------------------------
item.controller('itemCtrl', function($scope, $http) {
  
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


  //ITEM FUNCTIONS ----------------------------------------------------------------
  $scope.addItem = function() {
    var uidd=generateUID();
    var datetime=generateDate();
    
    //save location if new
    if ($scope.itemLoc == 'Other (add one)') {  
      $http.post('/api/saveLocation', {type:'location', name:$scope.itemLocOther});
      $scope.itemLoc = $scope.itemLocOther;
      $scope.locations.push($scope.itemLoc); 
    }

    //set image if no url specified
    if (typeof $scope.itemImageUrl == 'undefined') { $scope.itemImageUrl = "http://s3.timetoast.com/public/uploads/photos/1687876/Unknown-7_small_square.jpeg?1312881542"; }
      
    $scope.item = {
      uid: uidd,
      type:'item', 
      posted:datetime,
      edited:"never",
      name:$scope.itemName,
      number:$scope.items.length + 1,
      description:$scope.itemDescription,
      location:$scope.itemLoc,
      quantity:$scope.itemQuantity,
      comment:$scope.itemComment,
      image:$scope.itemImageUrl,
      imagetb:$scope.itemImageTb,
      temp:'',
      edit:true,
      deleted:false
    };

    $scope.items.push($scope.item);

    $http.post('/api/saveItem', $scope.item);
    sent = true;
    showForm = false;
  
  }; //end addItem

  $scope.removeItem = function(itemUID) {
    $http.post('/api/removeItem', JSON.stringify({uid:itemUID}));
    $('#'+itemUID).css('background-color','#EDE');
  }; //end removeItem

  $scope.updateItem = function(itemUID) {
    $http.post('/api/updateItem', JSON.stringify({uid:itemUID}));
  }; //end updateItem

  $scope.selectItem = function(item) {
    $('#'+item.uid).css('border','1px dashed #EEE');
    debug=item;
    showUpdateButton=true;
    showForm=true;
  };

  $scope.returnItem = function(itemUID) {
    $http.post('/api/returnItem', JSON.stringify({uid:itemUID}));
  }; //end returnItem

  $scope.newLocation = function() {
    if($scope.itemLoc == 'Other (add one)'){ return true; } else { return false; }
  }; //end newLocation

  $scope.showForm = function() {
    return showForm;
  };//end showForm

  $scope.showUpdateButtonFunction = function() {
    return showUpdateButton;
  };//end showForm

  $scope.addItemClick = function() {
    showForm = true;
  };//end addItemClick

  $scope.cancelForm = function() {
    showForm = false;
  };//end cancelForm

  $scope.testEmail = function() {
    $http.post('/sendemail');
  }//end testEmail

}); // end itemCtrl



//GENERAL FUNCTIONS and JQUERY ------------------------------------------------------
function generateUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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




