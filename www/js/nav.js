function uniqueIdGen() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}


function navCtrl($scope, $http) {

  $http.defaults.useXDomain = true;
  delete $http.defaults.headers.common['X-Requested-With'];

  $scope.templates = [ 
  	{ name: '+', url: 'additem.html', active: 'active'}, 
  	{ name: 'test', url: 'test.html', active: ''}, 
  	{ name: 'more', url: 'more.html', active: ''}, 
  ];
  $scope.template = $scope.templates[0];
  
  $scope.navChange = function ($i) {
	$scope.template = $scope.templates[$i];
	//alert('changing to page ' + $scope.template.name);
	
  };

}

