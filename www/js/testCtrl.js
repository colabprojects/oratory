function testCtrl($scope, $http) {

  $http.defaults.useXDomain = true;
  delete $http.defaults.headers.common['X-Requested-With'];
  
  //vars
  $scope.test = [];
  
  //functions
  //--------------------------------------------------------
  $scope.testFunction = function() {

  	var $temps=[];
  	
    $("#jquery").html('');  
      
  };



}

