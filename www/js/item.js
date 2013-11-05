function uniqueIdGen() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}


function itemCtrl($scope, $http) {

  $http.defaults.useXDomain = true;
  delete $http.defaults.headers.common['X-Requested-With'];
  
  //initilize items
  $scope.items = [];
 
  $scope.types = ["tool", "robot", "material", "vehicle", "toph"];
  $scope.locations = ["On Site", "On the way...", "Needed!"]
  
  var locations = [ ["On Site", "alert alert-success"], ["On the way down...", "alert alert-warning"], ["Needed!", "alert alert-danger"] ];
  
  $scope.itemCount = 0;
  
  //functions
  //--------------------------------------------------------
  $scope.addItem = function() {
  	var $uidd=uniqueIdGen();
  	var $temps=[];
    	
    $scope.items[$scope.itemCount] = {
    	uid: $uidd,
    	id:$scope.itemCount,
    	_rev:'',
    	url:'',
    	type:$scope.itemType, 
    	name:$scope.itemName,
    	description:'',
    	author:'anonymous', 
    	image: 'http://t0.gstatic.com/images?q=tbn:ANd9GcQk9BnJhIjd7Smyv1MabuVHp3Ioqbz80PEzjO7HmeVfkcUaXOkKKwK_l5g',
    	temp: $temps,
    	editImage:false, 
    	active:true,
    	location:locations[0],
    	edit:true
    };
    
    //clear add bar fields
    $scope.itemName = '';
    $scope.itemType = '';
    
     $scope.itemCount++;
     
    //remove the hint/tip bar
    $("#demoStart").html('');
        
  };
  
  //--------------------------------------------------------
  
  $scope.findImage = function(thing) {
  	  thing.edit = true;
      $http.jsonp("https://ajax.googleapis.com/ajax/services/search/images?v=1.0&q="+ encodeURIComponent(thing.name) + "&callback=JSON_CALLBACK").success(function($data){
	      thing.temp = $data.responseData.results;
      }).error(function() { alert("failed");});
      thing.editImage = true;
  };
  
  //--------------------------------------------------------
  
  $scope.setImage = function(thing, tbUrl) {
      thing.image = tbUrl;
      thing.editImage = false;
  };
  
  //--------------------------------------------------------
  
  $scope.cancelImage = function(thing) {
      thing.editImage = false;
  };
  
  //--------------------------------------------------------
  
  $scope.closeItemEdit = function(id) {
      $scope.items[id].edit = false;
  };
  
  //--------------------------------------------------------
  
  $scope.openItemEdit = function(id) {
      $scope.items[id].edit = true;
      $scope.items[id].editImage = true;
  };




}

