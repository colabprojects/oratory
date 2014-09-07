// problem with browser navigation (going back will lock the item) - also you can delete a locked item



//the angular magic:
var itemApp = angular.module('itemApp', []);
//message triggers:
var sent = false;
var emailSet = false;
//default item image:
var defaultImage = "images/default.jpg";
//cookies:
var email = $.cookie('email');
var items = {};

$('#add-help').hover( function() { $('#column-labels').fadeTo('normal',0); });

//############################################################################################################################################################
//ITEM CONTROLLER ############################################################################################################################################################
//############################################################################################################################################################

itemApp.controller('itemCtrl', function ($scope, $http) {
  //view settings:
  $scope.showForm = false;
  $scope.showUpdateButton=false;
  $scope.showAddItemHelp=false;
  $scope.showItemHistory=false;
  //boolean defaults:
  $scope.false = false;
  $scope.true = true;
  //get email
  $scope.email = email;
  //initilize items
  $http.get('/api/getItems').then(function (response) {
    $scope.items = response.data;
  });
  //get deleted items
  $http.get('/api/getDeletedItems').then(function (response) {
    $scope.deletedItems = response.data;
  });
  //initilize empty item
  $scope.item = {};
  //refresh selected items
  $scope.selected = {};
  //initilize locations
  $scope.locations=['Other (add one)'];
  $http.get('/api/getLocations').then(function (response) {
    for (var i = 0, len = response.data.length; i < len; i++) {
      $scope.locations.push(response.data[i].name);
    }
  }); //end getLocations

  //FUNCTIONS ----------------------------------------------------------------------------------------------------------------------------
  $scope.refreshItems = function () {
    $http.get('/api/getItems').then(function (response) {
      $scope.items = response.data;
    });
  };//end refreshItems

  $scope.cancelForm = function () {
    $scope.showForm = false;
    $scope.showAddItemHelp = false;
    //remove email warning becasue it is outside of the form
    $('#req-email-input').removeClass('req-alert-on-left');
  };//end cancelForm ---------------

  $scope.addItemClick = function () {
    $scope.item = {};
    $scope.newItem = true;
    //defaults for new item:
    $scope.item.quantity = 1;
    $scope.item.need = 'have';
    $scope.imageSearchHref = '';
    //view settings
    $scope.showUpdateButton = false;
    $scope.showForm = true;
    $scope.showAddItemHelp = true;
    //set and check required fields
    $scope.reqCheck();
  };//end addItemClick ---------------

  $scope.addItem = function () {
    //save location if new
    $scope.saveLocation();
    //refresh $scope.items
    $scope.refreshItems();
    //set item stuff
    $scope.item['uid'] = generateUID();
    $scope.item['type'] = 'item';
    $scope.item['number'] = $scope.items.length + 1;
    //save image if specified
    //set image if no url specified (this could be made as a function - maybe a list of most used images or generic ones?)
    if (($scope.item.imageURL == '')||(typeof $scope.item.imageURL == 'undefined')) { 
      $scope.item.thumb = defaultImage; 
    }else{
      $scope.saveImage($scope.item);
      $scope.item['image'] = 'images/items/'+$scope.item.uid+'/itemImage.jpg';
      $scope.item['thumb'] = 'images/items/'+$scope.item.uid+'/itemThumb.jpg'; 
    }
    //set 'hidden' fields
    $scope.item['posted'] = generateDate(); 
    $scope.item['owner'] = $scope.email;
    //save - then refresh $scope.items
    $http.post('/api/saveItem', $scope.item).success(function (data) { 
      $scope.refreshItems();
    });
    //change view settings
    $scope.showForm = false;
    delete $scope.item;
  }; //end addItem ---------------

  $scope.removeItem = function (itemR) {
    $http.post('/api/removeItem', itemR).success(function () {
      $('#'+itemR.uid).addClass('deleted-item-row');
      $('#trash'+itemR.uid).remove();
    });
  }; //end removeItem ---------------

  $scope.showItemHistory = function(itemUID) {
    if ($scope.showItemHistory[itemUID] == true) { return true; }else { return false; }
  }; //end showItemHistory

  $scope.showHistory = function (itemH) {
    $http.post('/api/getItemHistory', itemH).success(function (docs) {
      $scope.showItemHistory[itemH.uid] = true;
      $('#history-'+itemH.uid).html('<p>' + JSON.stringify(docs) + '</p>');
    });
  }; //end showHistory ---------------

  $scope.hideHistory = function (itemUID) {
    $scope.showItemHistory[itemUID]=false;
  }; //end hideHistory ---------------

  $scope.updateItem = function () {
    //remove _id
    delete $scope.item._id;
    //timestamp for update
    $scope.item['updated'] = generateDate();
    //check to see who is editing
    if ($scope.item.owner == $scope.email) { //this is the standard update call  <<<<<<<<<<<<<
      //add location if new
      $scope.saveLocation();
      //add image if changed!
      if (($scope.item.thumb == defaultImage)&&(typeof $scope.item.imageURL != 'undefined')&&($scope.item.imageURL!='')) {
        //item image has changed
        $scope.item['image'] = 'images/items/'+$scope.item.uid+'/itemImage.jpg';
        $scope.item['thumb'] = 'images/items/'+$scope.item.uid+'/itemThumb.jpg'; 
        $scope.saveImage($scope.item);
      }
      //update the item
      $http.post('/api/updateItem', $scope.item).success(function (err, doc) { 
        //refresh scope.items
        $scope.refreshItems();
      });
    } else { //stage item if different author (have a function to change ownership - maybe in the body of the email!)  <<<<<<<<<<<<<
      $scope.item['updatedBy'] = $scope.email;
      //set stage lock
      $scope.item['stageLock'] = true;
      //unselect item
      
      var key = generateUID();
      //the following creates a staged item that can be converted or 'unstaged' by a call to /api/unstage/<key>
      $http.post('/api/stageItem', { actionKey:key, data:$scope.item });
      $scope.itemChangeEmailGen($scope.item, key);
    }
    //change view settings
    $scope.showForm = false;
    //remove selected
    $scope.selected[$scope.item.uid] = false; 
    //remove form binding
    delete $scope.item;

  }; //end updateItem ---------------

  $scope.editItem = function (fnitem) {
    //set the form field bindings
    $scope.item = fnitem;
    $scope.newItem = false;
    //set an edit lock interval (locks for 20seconds)
    $http.post('/api/tempLock', {email:$scope.email, uid:$scope.item.uid}).then(function(){ $scope.refreshItems(); });
    setTimeout(function() { $scope.refreshItems(); }, 21000);
    //change view settings
    $scope.showUpdateButton=true;
    $scope.showForm=true;
    //set and check required fields
    $scope.reqCheck();
  }; //end editItem ---------------

  $scope.selectItem = function (fnitem) {
    //set the form field bindings
    if ($scope.selected[fnitem.uid] == true) { //item was already selected
      $scope.selected[fnitem.uid] = false;
    } else { //item is not selected
      //check for locks (fetch new item data in case of change):
      $http.post('/api/getItem', {uid:fnitem.uid}).then(function (response) {
        var refreshedItem = {};
        refreshedItem = response.data;
        if(refreshedItem.lock||refreshedItem.stageLock) {
          //locked
        } else {
          //item is not locked
          $scope.selected[refreshedItem.uid] = true;
        }
      });
    }
  }; //end selectItem ---------------

  $scope.setEmailCookie = function () {
    $.cookie('email', $scope.email);
    //$.cookie('key')
  };//end setEmailCookie ---------------

  $scope.saveLocation = function () {
    if ($scope.item.loc == 'Other (add one)') { 
      $http.post('/api/saveLocation', {type:'location', name:$scope.item.other}).success(function (err, doc) {});
      $scope.item.loc = $scope.item.other;
      $scope.item.other = '';
      $scope.locations.push($scope.item.loc);
    }//end if
  }; //end saveLocation ---------------

  $scope.showOtherLocationField = function () {
    //this opens the element for new location (could be made better - where should this be placed? might be able to combine with saveLocation)
    if (typeof $scope.item =='undefined') { return false; }
    else if($scope.item.loc == 'Other (add one)'){ 
      return true; } 
    else { return false; }
  }; //end showOtherLocationField ---------------

  $scope.saveImage = function (itemI) {
    //save the image from the specified url
    $http.post('/api/saveImage', itemI).success(function (err, doc) {});
  }; //end saveImage ---------------

  $scope.imageSearch = function () {
    console.log($scope.item.name);
    $scope.imageSearchHref = 'https://www.google.com/search?q='+encodeURIComponent($scope.item.name)
    $scope.imageSearchText = $scope.item.name;

  }; //end imageSearch ---------------


  $scope.pushToItem = function (itemP, pushP, valueP) {
    var itemPush = {
      push: pushP,
      pushToUID: itemP.uid,
      value: valueP
    };
    $http.post('/api/pushToItem', itemPush).then(function (err, doc) { $scope.refreshItems(); });
  }; //end pushToItem ---------------

  $scope.reqCheck = function () {
    var emailGood=false;
    var nameGood=false;
    var imageGood=true; //quasi required - if entered it must be vaild
    var receiptGood=true; //quasi required

    //check email
    if (checkEmail($scope.email)) {//email valid
      $('#req-email-input').removeClass('req-alert-on-left');
      emailGood=true;
    } else {//email NOT valid
      $('#req-email-input').addClass('req-alert-on-left');
    }

    //check name
    if ((typeof $scope.item.name =='undefined')||($scope.item.name=='')) {//name NOT valid
      $('#req-name-input').addClass('req-alert-on-left');
    } else {//name valid
      $('#req-name-input').removeClass('req-alert-on-left');
      nameGood=true;
    }

    //check image url
    if ((typeof $scope.item.imageURL != 'undefined')&&($scope.item.imageURL!='')) {//something is there
      if (checkURL($scope.item.imageURL)){//url vaild
        $('#quasireq-ImageUrl').removeClass('req-alert-on-left');
        imageGood=true;
      }else{//url NOT valid
        $('#quasireq-ImageUrl').addClass('req-alert-on-left');
        imageGood=false;
      } 
    }else{//cancel the requirment
      $('#quasireq-ImageUrl').removeClass('req-alert-on-left');
      imageGood=true;
    }

    //check receipt url
    if ((typeof $scope.item.receiptURL != 'undefined')&&($scope.item.receiptURL!='')) {//something is there
      if (checkURL($scope.item.receiptURL)){//url vaild
        $('#quasireq-receiptUrl').removeClass('req-alert-on-left');
        receiptGood=true;
      }else{//url NOT valid
        $('#quasireq-receiptUrl').addClass('req-alert-on-left');
        receiptGood=false;
      } 
    }else{//cancel the requirment
      $('#quasireq-receiptUrl').removeClass('req-alert-on-left');
      receiptGood=true;
    }

    if (emailGood&&nameGood&&imageGood&&receiptGood) {
      //all good - remove disabled from update and add buttons
      $('#addButton').prop("disabled", false);
      $('#updateButton').prop("disabled", false);
      $scope.showAddItemHelp=false;
    } else {
      //not good
      $('#addButton').prop("disabled", true);
      $('#updateButton').prop("disabled", true);
    }
  };//end reqCheck ---------------  

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

function checkEmail(email) {
  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
}

function checkURL(url) {
  var regex = new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_\+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?");
  return regex.test(url);
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
