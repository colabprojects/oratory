$scope.master.type='config';
$scope.master.pages = [
  {
    'id':1, 
    'name':'everything', 
    'sub':'on The Land', 
    'title':'add anything and search everything', 
    'type':''
  },
  {
    'id':2, 
    'name':'inventory', 
    'sub':'of items and resources', 
    'title':'add and update items', 
    'type':'item'
  }, 
  {
    'id':3, 
    'name':'projects', 
    'sub':'being worked on and formulated', 
    'title':'add, participate in, or propose projects', 
    'type':'project'
  }, 
  {
    'id':4, 
    'name':'books', 
    'sub':'in the library on The Land', 
    'title':'add or browse books', 
    'type':'book'
  }, 
  {
    'id':5, 
    'name':'map', 
    'sub':'of The Land', 
    'title':'view and add stuff', 
    'type':'map',
    'showMap':true
  }, 
  {
    'id':6, 
    'name':'calendar', 
    'sub':'of events related to The Land', 
    'title':'see when people are coming or say when you are coming',
    'type':'calendar',
    'showCalendar':true
  }
];
 $scope.master.defaults = {
  'item':{
    fields:['need','description','location','quantity','imageURL','price','receiptURL'],
    color:'#218559',
    radio:{
      need:{first:'have', second:'want'}
    }
  },
  'project':{
    fields:['need','description','location'],
    color:'#EBB035'
  },
  'book':{
    fields:['need','description','location'],
    color:'#876f69'
  },
  'map':{
    fields:[],
    color:'#8F4F2D'
  },
  'calendar':{
    fields:[],
    color:'#8F4F2D'
  },
  'media':{
    fields:['imageURL'],
    color:'#8F4F2D'
  },
  'money':{
    fields:['price'],
    color:'#8F4F2D'
  },
  'misc':{
    fields:[],
    color:'#8F4F2D'
  }
};
$scope.master.fieldTypes = {
  'description':'textarea', 
  'location':'text', 
  'need':'radio',
  'location':'text',
  'quantity':'text',
  'imageURL':'text',
  'price':'text',
  'receiptURL':'text'
};
