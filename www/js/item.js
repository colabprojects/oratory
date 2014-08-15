var item = angular.module('item', []);
var sent = false;
var showForm = false;

function uniqueIdGen() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

$('#itemForm').click(function(e){
      e.preventDefault();
});

item.controller('itemCtrl', function($scope, $http) {
  
  $scope.itemLoc="Please select";  
  
  //initilize items

  $http.get('/api/getItems').then(function (response) {
    $scope.items = response.data;

    //grab new locations
    $scope.locations = ["None", "Pittsburgh", "Boulder", "New York"];
    for (var i=0; i < $scope.items.length; i++) {
      var loc = $scope.items[i].location;
      if (($.inArray(loc, $scope.locations) == -1) && (typeof loc !== 'undefined') && (loc !== 'Other (add one)')){
        $scope.locations.push(loc);
      }
    } 
    //put other at the end
    $scope.locations.push("Other (add one)");
  }); //end getitems
  


  //functions
  //--------------------------------------------------------
  $scope.addItem = function() {
    var $uidd=uniqueIdGen();
    var currentdate = new Date(); 
    var datetime = (currentdate.getMonth()+1) + "/"
                + currentdate.getDate() + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();

    if ($scope.itemLoc == 'Other (add one)') { $scope.itemLoc = $scope.itemLocOther; }
    if (typeof $scope.itemImageUrl == 'undefined') { $scope.itemImageUrl = "http://s3.timetoast.com/public/uploads/photos/1687876/Unknown-7_small_square.jpeg?1312881542"; }
      
    $scope.item = {
      uid: $uidd,
      posted:datetime,
      edited:"never",
      type:'item', 
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
    if($scope.itemLoc == 'Other (add one)'){
      return true;
    } else {
      return false;
    }
  
  }; //end newLocation

  $scope.showForm = function() {
    return showForm;
  
  }; //end showForm

  $scope.addItemClick = function() {
    showForm = true;
  }; //end addItemClick

  $scope.cancelForm = function() {
    showForm = false;
  };



}); // end itemCtrl
