var upload=document.getElementById('upload');
var itemarea= document.getElementById('itemarea');
var maxHP =100;
var files=[];


function itmdiv() {
  var uploadedandHP=document.createElement('div');
  uploadedandHP.className='uploadedandHP';
  return uploadedandHP; 
}


function item(file){
  var item =document.createElement('img');
  item.src =URL.createObjectURL(file); 
  item.className='uploaded';
  return item; 
}

function HP_() {
  var HP = document.createElement('div');
  HP.className = 'HP';
  return HP; 
}


function iteminfo(uploadedandHP, item, HP) {
  var iteminfo ={
    uploadedandHP: uploadedandHP, 
    item: item,               
    HP__: HP,                  
    HP: maxHP,                     
    lastopen: Date.now(),           
    zoomin: false                   
  };
  return iteminfo; 
}


upload.addEventListener('change', function(e) {
  var uploadeditem = e.target.files[0];


  var newitmdiv = itmdiv();
  var newitm =item(uploadeditem);
  var newHP=HP_();
  newitmdiv.appendChild(newitm);
  newitmdiv.appendChild(newHP);

  itemarea.appendChild(newitmdiv);


  var newitminfo = iteminfo(newitmdiv, newitm, newHP);
  files.push(newitminfo);//add itin 

  console.log("input a new item OK", newitminfo);




  var offsetX, offsetY, dragging = false;

  newitmdiv.addEventListener('mousedown', function(e) {
    dragging = true;
    offsetX = e.clientX-newitmdiv.offsetLeft;
    offsetY = e.clientY-newitmdiv.offsetTop;
    uploadedandHP.style.cursor ='grabbing';
  });

  document.addEventListener('mousemove', function(e) {
    if (dragging) {
      newitmdiv.style.left = (e.clientX - offsetX) + 'px';
      newitmdiv.style.top = (e.clientY - offsetY) + 'px';
    }
  });

  document.addEventListener('mouseup', function() {
    if (dragging) newitmdiv.style.cursor = 'grab';
    dragging = false;
    console.log("dragging");
  });//drag itm


  newitm.addEventListener('click', function() { 
    newitminfo.HP = maxHP; 
    newitminfo.lastopen = Date.now(); 
    newitminfo.HP__.style.background = 'rgb(29, 156, 29)'; 

    if (!newitminfo.zoomin) {
      var preview = document.createElement('div');
      preview.style.position = 'fixed';
      preview.style.top = '50%';
      preview.style.left = '50%';
      preview.style.transform = 'translate(-50%, -50%)';
      preview.style.padding = '10px';
      preview.style.borderRadius = '10px';//howtozoom in

      var bigitm = document.createElement('img');
      bigitm.src = newitm.src;
      bigitm.style.maxWidth = '80vw';//view
      bigitm.style.maxHeight = '80vh';
      preview.appendChild(bigitm);
      document.body.appendChild(preview);

      preview.addEventListener('click', function() {
        document.body.removeChild(preview);
        newitminfo.zoomin = false; // 
      });
      newitminfo.zoomin = true; // click adn zoom in
    }
  });
});

  
function updateHP(item, timenow) {
  var time= timenow -item.lastopen; 
  var lessHP = time* 0.008;
  item.HP= item.HP-lessHP;
  item.lastopen = timenow;
}


function HPbar(item) {
  var HPs= Math.max(0, Math.floor(item.HP));

  item.HP__.style.width =HPs +'%';//vary with it
  if (HPs < 40) {
    item.HP__.style.background='rgb(255, 0, 0)';
  } else {
    item.HP__.style.background='rgb(29, 156, 29)';
  }
}


function removeit(item, num) {
  item?.uploadedandHP?.remove();//item and upHP exist...

}
  console.log("remove the pic now");



setInterval(function() {
  var timenow =Date.now(); 
  for(var i=0; i<files.length;i=i+1) {
    var itmuploaded =files[i];
    updateHP(itmuploaded, timenow);
  
    if (itmuploaded.HP<=0) {
      removeit(itmuploaded, i);
    } else {

      HPbar(itmuploaded);
    }
  }
}, 100);