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
  
  $scope.items=[];
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
    var $temps=[];
    var currentdate = new Date(); 
    var datetime = (currentdate.getMonth()+1) + "/"
                + currentdate.getDate() + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();

    if ($scope.itemLoc == 'Other (add one)') { $scope.itemLoc = $scope.itemLocOther; }
      
    $scope.item = {
      uid: $uidd,
      posted: datetime,
      type:'item', 
      name:$scope.itemName,
      description:$scope.itemDescription,
      location: $scope.itemLoc,
      quantity:$scope.itemQuantity,
      comment:$scope.itemComment,
      image:$scope.itemImage,
      imagetb:$scope.itemImagetb,
      temp:$temps,
      edit:true
    };
    $scope.items.push($scope.item);

    $http.post('/api/saveItem', $scope.item)
    sent = true;
    showForm = false;
  
  }; //end additem

  $scope.driving = function() {
    if($scope.itemTrans == 'driving'){
      return true;
    } else {
      return false;
    }
  
  }; //end driving

  $scope.newLocation = function() {
    if($scope.itemLoc == 'Other (add one)'){
      return true;
    } else {
      return false;
    }
  
  }; //end driving

  $scope.itemSent = function() {
    if(sent== true){
      return true;
    } else {
      return false;
    }
  
  }; //end itemSent

  $scope.showForm = function() {
    showForm = true;

  }; //end showForm

  $scope.itemEdit = function() {
    return showForm;
  
  }; //end itemSent

  $scope.findImage = function(thing) {
    thing.edit = true;
    $http.jsonp("https://ajax.googleapis.com/ajax/services/search/images?v=1.0&q="+ encodeURIComponent(thing.name) + "&callback=JSON_CALLBACK").success(function($data){
      thing.temp = $data.responseData.results;
    }).error(function() { alert("failed");});
    thing.editImage = true;
  }; //end findImage




}); // end itemCtrl
