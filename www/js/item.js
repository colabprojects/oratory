var item = angular.module('item', []);
var sent = false;
var showForm = false;

//ITEM CONTROLLER -----------------------------------------------------------------
item.controller('itemCtrl', function($scope, $http) {
  
  //initilize items
  $http.get('/api/getItems').then(function (response) {
    $scope.items = response.data;
  }); //end getItems
  //initilize locations
  $http.get('/api/getLocations').then(function (response) {
    //$http.post('/api/saveLocation', {type:'location',name:'Other (add one)'});
    $scope.locations=['Other (add one)'];
    if (typeof response.data !== 'undefined') {
      response.data.foreach(function(loc){ 
        $scope.locations.push(loc);
      });
    }
    $scope.$apply();
  }); //end getLocations

  //functions
  $scope.addItem = function() {
    var uidd=generateUID();
    var datetime=generateDate();
    
    //save location if new
    if ($scope.itemLoc == 'Other (add one)') {  
      $http.post('/api/saveLocation', {type:'location', name:JSON.stringify($scope.itemLocOther)});
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
    $('#'+itemUID).css('background-color','#DDD');
  }; //end removeItem

  $scope.updateItem = function(itemUID) {
    $http.post('/api/updateItem', JSON.stringify({uid:itemUID}));
  }; //end updateItem

  $scope.returnItem = function(itemUID) {
    $http.post('/api/returnItem', JSON.stringify({uid:itemUID}));
  }; //end returnItem

  $scope.newLocation = function() {
    if($scope.itemLoc == 'Other (add one)'){ return true; } else { return false; }
  }; //end newLocation

  $scope.showForm = function() {
    return showForm;
  };//end showForm

  $scope.addItemClick = function() {
    showForm = true;
  };//end addItemClick

  $scope.cancelForm = function() {
    showForm = false;
  };//end cancelForm

}); // end itemCtrl



//GENERAL FUNCTIONS and JQUERY -------------------------------------------------------
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

//-------------------------------------------------------------------------------------




