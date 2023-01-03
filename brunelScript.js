// GLOBAL VARIABLES
var dbVersion=3;
var name=''; // drawing name
var aspect=null;
var scale=1; // default scale is 1:1
var hand='left';
var gridSize=300; // default grid size is 300mm
var gridSnap=false; // grid snap off by default
var scaleF=3.78; // default scale factor for mm (1:1 scale)
var handleR=2; // 2mm handle radius at 1:1 scale - increase for smaller scales (eg. 100 at 1:50)
var boxR=5; // radius for corners of round-cornered boxes
var rad=0; // ditto for current box
var snapD=2*scale; // 2mm snap distance at 1:1 scale - increase for smaller scales (eg. 100 at 1:50)
// var snapD=5*scale; // 5mm snap distance at 1:1 scale - increase for smaller scales (eg. 250 at 1:50)
var snap=false; // flags if snapping to a node
var zoom=1; // start zoomed out to full drawing
var mode=null;
var scr={}; // screen size .w & .h and cursor coordinates .x & .y
var dwg={}; // drawing size .w & .h and offset .x & .y
var x=0;
var y=0;
var x0=0;
var y0=0;
var dx=0;
var dy=0;
var w=0;
var h=0; 
var datum1={'x':0,'y':0,'n':0};
var datum2={'x':0,'y':0,'n':0};
var offset={'x':0,'y':0};
var arc={};
var dim={};
var selectionBox={}; // for box select
var selection=[]; // list of elements in selectionBox
var selectedPoints=[]; // list of selected points in line or shape
var anchor=false; // flags existance of anchor
var db=null; // indexed database holding SVG elements
var nodes=[]; // array of nodes each with x,y coordinates and element ID
var dims=[]; // array of links between elements and dimensions
var element=null; // current element
var elID=null; // id of current element
var memory=[]; // holds element states to allow undo
var node=0; // node number (0-9) within selected element
var blueline=null; // bluePolyline
var combi=null; // current combi
var combiID=null; // id of current combi
var lineType='solid'; // default styles
var lineShade='black';
var pen=0.25; // 0.25mm at 1:1 scale - increase for smaller scales (eg.12.5 at 1:50 scale)
var fillShade='white';
var opacity='1';
var textSize=5; // default text size
var textStyle='fine'; // normal text
var currentDialog=null;
var zoomLimit=2; // controls minimum zoom - setting of 2 for minimum zoom of 1

class Point {
    constructor(x,y) {
        this.x=x;
        this.y=y;
    }
}

scr.w=screen.width;
scr.h=screen.height;
dwg.x=dwg.y=0;
console.log("screen size "+scr.w+"x"+scr.h);
name=window.localStorage.getItem('name');
aspect=window.localStorage.getItem('aspect');
scale=window.localStorage.getItem('scale');
id('drawingName').innerHTML=name;
id('drawingScale').innerHTML=scale;
id('drawingAspect').innerHTML=aspect;
hand=window.localStorage.getItem('hand');
if(!hand) hand='left';
gridSize=window.localStorage.getItem('gridSize');
if(!gridSize) gridSize=300;
id('gridSize').value=gridSize;
gridSnap=window.localStorage.getItem('gridSnap');
console.log('recover gridSnap: '+gridSnap);
if(!gridSnap) gridSnap=0;
id('gridSnap').checked=(gridSnap>0)?true:false;
console.log('grid checked: '+id('gridSnap').checked);
id('zoom').innerHTML=zoom;
console.log('name: '+name+'; aspect: '+aspect+'; scale: '+scale+'; hand: '+hand+'; grid: '+gridSize+' '+gridSnap);
if(!aspect) {
    aspect=(scr.w>scr.h)?'landscape':'portrait';
    id('aspect').innerHTML=aspect;
    showDialog('newDrawingDialog',true);
}
else initialise();
setTimeout(function(){id('prompt').style.display='none'},5000);
// disable annoying pop-up menu
document.addEventListener('contextmenu', event => event.preventDefault());
// TOOLS
id('docButton').addEventListener('click',function() {
    id('drawingName').innerHTML=name;
    id('drawingScale').innerHTML=scale;
    id('drawingAspect').innerHTML=aspect;
    console.log('grid is '+gridSnap);
    showDialog('docDialog',true);
});
id('gridSnap').addEventListener('change',function() {
   gridSnap=(id('gridSnap').checked)?1:0;
   window.localStorage.setItem('gridSnap',gridSnap);
   console.log('grid is '+gridSnap);
});
id('gridSize').addEventListener('change',function() {
    gridSize=parseInt(id('gridSize').value);
    window.localStorage.setItem('gridSize',gridSize);
    console.log('grid is '+gridSize);
});
id('goofy').addEventListener('change',function() {
    if(id('goofy').checked) { // right-hand side layout
        hand='right';
        window.localStorage.setItem('hand','right');
    }
    else { // left-hand side layout
        hand='left';
        window.localStorage.setItem('hand','left');
    }
    setLayout();
});
id('helpButton').addEventListener('click',function() {
    window.open('brunel.pdf');
    cancel();
});
id('new').addEventListener('click',function() {
    alert('You may want to save your work before starting a new drawing');
    console.log("show newDrawingDialog - screen size: "+scr.w+'x'+scr.h);
    // showDialog('fileMenu',false);
    aspect=(scr.w>scr.h)?'landscape':'portrait';
    id('aspect').innerHTML=aspect;
    showDialog('newDrawingDialog',true);
});
id('createNewDrawing').addEventListener('click',function() {
    scale=id('scaleSelect').value;
    // units=(id('mm').checked)?'mm':'in';
    console.log('create new drawing - aspect:'+aspect+' scale:'+scale);
    window.localStorage.setItem('aspect',aspect);
    window.localStorage.setItem('scale',scale);
    name='';
    window.localStorage.setItem('name',name);
    elID=0;
    // CLEAR DRAWING IN HTML & DATABASE
    id('dwg').innerHTML=''; // clear drawing
    id('ref').innerHTML="<rect id='background' x='0' y='0' width='"+dwg.w+"' height='"+dwg.h+"' stroke='none' fill='white'/>"; // clear reference layer
    id('handles').innerHTML=''; // clear any edit handles
    // drawOrder();
    var request=db.transaction('graphs','readwrite').objectStore('graphs').clear(); // clear graphs database
	request.onsuccess=function(event) {
		console.log("database cleared");
	};
	request.onerror=function(event) {
		console.log("error clearing database");
	};
	// window.localStorage.setItem('order','');
    showDialog('newDrawingDialog',false);
    window.localStorage.setItem('name',name);
    initialise();
});
id('load').addEventListener('click',function() {
    id('replace').checked=true;
    showDialog('loadDialog',true); 
});
id('fileChooser').addEventListener('change',function() {
    // CLEAR graphs AND combis OBJECT STORES BEFORE LOADING NEW DRAWING DATA
    var method='replace';
    if(id('merge').checked) method='merge';
    else if(id('reference').checked) method='ref';
    else if(id('combi').checked) method='combi';
    console.log('load method: '+method);
    var file=id('fileChooser').files[0];
    console.log('load file '+file+' name: '+file.name);
    var loader=new FileReader();
    loader.addEventListener('load',function(evt) {
        var data=evt.target.result;
        console.log("file read: "+data);
		var json=JSON.parse(data);
		console.log("json: "+json);
		var transaction=db.transaction(['graphs','combis'],'readwrite');
		var graphStore=transaction.objectStore('graphs');
		var combiStore=transaction.objectStore('combis');
		if(method=='replace') {
		    name=file.name;
		    var n=name.indexOf('.json');
		    name=name.substr(0,n);
		    window.localStorage.setItem('name',name);
		    id('dwg').innerHTML=''; // clear drawing
            id('ref').innerHTML="<rect id='background' x='0' y='0' width='"+dwg.w+"' height='"+dwg.h+"' stroke='none' fill='white'/>"; // clear reference layer
            id('handles').innerHTML=''; // clear any edit handles
		    graphStore.clear();
		    combiStore.clear();
		    nodes=[];
		    dims=[];
		    // window.localStorage.setItem('order','');
		    aspect=json.aspect;
		    window.localStorage.setItem('aspect',aspect);
		    scale=json.scale;
		    window.localStorage.setItem('scale',scale);
		    console.log('load drawing - aspect:'+aspect+' scale:'+scale);
		    initialise();
		}
		else if(method=='merge') {
		    name='';
		    widow.localStorage.setItem('name','');
		}
		if(method=='combi') { // load selected combi
		    var name=json.name; // one combi per file
		    console.log("add "+name);
			var request=combiStore.add(json);
			request.onsuccess=function(e) {
			    var n=request.result;
				console.log("combi added to database: "+n);
			};
			request.onerror=function(e) {console.log("error adding combis");};
		}
		else { // load selected drawing 
		    for(var i=0;i<json.graphs.length;i++) {
		        console.log('add graph '+json.graphs[i].type);
		        if(method=='ref') {
		            if(json.graphs[i].type=='dim') continue; // skip dimensions
		            json.graphs[i].stroke='blue'; // reference layer in blue...
		            json.graphs[i].fill='none'; // ...with no fill
		            console.log('graph '+i+' set as blue outline'); 
		        }
		        var request=graphStore.add(json.graphs[i]);
		    }
		    for(i=0;i<json.combis.length;i++) {
		        console.log('add combi '+json.combis[i].name);
		        request=combiStore.add(json.combis[i]);
		    }
		}
		transaction.oncomplete=function() {
		    console.log('drawing imported - load & draw');
            if(method!='combi') load();
		}
    });
    loader.addEventListener('error',function(event) {
        console.log('load failed - '+event);
    });
    loader.readAsText(file);
    showDialog('loadDialog',false);
})
id('save').addEventListener('click',function() {
    name=window.localStorage.getItem('name');
    if(name) id('saveName').value=name;
    showDialog('saveDialog',true);
});
id('confirmSave').addEventListener('click',function() {
    name=id('saveName').value;
    console.log('save data to file: '+name+'.json');
    showDialog('saveDialog',false);
    fileName=name+".json";
    window.localStorage.setItem('name',name);
    var data={};
    data.aspect=aspect;
    data.scale=scale;
    data.graphs=[];
    data.combis=[];
    // var order=drawOrder();
    var transaction=db.transaction(['graphs','combis']);
    var request=transaction.objectStore('graphs').openCursor();
    request.onsuccess=function(event) {
        var cursor=event.target.result;
        if(cursor) {
            // console.log('graph: '+cursor.value.id);
            // var index=order.indexOf(Number(cursor.value.id)); // save graphs in drawing order
            // console.log('index: '+index);
            delete cursor.value.id;
            data.graphs.push(cursor.value);
            // data.graphs[index]=cursor.value;
            cursor.continue();
        }
        else {
            console.log('save '+data.graphs.length+' graphs');
            request=transaction.objectStore('combis').openCursor();
            request.onsuccess=function(event) {
                cursor=event.target.result;
                if(cursor) {  // SAVE WITHOUT id's ????
                    console.log('combi: '+cursor.value.name);
                    delete cursor.value.id; // SHOULDN'T NEED THIS
                    data.combis.push(cursor.value);
                    cursor.continue();
                }
                else {
                    console.log('save '+data.combis.length+' combis');
                }
            }
        }
    }
    transaction.oncomplete=function() {
        console.log('ready to save drawing data to file');
        var json=JSON.stringify(data);
        download(json,fileName,'text/plain');
    }
});
id('print').addEventListener('click',function() {
    // showDialog('fileMenu',false);
    reset();
    id('printName').value='';
    showDialog('printDialog',true);
});
id('confirmPrint').addEventListener('click',function() {
    if(id('printName').value.length<0) {
        prompt('OOPS');
        return;
    }
    saveSVG();
    showDialog('printDialog',false);
});
id('zoomInButton').addEventListener('click',function() {
    // prompt('ZOOM IN');
    zoom*=2;
    // console.log('zoom in to '+zoom);
    w=Math.round(dwg.w*scale/zoom);
    h=Math.round(dwg.h*scale/zoom);
    // console.log('new viewBox: '+ +','+dwg.y+' '+w+'x'+h);
    id('svg').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+w+' '+h);
    id('ref').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+w+' '+h);
    snapD/=2; // avoid making snap too easy
    handleR/=2; // avoid oversizing edit handles
    id('zoom').innerHTML=zoom;
});
id('zoomOutButton').addEventListener('click',function() {
    // prompt('ZOOM OUT');
    if(zoom<zoomLimit) return;
    zoom/=2;
    // console.log('zoom out to '+zoom);
    w=Math.round(dwg.w*scale/zoom);
    h=Math.round(dwg.h*scale/zoom);
    // console.log('new viewBox: '+dwg.x+','+dwg.y+' '+w+'x'+h);
    id('svg').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+w+' '+h);
    id('ref').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+w+' '+h);
    snapD*=2;
    handleR*=2;
    id('zoom').innerHTML=zoom;
});
id('extentsButton').addEventListener('click',function() {
    prompt('ZOOM ALL');
    reset();
});
id('panButton').addEventListener('click',function() {
    // console.log('pan mode');
    mode='pan';
    // prompt('PAN');
});
console.log('zoom; '+zoom+' w: '+w+' h: '+h);
// DRAWING TOOLS
id('lineButton').addEventListener('click',function() {
    // id('tools').style.display='none';
    mode='line';
    showSizes(true,'LINE: drag from start');
});
id('boxButton').addEventListener('click',function() {
    mode='box';
    rad=0;
    // id('tools').style.display='none';
    showSizes(true,'BOX: drag from corner');
});
id('ovalButton').addEventListener('click',function() { // OVAL/CIRCLE
    mode='oval';
    // id('tools').style.display='none';
    showSizes(true,'OVAL: drag to size');
})
id('arcButton').addEventListener('click', function() {
   mode='arc';
   // id('tools').style.display='none';
   showSizes(true,'ARC: drag from start');
});
id('textButton').addEventListener('click',function() {
    mode='text';
    // id('tools').style.display='none';
    prompt('TEXT: tap at start');
});
id('text').addEventListener('change',function() {
    var text=event.target.value;
    if(elID) { // change selected text
        element=id(elID);
        element.innerHTML=text;
        updateGraph(elID,['text',text]);
    }
    else {
        console.log('add text '+text);
        var graph={}
	    graph.type='text';
	    graph.text=text;
	    graph.x=x0;
        graph.y=y0;
        graph.spin=0;
        graph.flip=0;
        graph.textSize=textSize;
        graph.textStyle=textStyle;
	    graph.fill=lineShade;
	    graph.opacity=opacity;
	    addGraph(graph);
    }
    cancel();
});
id('dimButton').addEventListener('click',function() {
   mode='dimStart';
   // id('tools').style.display='none';
   prompt('DIMENSION: tap start node');
});
id('confirmDim').addEventListener('click',function() {
    dim.dir=document.querySelector('input[name="dimDir"]:checked').value;
    console.log(dim.dir+' selected');
    showDialog('dimDialog',false);
    id('blueDim').setAttribute('x1',dim.x1);
    id('blueDim').setAttribute('y1',dim.y1);
    id('blueDim').setAttribute('x2',(dim.dir=='v')? dim.x1:dim.x2);
    id('blueDim').setAttribute('y2',(dim.dir=='h')? dim.y1:dim.y2);
    id('guides').style.display='block';
    prompt('DIMENSION: drag to position');
    mode='dimPlace';
});
id('combiButton').addEventListener('click',function() {
    // id('tools').style.display='none';
    showDialog('combiDialog',true);
});
id('combiList').addEventListener('change',function() {
    console.log('choose '+event.target.value);
    combiID=event.target.value;
    console.log('combi '+combiID+' picked');
    mode='combi';
    prompt('COMBI: tap to place');
    id('combiList').value=null; // clear selection for next time
    showDialog('combiDialog',false);
});
// EDIT TOOLS
id('addButton').addEventListener('click',function() { // add point after selected point in line/shape
    var t=type(element);
    if((t!='line')&&(t!='shape')) return; // can only add points to lines/shapes
    console.log('add point');
    prompt('ADD POINT: tap on previous point');
    mode='addPoint';
    // showDialog('pointDialog',false);
});
id('deleteButton').addEventListener('click',function() {
    var t=type(element);
    if((t=='line')||(t=='shape')) {
        var points=element.points;
        if(selectedPoints.length>0) {  // remove >1 selected points
            prompt('REMOVE selected points');
            var pts='';
            for(var i=0;i<points.length;i++) {
                if(selectedPoints.indexOf(i)>=0) continue;
                pts+=points.x+','+points.y+' ';
            }
            element.setAttribute('points',pts);
            updateGraph(elID,['points',pts]);
            cancel();
        }
        else { // remove individual point
            var n=points.length;
            if(((t=='line')&&(n>2))||((t=='shape')&&(n>3))) { // if minimum number of nodes, just remove element
                prompt('REMOVE: tap circle) handle to remove element or a disc handle to remove a node');
                mode='removePoint'; // remove whole element or one point
                return;
            }
        }
    }
    prompt('REMOVE');
    for(var i=0;i<selection.length;i++) console.log('delete '+selection[i]);
    console.log('element is '+elID);
    showDialog('removeDialog',true);
});
id('confirmRemove').addEventListener('click',function() { // complete deletion
    if(selection.length>0) {
        while(selection.length>0) remove(selection.pop());
    }
    else remove(elID);
    element=elID=null;
    id('handles').innerHTML=''; // remove edit handles...
    id('selection').innerHTML=''; // ...selection shading,...
    id('blueBox').setAttribute('width',0); // ...and text outline...
    id('blueBox').setAttribute('height',0);
    showDialog('removeDialog',false);
    cancel();
});
id('backButton').addEventListener('click',function() {
    var previousElement=element.previousSibling;
    if(previousElement===null) {
        prompt('already at back');
        return;
    }
    else prompt('PUSH BACK');
    var previousID=previousElement.getAttribute('id');
    id('dwg').insertBefore(element,previousElement); // move back in drawing...
    swopGraphs(previousID,elID); // ...and in database
    // drawOrder(); // update drawing order
});
id('forwardButton').addEventListener('click',function() {
    var nextElement=element.nextSibling;
    if(nextElement===null) {
        prompt('already at front');
        return;
    }
    else prompt('PULL FORWARD');
    var nextID=nextElement.getAttribute('id');
    id('dwg').insertBefore(nextElement,element); // bring forward in drawing.
    swopGraphs(elID,nextID); // ...and in database
    // drawOrder(); // update drawing order
});
id('moveButton').addEventListener('click',function() {
    console.log('move '+type(element));
    if(type(element)=='dim') return; // cannot move dimensions
    id('moveRight').value=id('moveDown').value=id('moveDist').value=id('moveAngle').value=0;
    showDialog('textDialog',false);
    showDialog('moveDialog',true);
});
id('confirmMove').addEventListener('click',function() {
    // read move parameters and adjust element
    var moveX=parseInt(id('moveRight').value);
    var moveY=parseInt(id('moveDown').value);
    var moveD=parseInt(id('moveDist').value);
    var moveA=parseInt(id('moveAngle').value);
    console.log('move '+moveX+','+moveY+' '+moveD+'@'+moveA);
    if((moveD!=0)&&(moveA!=0)) { // polar coordinates - convert to cartesian
        moveA-=90;
        moveA*=Math.PI/180;
        moveX=moveD*Math.cos(moveA);
        moveY=moveD*Math.sin(moveA);
    }
    if(selection.length<1) selection.push(elID);
    // REMEMBER POSITIONS/POINTS/SPINS/FLIPS FOR ALL SELECTED ELEMENTS
    re('member');
    if(selectedPoints.length>0) { // move all selected points in a line or shape...
        var points=element.points;
        while(selectedPoints.length>0) {
            var n=selectedPoints.pop();
            points[n].x+=moveX;
            points[n].y+=moveY;
        }
        updateGraph(elID,['points',element.getAttribute('points')]);
    }
    else while(selection.length>0) { // or move all selected elements
        element=id(selection.pop());
        move(element,moveX,moveY);
    }
    showDialog('moveDialog',false);
    // DONE BY re-member - id('undoButton').style.display='block';
    cancel();
});
id('spinButton').addEventListener('click',function() {
    id('spinAngle').value=0;
    showDialog('spinDialog',true);
});
id('confirmSpin').addEventListener('click',function() {
    var spin=Number(id('spinAngle').value);
    if(selection.length<1) selection.push(elID);
    console.log('spin '+selection.length+' elements by '+spin+' degrees');
    re('member');
    var axis=null;
    if(anchor) { // spin around an anchor
        axis={};
        axis.x=parseInt(id('anchor').getAttribute('cx'));
        axis.y=parseInt(id('anchor').getAttribute('cy'));
    }
    else if(selection.length>1) { // spin around mid-point of multiple elements
        var el=id(selection[0]);
        var box=getBounds(el);
        var minX=box.x;
        var maxX=box.x+box.width;
        var minY=box.y;
        var maxY=box.y+box.height;
        console.log('first box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
        for(var i=1;i<selection.length;i++) {
            el=id(selection[i]);
            box=getBounds(el);
            if(box.x<minX) minX=box.x;
            if((box.x+box.width)>maxX) maxX=box.x+box.width;
            if(box.y<minY) minY=box.y;
            if((box.y+box.height)>maxY) maxY=box.y+box.height;
        }
        console.log('overall box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
        axis={};
        axis.x=(minX+maxX)/2;
        axis.y=(minY+maxY)/2;
    }
    if(axis) console.log('axis: '+axis.x+','+axis.y); else console.log('no axis');
    while(selection.length>0) {
        element=id(selection.pop());
        elID=element.id;
        console.log('spin '+type(element));
        var ox=0; // element origin
        var ox=0;
        switch(type(element)) { // elements spin around origin
            case 'line':
            case 'shape':
                ox=element.points[0].x;
                oy=element.points[0].y;
                break;
            case 'box':
                ox=parseInt(element.getAttribute('x'))+parseInt(element.getAttribute('width'))/2;
                oy=parseInt(element.getAttribute('y'))+parseInt(element.getAttribute('height'))/2;
                break;
            case 'text':
            case 'combi':
                ox=parseInt(element.getAttribute('x'));
                oy=parseInt(element.getAttribute('y'));
                break;
            case 'oval':
            case 'arc':
                ox=parseInt(element.getAttribute('cx'));
                oy=parseInt(element.getAttribute('cy'));
        }
        var netSpin=parseInt(element.getAttribute('spin'));
        console.log('change spin from '+netSpin);
        netSpin+=spin;
        console.log('to '+netSpin);
        element.setAttribute('spin',netSpin);
        updateGraph(elID,['spin',netSpin]);
        setTransform(element);
        if(axis) { // reposition elements, spinning around axis
            console.log('spin element '+elID+' around anchor at '+axis.x+','+axis.y);
            dx=axis.x-ox;
            dy=axis.y-oy;
            var d=Math.sqrt(dx*dx+dy*dy);
            var a=Math.atan(dy/dx);
            a+=(spin*Math.PI/180);
            dx+=(d*Math.cos(a));
            dy+=(d*Math.sin(a));
            console.log('shift '+dx+','+dy);
            move(element,dx,dy);
        }
        else refreshNodes(element); // if not already done after move() or setTransform()
    }
    showDialog('spinDialog',false);
    cancel();
})
id('flipButton').addEventListener('click',function() {
    if(type(element)=='dim') return; // cannot flip dimensions
    id('copyLabel').style.color=(anchor)?'white':'gray';
    id('copy').disabled=!anchor;
    console.log('show flip dialog');
    id('copy').checked=false;
    showDialog('flipDialog',true);
});
id('flipOptions').addEventListener('click',function() {
    var opt=Math.floor((event.clientX-parseInt(id('flipDialog').offsetLeft)+5)/32);
    console.log('click on '+opt); // 0: horizontal; 1: vertical
    var copy=id('copy').checked;
    var axis={};
    // var box=null;
    var elNodes=null;
    var el=id(selection[0]);
    var box=getBounds(el);
    var minX=box.x;
    var maxX=box.x+box.width;
    var minY=box.y;
    var maxY=box.y+box.height;
    console.log('first box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
    for(var i=1;i<selection.length;i++) {
        el=id(selection[i]);
        box=getBounds(el);
        if(box.x<minX) minX=box.x;
        if((box.x+box.width)>maxX) maxX=box.x+box.width;
        if(box.y<minY) minY=box.y;
        if((box.y+box.height)>maxY) maxY=box.y+box.height;
    }
    console.log('overall box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
    if(anchor) { // flip around anchor
        axis.x=parseInt(id('anchor').getAttribute('x'));
        axis.y=parseInt(id('anchor').getAttribute('y'));
    }
    else { // flip in-situ around mid-point
        copy=false;
        axis.x=(minX+maxX)/2;
        axis.y=(minY+maxY)/2;
    }
    console.log('axis: '+axis.x+','+axis.y);
    re('member');
    while(selection.length>0) { // for each selected item...
        elID=selection.shift();
        el=id(elID);
        console.log('flip '+type(el)+' element '+el.id);
        switch (type(el)) {
            case 'line': // reverse x-coord of each point and each node
            case 'shape':
                var points=el.points;
                if(copy) var pts=''; // new points list as string
                for(i=0;i<points.length;i++) {
                    if(opt<1) {
                        dx=points[i].x-axis.x;
                        if(copy) pts+=(axis.x-dx)+' '+points[i].y+' ';
                        else points[i].x=axis.x-dx;
                    }
                    else {
                        dy=points[i].y-axis.y;
                        if(copy) pts+=Number(points[i].x)+','+(Number(axis.y)-dy)+' ';
                        else points[i].y=axis.y-dy;
                    }
                }
                console.log('pts: '+pts);
                if(copy) {
                    console.log('create copy of element '+elID);
                    var g={}; // new graph for copy/copies
                    g.type=type(el); // line or shape
                    g.points=pts;
                    g.spin=0;
                    g.stroke=el.getAttribute('stroke');
                    g.lineW=el.getAttribute('stroke-width');
                    g.lineStyle=getLineStyle(el);
                    g.fill=el.getAttribute('fill');
                    var o=el.getAttribute('fill-opacity');
                    g.opacity=(o)?o:1;
                    addGraph(g);
                }
                else {
                    updateGraph(elID,['points',el.getAttribute('points')]);
                    refreshNodes(el);
                }
                break;
            case 'box':
                if(copy) {
                    var g={}; // new graph for copy/copies
                    g.type='box';
                    g.width=parseInt(el.getAttribute('width'));
                    g.height=parseInt(el.getAttribute('height'));
                    var left=parseInt(el.getAttribute('x'));
                    var top=parseInt(el.getAttribute('y'));
                    var right=left+g.width;
                    var bottom=top+g.height;
                    console.log('box '+left+'-'+right+'x'+top+'-'+bottom);
                    if(opt<1) { // mirror copy left or right...
                        dx=right-axis.x;
                        g.x=axis.x-dx;
                        g.y=top;
                    }
                    else { // ...above or below
                        g.x=left;
                        dy=bottom-axis.y;
                        g.y=axis.y-dy;
                    }
                    var request=db.transaction('graphs').objectStore('graphs').get(Number(el.id));
                    request.onsuccess=function(event) {
                        var graph=request.result;
                        console.log('retrieved graph '+graph.type);
                        g.radius=graph.radius;
                        g.stroke=graph.stroke;
                        g.lineW=graph.lineW;
                        g.lineStyle=graph.lineStyle;
                        g.fill=graph.fill;
                        g.opacity=graph.opacity;
                        addGraph(g);
                    }
                    request.onerror=function(event) {
                        console.log('get failed');
                    }
                }
                else { // no action if flip in-situ unless has spin
                    var spin=parseInt(el.getAttribute('spin'));
                    if(spin!=0) {
                        spin*=-1;
                        el.setAttribute('spin',spin);
                        setTransform(el);
                        updateGraph(elID['spin',spin]);
                    }
                }
                break;
            case 'oval':
                if(copy) {
                    var g={};
                    g.type='oval';
                    if(opt<1) { // mirror copy left or right...
                        dx=parseInt(el.getAttribute('cx'))-axis.x;
                        g.cx=axis.x-dx;
                        g.cy=parseInt(el.getAttribute('cy'));
                    }
                    else { // ...above or below
                        g.cx=parseInt(el.getAttribute('cx'));
                        dy=parseInt(el.getAttribute('cy'))-axis.y;
                        g.cy=axis.y-dy;
                    }
                    var request=db.transaction('graphs').objectStore('graphs').get(Number(el.id));
                    request.onsuccess=function(event) {
                        var graph=request.result;
                        console.log('retrieved graph '+graph.type);
                        g.rx=graph.rx;
                        g.ry=graph.ry;
                        g.stroke=graph.stroke;
                        g.lineW=graph.lineW;
                        g.lineStyle=graph.lineStyle;
                        g.fill=graph.fill;
                        g.opacity=graph.opacity;
                        addGraph(g);
                    }
                    request.onerror=function(event) {
                        console.log('get failed');
                    }
                }
                else { // no action if flip in-situ unless has spin
                    var spin=parseInt(el.getAttribute('spin'));
                    if(spin!=0) {
                        spin*=-1;
                        el.setAttribute('spin',spin);
                        setTransform(el);
                        updateGraph(elID['spin',spin]);
                    }
                }
                break;
            case 'arc':
                var d=el.getAttribute('d');
                getArc(d);
                if(copy) {
                    g={};
                    g.type='arc';
                    if(opt<1) { // mirror copy left or right...
                        dx=arc.cx-axis.x;
                        g.cx=axis.x-dx;
                        g.cy=arc.cy;
                        dx=arc.x1-axis.x;
                        g.x1=axis.x-dx;
                        g.y1=arc.y1;
                        dx=arc.x2-axis.x;
                        g.x2=axis.x-dx;
                        g.y2=arc.y2;
                    }
                    else { // ...above or below
                        g.cx=arc.cx;
                        dy=arc.cy-axis.y;
                        g.cy=axis.y-dy;
                        g.x1=arc.x1;
                        dy=arc.y1-axis.y;
                        g.y1=axis.y-dy;
                        g.x2=arc.x2;
                        dy=arc.y2-axis.y;
                        g.y2=axis.y-dy;
                    }
                    g.r=arc.r;
                    g.major=arc.major;
                    g.sweep=(arc.sweep<1)? 1:0;
                    var request=db.transaction('graphs').objectStore('graphs').get(Number(el.id));
                    request.onsuccess=function(event) {
                        var graph=request.result;
                        console.log('retrieved graph '+graph.type);
                        g.stroke=graph.stroke;
                        g.lineW=graph.lineW;
                        g.lineStyle=graph.lineStyle;
                        g.fill=graph.fill;
                        g.opacity=graph.opacity;
                        addGraph(g);
                    }
                    request.onerror=function(event) {
                        console.log('get failed');
                    }
                }
                else { // flip in-situ
                    if(opt<1) { // flip left-right
                        dx=arc.cx-axis.x;
                        arc.cx=axis.x-dx;
                        dx=arc.x1-axis.x;
                        arc.x1=axis.x-dx;
                        dx=arc.x2-axis.x;
                        arc.x2=axis.x-dx;
                    }
                    else {
                        dy=arc.cy-axis.y;
                        arc.cy=axis.y-dy;
                        dy=arc.y1-axis.y;
                        arc.y1=axis.y-dy;
                        dy=arc.y2-axis.y;
                        arc.y2=axis.y-dy;
                    }
                    arc.sweep=(arc.sweep<1)? 1:0;
                    updateGraph(elID,['cx',arc.cx,'x1',arc.x1,'x2',arc.x2,'sweep',arc.sweep]);
                    d="M"+arc.cx+","+arc.cy+" M"+arc.x1+","+arc.y1+" A"+arc.r+","+arc.r+" 0 "+arc.major+","+arc.sweep+" "+arc.x2+","+arc.y2;
                    element.setAttribute('d',d);
                    refreshNodes(el);
                }
                break;
            case 'text':
                if(copy) {
                    var g={};
                    g.type='text';
                    // box=getBounds(el);
                    if(opt<1) { // mirror copy left or right...
                        dx=parseInt(el.getAttribute('x'))-axis.x;
                        g.x=axis.x-dx;
                        g.y=parseInt(el.getAttribute('y'));
                        g.flip=parseInt(el.getAttribute('flip'))^1;
                    }
                    else { // ...above or below
                        g.x=parseInt(el.getAttribute('x'));
                        dy=parseInt(el.getAttribute('y'))-axis.y;
                        g.y=axis.y-dx;
                        g.flip=parseInt(el.getAttribute('flip'))^2;
                    }
                    var request=db.transaction('graphs').objectStore('graphs').get(Number(elID));
                    request.onsuccess=function(event) {
                        var graph=request.result;
                        console.log('retrieved graph '+graph.type);
                        g.text=graph.text;
                        g.textSize=graph.textSize;
                        g.textStyle=graph.textStyle;
                        g.fill=graph.fill;
                        g.opacity=graph.opacity;
                        addGraph(g);
                    }
                    request.onerror=function(event) {
                        console.log('get failed');
                    }
                }
                else { // flip in-situ
                    showDialog('textDialog',false);
                    var flip=parseInt(el.getAttribute('flip'));
                    if(opt<1) { // flip left-right
                        console.log('current flip: '+flip);
                        flip^=1; // toggle horizontal flip;
                        dx=parseInt(el.getAttribute('x'))-axis.x;
                        el.setAttribute('x',(axis.x-dx));
                    }
                    else { // flip top-bottom
                        flip^=2; // toggle vertical flip
                        dy=parseInt(el.getAttribute('y'))-axis.y;
                        el.setAttribute('y',(axis.y-dy));
                    }
                    el.setAttribute('flip',flip);
                    setTransform(el);
                    updateGraph(elID,['flip',flip]);
                }
                break;
            case 'combi':
                if(copy) {
                    var g={};
                    g.type='combi';
                    if(opt<1) { // mirror copy left or right...
                        g.x=axis.x-dx;
                        g.y=parseInt(el.getAttribute('y'));
                        dx=parseInt(el.getAttribute('x'))-axis.x;
                        g.flip=parseInt(el.getAttribute('flip'))^1;
                    }
                    else { // ...above or below
                        g.x=parseInt(el.getAttribute('x'));
                        dy=parseInt(el.getAttribute('y'))-axis.y;
                        g.flip=parseInt(el.getAttribute('flip'))^2; // toggle vertical flip
                    }
                    var request=db.transaction('graphs').objectStore('graphs').get(Number(elID));
                    request.onsuccess=function(event) {
                        var graph=request.result;
                        console.log('retrieved graph '+graph.type+' combi no. '+graph.no);
                        g.no=graph.no;
                        g.width=graph.width;
                        g.height=graph.height;
                        addGraph(g);
                    }
                    request.onerror=function(event) {
                        console.log('get failed');
                    }
                }
                else { // flip in-situ
                    var flip=parseInt(el.getAttribute('flip'));
                    // console.log(elNodes.length+' nodes');
                    if(opt<1) { // flip left-right
                        console.log('current flip: '+flip);
                        flip^=1; // toggle horizontal flip;
                        dx=parseInt(el.getAttribute('ax'))-axis.x;
                        el.setAttribute('ax',(axis.x-dx));
                    }
                    else { // flip top-bottom
                        flip^=2; // toggle vertical flip
                        dy=parseInt(el.getAttribute('ay'))-axis.y;
                        el.setAttribute('ay',(axis.y-dy));
                    }
                    refreshNodes(el);
                    w=parseInt(el.getAttribute('x'));
                    h=parseInt(el.getAttribute('y'));
                    // var s=parseInt(el.getAttribute('scale'));
                    var hor=flip&1;
                    var ver=flip&2;
                    var t='translate('+(hor*w)+','+(ver*h/2)+') ';
                    t+='scale('+((hor>0)? -1:1)+','+((ver>0)? -1:1)+')';
                    // ADD rotate() FOR SPIN
                    el.setAttribute('flip',flip);
                    el.setAttribute('transform',t);
                    updateGraph(elID,['flip',flip]);
                }
                break;
        }
    }
    cancel();
    if(anchor) {
        id('blue').removeChild(id('anchor'));
        anchor=false;
    }
    showDialog('flipDialog',false);
    // mode='select';
});
id('alignButton').addEventListener('click',function() {
    showDialog('alignDialog',true);
});
id('alignOptions').addEventListener('click',function() {
    x0=parseInt(id('alignDialog').offsetLeft)+parseInt(id('alignOptions').offsetLeft);
    y0=parseInt(id('alignDialog').offsetTop)+parseInt(id('alignOptions').offsetTop);
    console.log('alignOptions at '+x0+','+y0);
    x=Math.floor((event.clientX-x0+5)/32); // 0-2
    y=Math.floor((event.clientY-y0+5)/32); // 0 or 1
    console.log('x: '+x+' y: '+y);
    var opt=y*3+x; // 0-5
    console.log('option '+opt);
    var el=id(selection[0]);
    var box=getBounds(el);
    var minX=box.x;
    var maxX=box.x+box.width;
    var minY=box.y;
    var maxY=box.y+box.height;
    console.log('first box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
    for(var i=1;i<selection.length;i++) {
        el=id(selection[i]);
        box=getBounds(el);
        if(box.x<minX) minX=box.x;
        if((box.x+box.width)>maxX) maxX=box.x+box.width;
        if(box.y<minY) minY=box.y;
        if((box.y+box.height)>maxY) maxY=box.y+box.height;
    }
    var midX=(minX+maxX)/2;
    var midY=(minY+maxY)/2;
    console.log('overall box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
    re('member');
    for(i=0;i<selection.length;i++) {
        el=id(selection[i]);
        box=getBounds(el);
        console.log('move '+el.id+'?');
        switch(opt) {
            case 0: // align left
                if(box.x>minX) move(el,(minX-box.x),0);
                break;
            case 1: // align centre left-right
                x=Number(box.x)+Number(box.width)/2;
                if(x!=midX) move(el,(midX-x),0); 
                break;
            case 2: // align right
                x=Number(box.x)+Number(box.width);
                if(x<maxX) move(el,(maxX-x),0);
                break;
            case 3: // align top
                if(box.y>minY) move(el,0,(minY-box.y));
                break;
            case 4: // align centre top-bottom
                y=Number(box.y)+Number(box.height)/2;
                if(y!=midY) move(el,0,(midY-y));
                break;
            case 5: // align bottom
                console.log('align bottom');
                y=Number(box.y)+Number(box.height);
                if(y<maxY) move(el,0,(maxY-y));
        }
    }
    // CHECK NODES GET MOVED TOO!!!!! - USE refreshNodes(el)
    showDialog('alignDialog',false);
    cancel();
    // selection=[];
    // id('selection').innerHTML='';
});
id('doubleButton').addEventListener('click',function() {
    console.log(selection.length+' elements selected: '+elID);
    if(selection.length!=1) return; // can only double single selected...
    var t=type(element); // ...line, shape, box, oval or arc elements
    if((t=='text')||(t=='dim')||(t=='combi')||(t=='anchor')) return;
    showDialog('doubleDialog',true);
});
id('confirmDouble').addEventListener('click',function() {
    console.log('DOUBLE');
    var d=parseInt(id('offset').value);
    console.log('double offset: '+d+'mm');
    showDialog('doubleDialog',false);
    var graph={}; // initiate new element
    graph.type=type(element);
    switch(graph.type) {
        case 'line':
            var points=element.points;
            var count=points.length;
            var pts=[count]; // points in new line
            var i=0; // counter
            for(i=0;i<count;i++) {
                pts[i]=new Point();
                console.log('pt '+i+': '+pts[i].x+','+pts[i].y); // JUST CHECKING
            }
            var p=new Point(); // current point
            var p1=new Point(); // next point
            var a=null; // slope of current and...
            var a0=null; // ...previous segment
            var b=null; // y-offset for current and...
            var b0=null; // ...previous segment
            var n=null; // normal to current line segment
            i=0;
            while(i<count-1) {
                a=b=null;
                p.x=points[i].x;
                p.y=points[i].y;
                p1.x=points[i+1].x;
                p1.y=points[i+1].y;
                console.log('segment '+i+' '+p.x+','+p.y+' to '+p1.x+','+p1.y);
                if(p.x==p1.x) { // vertical
                    a='v';
                    if((p1.y-p.y)>0) pts[i].x=pts[i+1].x=p.x-d;
                    else pts[i].x=pts[i+1].x=p.x+d;
                    if(i<1) pts[0].y=p.y; // start point
                }
                else if(p.y==p1.y) { // horizontal
                    a='h';
                    if((p1.x-p.x)>0) pts[i].y=pts[i+1].y=p.y+d;
                    else pts[i].y=p[i+1].y=p.y-d;
                    if(i<1) pts[0].x=p.x; // start point
                }
                else { // sloping
                    a=((p1.y-p.y)/(p1.x-p.x)); // slope of line (dy/dx)
                    n=Math.atan((p1.x-p.x)/(p1.y-p.y)); // angle of normal to line
                    console.log('line slope: '+a+'; normal: '+(180*n/Math.PI));
                    if(p1.y>=p.y) {
                        p.x-=d*Math.cos(n);
                        p.y+=d*Math.sin(n);
                    }
                    else {
                        p.x+=d*Math.cos(n);
                        p.y-=d*Math.sin(n);
                    }
                    b=p.y-a*p.x;
                    console.log('new segment function: y='+a+'.x+'+b);
                    if(i<1) {
                        pts[0].x=p.x;
                        pts[0].y=p.y;
                    }
                    else { // fix previous point
                        if(a0=='v') pts[i].y=a*pts[i].x+b; // previous segment was vertical - x already set
                        else if(a0=='h') pts[i].x=(pts[i].y-b)/a; // previous segment was horizontal - y set
                        else { // previous segment was sloping
                            pts[i].x=(b-b0)/(a0-a);
                            pts[i].y=a*pts[i].x+b;
                        }
                    }
                }
                a0=a; // remember function values for segment
                b0=b;
                i++;
            }
            // end point...
            console.log('end point is point '+i+' '+p1.x+','+p1.y);
            if(a0=='h') { // last segment horizontal
                pts[i].x=p1.x;
                pts[i].y=p1.y+d;  // OR - ?
            }
            else if(a0=='v') { // last segment vertical
                pts[i].x=p1.x+d; // OR - ?
                pts[i].y=p1.y;
            }
            else { // last segment sloping
                if(p1.y>=p.y) {
                    p1.x-=d*Math.cos(n);
                    p1.y+=d*Math.sin(n);
                }
                else {
                    p1.x+=d*Math.cos(n);
                    p1.y-=d*Math.sin(n);
                }
                pts[i].x=p1.x;
                pts[i].y=p1.y;
            }
            graph.points='';
            for(i=0;i<count;i++) {
                console.log('point '+i+': '+pts[i].x+','+pts[i].y);
                graph.points+=pts[i].x+','+pts[i].y+' ';
            }
            graph.spin=element.getAttribute('spin');
            break;
        case 'shape':
            var points=element.points;
            var count=points.length; // eg. 3-point shape (triangle) has 3 sides
            var pts=[count]; // points in new line
            var i=0; // counter
            for(i=0;i<count;i++) {
                pts[i]=new Point();
                console.log('pt '+i+': '+pts[i].x+','+pts[i].y); // JUST CHECKING
            }
            var p=new Point(); // current point
            var p1=new Point(); // next point
            var a=null; // slope of current and...
            var a0=null; // ...previous side
            var b=null; // y-offset for current and...
            var b0=null; // ...previous side
            var n=null; // normal to current line side
            i=0;
            while(i<=count) {
                a=b=null;
                console.log(' point '+i+' ie: '+i%count);
                p.x=points[i%count].x;
                p.y=points[i%count].y;
                p1.x=points[(i+1)%count].x;
                p1.y=points[(i+1)%count].y;
                console.log('side '+i+' '+p.x+','+p.y+' to '+p1.x+','+p1.y);
                if(p.x==p1.x) { // vertical
                    a='v';
                    if(p1.y>p.y) pts[i%count].x=pts[(i+1)%count].x=p.x-d;
                    else pts[i%count].x=pts[(i+1)%count].x=p.x+d;
                    if(i>0) {
                        if(a0=='v') pts[i%count].y=p.y; // continues previous segment
                        else if(a0=='h') pts[i%count].y=pts[(i-1)%count].y; // previous side was horizontal
                        else pts[i%count].y=a0*pts[i%count].x+b0; // previous side was sloping
                    }
                }
                else if(p.y==p1.y) { // horizontal
                    a='h';
                    if(p1.x>p.x) pts[i%count].y=pts[(i+1)%count].y=p.y+d;
                    else pts[i%count].y=pts[(i+1)%count].y=p.y-d;
                    if(i>0) {
                        if(a0=='h') pts[i%count].x=p.x; // continues previous segment
                        else if(a0=='v') pts[i%count].x=pts[(i-1)%count].x; // previous segment was vertical
                        else pts[i%count].x=(pts[i%count].y-b0)/a0; // previous side was sloping
                    }
                }
                else { // sloping
                    a=((p1.y-p.y)/(p1.x-p.x)); // slope of line (dy/dx)
                    n=Math.atan((p1.x-p.x)/(p1.y-p.y)); // angle of normal to line
                    console.log('line slope: '+a+'; normal: '+(180*n/Math.PI));
                    if(p1.y>=p.y) {
                        p.x-=d*Math.cos(n);
                        p.y+=d*Math.sin(n);
                    }
                    else {
                        p.x+=d*Math.cos(n);
                        p.y-=d*Math.sin(n);
                    }
                    b=p.y-a*p.x;
                    console.log('new segment function: y='+a+'.x+'+b);
                    if(i>0) { // fix previous point
                        console.log('fix previous point - a0 is '+a0);
                        if(a0=='v') pts[i%count].y=a*pts[i%count].x+b; // previous side was vertical - x already set
                        else if(a0=='h') pts[i%count].x=(pts[i%count].y-b)/a; // previous side was horizontal - y set
                        else if(a0==a) { // continues slope of previous segment
                            pts[i%count].x=p.x;
                            pts[i%count].y=p.y;
                        }
                        else { // previous side was sloping
                            console.log('fix point '+i+' a:'+a+' a0:'+a0+' b:'+b+' b0:'+b0);
                            pts[i%count].x=(b-b0)/(a0-a);
                            pts[i%count].y=a*pts[i%count].x+b;
                        }
                    }
                }
                a0=a; // remember function values for segment
                b0=b;
                i++;
            }
            graph.points='';
            for(i=0;i<count;i++) {
                console.log('point '+i+': '+pts[i].x+','+pts[i].y);
                graph.points+=pts[i].x+','+pts[i].y+' ';
            }
            graph.spin=element.getAttribute('spin');
            break;
        case 'box':
            x=parseInt(element.getAttribute('x'));
            y=parseInt(element.getAttribute('y'));
            w=parseInt(element.getAttribute('width'));
            h=parseInt(element.getAttribute('height'));
            if((d<0)&&((w+2*d<1)||(h+2*d<1))) {
                alert('cannot fit inside');
                return;
            }
            graph.spin=element.getAttribute('spin'); // IF HAS SPIN NEED TO SPIN AROUND ORIGINAL BOX ORIGIN
            if(graph.spin!=0) { // spin around orignal box anchor
                var r=Math.sqrt(2)*d;
                var s=(45-graph.spin)*Math.PI/180; // radians
                graph.x=x-(r*Math.sin(s));
                graph.y=y-(r*Math.cos(s));
            }
            else {
                graph.x=x-d;
                graph.y=y-d;
            }
            graph.width=w+2*d;
            graph.height=h+2*d;
            var n=parseInt(element.getAttribute('rx'));
            console.log('corner radius: '+n);
            if(n!=0) n+=d;
            if(n<0) n=0;
            graph.radius=n;
            console.log('double as '+n);
            // ADD STYLING AFTER switch SECTION?
            break;
        case 'oval':
            x=parseInt(element.getAttribute('cx'));
            y=parseInt(element.getAttribute('cy'));
            var rx=parseInt(element.getAttribute('rx'));
            var ry=parseInt(element.getAttribute('ry'));
            if((d<0)&&((rx+d)<1)||((ry+d)<1)) {
                alert('cannot fit inside');
                return;
            }
            graph.cx=x;
            graph.cy=y;
            graph.rx=rx+d;
            graph.ry=ry+d;
            graph.spin=element.getAttribute('spin');
            break;
        case 'arc':
            var d=element.getAttribute('d');
            getArc(d);
            var r=arc.r+d; // new arc radius
            if(r<0) {
                alert('cannot fit inside');
                return;
            }
            graph.r=r;
            r/=arc.r; // ratio of new/old radii
            graph.cx=arc.cx; // same centre point
            graph.cy=arc.cy;
            dx=arc.x1-arc.cx; // calculate new start point
            dy=arc.y1-arc.cy;
            dx*=r;
            dy*=r;
            graph.x1=arc.cx+dx;
            graph.y1=arc.cy+dy;
            dx=arc.x2-arc.cx; // calculate new end point
            dy=arc.y2-arc.cy;
            dx*=r;
            dy*=r;
            graph.x2=arc.cx+dx;
            graph.y2=arc.cy+dy;
            graph.major=arc.major;
            graph.sweep=arc.sweep;
            graph.spin=arc.spin;
    }
    graph.stroke=element.getAttribute('stroke');
    graph.lineW=element.getAttribute('stroke-width');
    graph.lineStyle=getLineStyle(element);
    graph.fill=element.getAttribute('fill');
    n=element.getAttribute('fill-opacity');
    if(n) graph.opacity=n;
    addGraph(graph);
    cancel();
});
id('repeatButton').addEventListener('click',function() {
    if(type(element)=='dim') return; // cannot move dimensions
    if(selection.length!=1) return; // can only repeat single elements
    showDialog('textDialog',false);
    id('countH').value=id('countV').value=1;
    id('distH').value=id('distV').value=0;
    showDialog('repeatDialog',true);
});
id('confirmRepeat').addEventListener('click',function() {
    var nH=parseInt(id('countH').value);
    var nV=parseInt(id('countV').value);
    var dH=parseInt(id('distH').value);
    var dV=parseInt(id('distV').value);
    console.log('repeat '+type(element));
    console.log(nH+' copies across at '+dH+'mm; '+nV+' copies down at '+dV+'mm');
    // element=id(elID);
    console.log(element.type+' stroke: '+element.stroke);
    for(var i=0;i<nH;i++) {
        for(var j=0;j<nV;j++) {
            if(i<1 && j<1) continue; // skip in-place duplicate
            var g={};
            g.type=type(element);
            if(g.type!='combi') { // combis don't have style
                g.stroke=element.getAttribute('stroke');
                g.lineW=element.getAttribute('stroke-width');
                g.lineStyle=getLineStyle(element);
                g.fill=element.getAttribute('fill');
                var val=element.getAttribute('fill-opacity');
                if(val) g.opacity=val;
            }
            g.spin=element.getAttribute('spin');
            switch(g.type) {
                case 'line':
                    g.points='';
                    for(var p=0;p<element.points.length;p++) {
                        g.points+=element.points[p].x+(i*dH)+',';
                        g.points+=element.points[p].y+(j*dV)+' ';
                    }
                    // g.setAttribute('points',points);
                    // addGraph(g);
                    break;
                case 'box':
                    g.x=Number(element.getAttribute('x'))+(i*dH);
                    g.y=Number(element.getAttribute('y'))+(j*dV);
                    g.width=Number(element.getAttribute('width'));
                    g.height=Number(element.getAttribute('height'));
                    g.radius=Number(element.getAttribute('rx'));
                    console.log('copy['+i+','+j+'] '+g.type+' at '+g.x+','+g.y);
                    // addGraph(g);
                    break;
                case 'oval':
                    g.cx=Number(element.getAttribute('cx'))+(i*dH);
                    g.cy=Number(element.getAttribute('cy'))+(j*dV);
                    g.rx=Number(element.getAttribute('rx'));
                    g.ry=Number(element.getAttribute('ry'));
                    console.log('copy '+g.type+' at '+g.cx+','+g.cy);
                    break;
                case 'arc':
                    var d=element.getAttribute('d');
                    getArc(d);
                    g.cx=arc.cx+(i*dH);
                    g.cy=arc.cy+(j*dV);
                    g.x1=arc.x1+(i*dH);
                    g.y1=arc.y1+(j*dV);
                    g.x2=arc.x2+(i*dH);
                    g.y2=arc.y2+(j*dV);
                    g.r=arc.r;
                    g.major=arc.major;
                    g.sweep=arc.sweep;
                    console.log('copy['+i+','+j+'] of '+g.type+' at '+g.cx+','+g.cy);
                    break;
                case 'text':
                    g.x=Number(element.getAttribute('x'))+(i*dH);
                    g.y=Number(element.getAttribute('y'))+(j*dV);
                    g.flip=Number(element.getAttribute('flip'));
                    g.text=element.innerHTML;
                    g.textSize=Number(element.getAttribute('font-size'))/scale;
                    var style=element.getAttribute('font-style');
                    g.textStyle=(style=='italic')?'italic':'fine';
                    if(element.getAttribute('font-weight')=='bold') g.textStyle='bold';
                    break;
                case 'combi':
                    g.x=Number(element.getAttribute('x'))+(i*dH);
                    g.y=Number(element.getAttribute('y'))+(j*dV);
                    g.flip=Number(element.getAttribute('flip'));
                    g.name=element.getAttribute('href').substr(1); // strip off leading #
                    break;
            }
            addGraph(g); // ENSURE THIS CREATES SEPARATE GRAPHS & NOT SAME ONE SEVERAL TIMES!
        }
    }
    showDialog('repeatDialog',false);
    cancel();
});
id('filletButton').addEventListener('click',function() {
    if(type(element!='box')) return; // can only fillet box corners
    id('filletR').value=parseInt(element.getAttribute('rx'));
    showDialog('filletDialog',true);
});
id('confirmFillet').addEventListener('click',function() {
    re('member');
    var r=parseInt(id('filletR').value);
    element.setAttribute('rx',r);
    updateGraph(elID,['radius',r]);
    showDialog('filletDialog',false);
    showSizes(false);
    cancel();
});
id('anchorButton').addEventListener('click',function() {
    mode='anchor';
    prompt('ANCHOR: tap a node');
});
id('combineButton').addEventListener('click',function() {
    id('combiName').value='';
    if((selection.length>1)&&anchor) showDialog('combineDialog',true);
    else alert('Please place an anchor for the combi');
});
id('confirmCombine').addEventListener('click',function() {
    var name=id('combiName').value;
    if(!name) {
        alert('Enter a name for the combi');
        return;
    }
    var ax=parseInt(id('anchor').getAttribute('cx'));
    var ay=parseInt(id('anchor').getAttribute('cy'));
    var json='{"name":"'+name+'","svg":"';
    console.log('preliminary JSON: '+json+' anchor at '+ax+','+ay);
    for(i=0;i<selection.length;i++) {
        el=id(selection[i]);
        var t=type(el);
        console.log('add '+t+' element?');
        if((t=='dim')||(t=='combi')) continue; // don't include dimensions or combis
        switch(type(el)) {
            case 'line':
                var points=el.points;
                var pts='';
                for(var j=0;j<points.length;j++) pts+=(points[i].x-ax)+','+(points[i].y-ay)+' ';
                json+="<polyline points=\'"+pts+"\' spin=\'"+el.getAttribute('spin')+"\' ";
                break;
            case 'shape':
                var points=el.points;
                var pts='';
                for(var j=0;j<points.length;j++) pts+=(points[i].x-ax)+','+(points[i].y-ay)+' ';
                json+="<polygon points=\'"+pts+"\' spin=\'"+el.getAttribute('spin')+"\' ";
                break;
            case 'box':
                json+="<rect x=\'"+(parseInt(el.getAttribute('x'))-ax)+"\' y=\'"+(parseInt(el.getAttribute('y'))-ay)+"\' ";
                json+="width=\'"+el.getAttribute('width')+"\' height=\'"+el.getAttribute('height')+"\' rx=\'"+el.getAttribute('rx')+"\' spin=\'"+el.getAttribute('spin')+"\' ";
                break;
            case 'oval':
                json+="<ellipse cx=\'"+(parseInt(el.getAttribute('cx'))-ax)+"\' cy=\'"+(parseInt(el.getAttribute('cy'))-ay)+"\' ";
                json+="rx=\'"+el.getAttribute('rx')+"\' ry=\'"+el.getAttribute('ry')+"\' spin=\'"+el.getAttribute('spin')+"\' ";
                break;
            case 'arc':
                var d=el.getAttribute('d');
                getArc(d);
                arc.cx-=ax;
                arc.cy-=ay;
                arc.x1-=ax;
                arc.y1-=ay;
                arc.x2-=ax;
                arc.y2-=ay;
                d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
                json+="<path d=\'"+d+"\' spin=\'"+el.getAttribute('spin')+"\' ";
                break;
            case 'text':
                json+="<text x=\'"+parseInt(el.getAttribute('x'))-ax+"\' y=\'"+parseInt(el.getAttribute('y'))-ay+"\' ";
                json+="spin=\'"+el.getAttribute('spin')+"\' flip=\'"+el.getAttribute('flip')+"\' ";
                json+="stroke=\'"+el.getAttribute('stroke')+"\' fill=\'"+el.getAttribute('fill')+"\' ";
                json+="font-size=\'"+el.getAttribute('font-size')+"/' ";
                var val=el.getAttribute('font-style');
                if(val) json+="font-style=\'"+val+"\' ";
                val=el.getAttribute('font-weight');
                if(val) json+="font-weight=\'"+val+"\' ";
                json+=">"+el.innerHTML+"</text>";
        }
        if(t!='text') { // set style and complete svg
            json+="stroke=\'"+el.getAttribute('stroke')+"\' stroke-width=\'"+el.getAttribute('stroke-width')+"\' ";
            var val=el.getAttribute('stroke-dasharray');
            if(val) json+="stroke-dasharray=\'"+val+"\' ";
            json+="fill=\'"+el.getAttribute('fill')+"\' ";
            val=el.getAttribute('fill-opacity');
            if(val) json+="fill-opacity=\'"+val+"\'";
            json+="/>";
        }
        console.log('JSON so far: '+json);
    }
    json+='"}';
    console.log('combi JSON: '+json);
    download(json,name+'.json','text/plain');
});
// STYLES
id('line').addEventListener('click',function() {
	// setStyle(); // NEW
    showDialog('stylesDialog',true);
});
id('lineType').addEventListener('change',function() {
    var type=event.target.value;
    // console.log('line type: '+type);
    // NEW CODE...
    if(selection.length>0) {
    	for (var i=0;i<selection.length;i++) {
    		console.log('change line width for selected element '+i);
    		var el=id(selection[i]);
    		w=parseInt(el.getAttribute('stroke-width'));
    		var val=null;
        	switch(type) {
            	case 'none':
            	case 'solid':
                	// var val=null;
                	break;
            	case 'dashed':
                	val=(4*w)+' '+(4*w);
                	break;
            	case 'dotted':
                	val=w+' '+w;
        	}
        	console.log('set element '+el.id+' line style to '+type);
        	el.setAttribute('stroke-dasharray',val);
        	val=el.getAttribute('stroke');
        	el.setAttribute('stroke',(type=='none')?'none':val);
        	// el.setAttribute('stroke',(type=='none')?'none':lineCol);
        	updateGraph(el.id,['lineStyle',type]);
        	updateGraph(el.id,['stroke',(type=='none')?'none':lineCol]);
    	}
    }
    /* OLD CODE
    if(elID) { // change selected element
        element=id(elID);
        w=parseInt(element.getAttribute('stroke-width'));
        switch(type) {
            case 'solid':
                var val=null;
                break;
            case 'dashed':
                val=(4*w)+' '+(4*w);
                break;
            case 'dotted':
                val=w+' '+w;
        }
        console.log('set element '+element.id+' line style to '+type);
        element.setAttribute('stroke-dasharray',val);
        updateGraph(elID,['lineStyle',type]);
    } 
    */
    else { // change default line type
        lineType=type;
        // console.log('line type is '+type);
    }
    id('line').style.borderBottomStyle=type;
});
id('penSelect').addEventListener('change',function() {
    var val=event.target.value;
    // NEW CODE...
    if(selection.length>0) {
    	for(var i=0;i<selection.length;i++) {
    		var el=id(selection[i]);
    		var lineW=val*scale;
        	el.setAttribute('stroke-width',lineW);
        	if(el.getAttribute('stroke-dasharray')) el.setAttribute('stroke-dasharray',lineW+' '+lineW);
        	updateGraph(el.id,['lineW',lineW]);
    	}
    }
    /* OLD CODE
    if(elID) { // change selected element
        element=id(elID);
        var lineW=val*scale;
        element.setAttribute('stroke-width',lineW);
        if(element.getAttribute('stroke-dasharray')) element.setAttribute('stroke-dasharray',lineW+' '+lineW);
        // console.log('set element '+element.id+' pen to '+val);
        updateGraph(element.id,['lineW',lineW]);
    }
    */
    else { // change default pen width
        pen=val;
        // console.log('pen is '+pen);
    }
    id('line').style.borderWidth=(pen/scaleF)+'px';
});
id('textSize').addEventListener('change',function() {
    var val=event.target.value;
    console.log('set text size for '+selection.length+' items');
    // NEW CODE...
    if(selection.length>0) {
    	for(var i=0;i<selection.length;i++) {
    		var el=id(selection[i]);
    		if(type(el)=='text') {
            	el.setAttribute('font-size',val*scale);
            	updateGraph(el.id,['textSize',val]);
        	}
    	}
    }
    /* OLD CODE
    if(elID) { // change selected text element
        element=id(elID);
        if(type(element)=='text') {
            element.setAttribute('font-size',val*scale);
            // console.log('set element '+element.id+' text size to '+val);
            updateGraph(element.id,['textSize',val]);
        }
    }
    */
    else { // change default pen width
        textSize=val;
    }
});
id('textStyle').addEventListener('change',function() {
    var val=event.target.value;
    // NEW CODE...
    if(selection.length>0) {
    	for(var i=0;i<selection.length;i++) {
    		var el=id(selection[i]);
    		 if(type(el)=='text') {
            	switch(val) {
                	case 'fine':
                    	el.setAttribute('font-style','normal');
                    	el.setAttribute('font-weight','normal');
                    	break;
                	case 'bold':
                    	el.setAttribute('font-style','normal');
                    	el.setAttribute('font-weight','bold');
                    	break;
                	case 'italic':
                    	el.setAttribute('font-style','italic');
                    	el.setAttribute('font-weight','normal');
            	}
            	updateGraph(el.id,['textStyle',val]);
        	}
    	}
    }
    /* OLD CODE
    if(elID) { // change selected text element
        element=id(elID);
        if(type(element)=='text') {
            switch(val) {
                case 'fine':
                    element.setAttribute('font-style','normal');
                    element.setAttribute('font-weight','normal');
                    break;
                case 'bold':
                    element.setAttribute('font-style','normal');
                    element.setAttribute('font-weight','bold');
                    break;
                case 'italic':
                    element.setAttribute('font-style','italic');
                    element.setAttribute('font-weight','normal');
            }
            updateGraph(element.id,['textStyle',val]);
        }
    }
    */
    else { // change default pen width
        textStyle=val;
    }
});
id('lineShade').addEventListener('click',function() {
    // console.log('show shadeMenu');
    id('shadeMenu').mode='line';
    showShadeMenu(true,event.clientX-16,event.clientY-16);
});
id('fillShade').addEventListener('click',function() {
    console.log('show shadeMenu');
    id('shadeMenu').mode='fill';
    var shade=showShadeMenu(true,event.clientX-16,event.clientY-16);
});
id('opacity').addEventListener('change',function() {
    var val=event.target.value;
    // NEW CODE...
    if(selection.length>0) {
    	for(var i=0;i<selection.length;i++) {
    		var el=id(selection[i]);
    		el.setAttribute('fill-opacity',val);
        	updateGraph(el.id,['opacity',val]);
    	}
    }
    /* OLD CODE
    if(elID) { // change selected element
        element=id(elID);
        element.setAttribute('fill-opacity',val);
        updateGraph(elID,['opacity',val]);
    }
    */
    else opacity=val; // change default opacity
    id('fill').style.opacity=val;
});
id('shadeMenu').addEventListener('click',function() {
    // console.log('shadeMenu at '+id('shadeMenu').style.left);
    var x=event.clientX-parseInt(id('shadeMenu').style.left);
    console.log('x: '+x);
    x=Math.floor(x/24);
    var shades=['white','silver','gray','black'];
    var val=shades[x];
    showShadeMenu(false);
    console.log('set '+id('shadeMenu').mode+' shade to '+val);
    if(id('shadeMenu').mode=='line') { // line shade
        if(val=='white') val='blue';
        // NEW CODE...
        if(selection.length>0) { // change line shade of selected elements
        	for(var i=0;i<selection.length;i++) {
        		var el=id(selection[i]);
        		if(type(el)=='text') {
        			el.setAttribute('fill',val);
        			updateGraph(el.id,['fill',val]);
        		}
        		else {
        			el.setAttribute('stroke',val);
                	updateGraph(el.id,['stroke',val]);
                	if(val=='blue') { // move element into <ref> layer...
                    	console.log('blue line - shift to <ref>');
                    	el.setAttribute('stroke-width',0.25*scale); // ...with thin lines...
                    	el.setAttribute('fill','none'); // ...and no fill
                    	id('ref').appendChild(el); // move to <ref> layer
                    	remove(el.id,true); // remove from database keeping nodes for snap
                    	for(var j=0;j<dims.length;j++) { // ...and remove any linked dimensions
                        	if((Math.floor(dims[j].n1/10)==Number(el.id))||(Math.floor(dims[j].n2/10)==Number(el.id))) {
                            	remove(dims[j].dim);
                            	dims.splice(j,1);
                        	}
                    	}
                    	cancel();
                	}
        		}
        	}
        }
        /* OLD CODE
        if(elID) { // change selected element
            element=id(elID);
            if(type(element)=='text') { // text is filled not stroked
            console.log('change text colour to '+val);
                element.setAttribute('fill',val);
                updateGraph(element.id,['fill',val]);
            }
            else {
                element.setAttribute('stroke',val);
                updateGraph(element.id,['stroke',val]);
                if(val=='blue') { // move element into <ref> layer...
                    console.log('blue line - shift to <ref>');
                    element.setAttribute('stroke-width',0.25*scale); // ...with thin lines...
                    element.setAttribute('fill','none'); // ...and no fill
                    id('ref').appendChild(element); // move to <ref> layer
                    remove(elID,true); // remove from database keeping nodes for snap
                    // drawOrder(); // remove element from drawing order...
                    for(var i=0;i<dims.length;i++) { // ...and remove any linked dimensions
                        if((Math.floor(dims[i].n1/10)==Number(el.id))||(Math.floor(dims[i].n2/10)==Number(el.id))) {
                            remove(dims[i].dim);
                            dims.splice(i,1);
                        }
                    }
                    cancel();
                }
            }
        }
        */
        else { // change default line shade
            // console.log('line shade: '+val);
            if(val=='blue') val='black'; // cannot have blue <ref> choice as default
            lineShade=val;
        }
        id('line').style.borderColor=val;
        id('lineShade').style.backgroundColor=val;
    }
    else { // fill shade
    	// NEW CODE...
    	if(selection.length>0) { // change line shade of selected elements
    		for(var i=0;i<selection.length;i++) {
        		var el=id(selection[i]);
        		console.log('element '+el.id+' is '+type(el));
            	el.setAttribute('fill',val);
            	updateGraph(el.id,['fill',val]);
    		}
    	}
    	/* OLD CODE
        if(elID) { // change selected element
            element=id(elID);
            console.log('element '+elID+' is '+type(element));
            element.setAttribute('fill',val);
            updateGraph(element.id,['fill',val]);
        }
        */
        else { // change default fill shade
            // console.log('fill shade: '+val);
            fillShade=val;
        }
        id('fill').style.background=val;
        id('fillShade').style.backgroundColor=val;
    }
});
// POINTER DOWN
id('graphic').addEventListener('pointerdown',function() {
    console.log('pointer down - mode is '+mode);
    re('wind'); // WAS id('undoButton').style.display='none';
    event.preventDefault();
    if(currentDialog) showDialog(currentDialog,false); // clicking drawing removes any dialogs/menus
    id('shadeMenu').style.display='none';
    scr.x=Math.round(event.clientX);
    scr.y=Math.round(event.clientY);
    x=x0=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=y0=Math.round(scr.y*scaleF/zoom+dwg.y);
    // report('pointer down - screen: '+scr.x+','+scr.y+' drawing: '+x+','+y);
    var val=event.target.id;
    console.log('tap on '+val+' x,y:'+x+','+y+' x0,y0: '+x0+','+y0);
    if(val=='anchor')  { // move selected elements using anchor
        mode='move';
        prompt('drag ANCHOR to MOVE selection');
        re('member');
    }
    var holder=event.target.parentNode.id;
    // console.log('holder is '+holder);
    if((holder=='selection')&&(mode!='anchor')) { // click on a blue box to move multiple selectin
        console.log('move group selection');
        mode='move';
        prompt('drag to MOVE selection');
        re('member');
    }
    else if(holder=='handles') { // handle
        console.log('HANDLE '+val);
        var handle=id(val);
        var bounds=getBounds(element);
        console.log('bounds: '+bounds.x+','+bounds.y+' '+bounds.width+'x'+bounds.height);
        id('blueBox').setAttribute('x',bounds.x);
        id('blueBox').setAttribute('y',bounds.y);
        id('blueBox').setAttribute('width',bounds.width);
        id('blueBox').setAttribute('height',bounds.height);
        id('guides').style.display='block';
        re('member');
        if(val.startsWith('mover')) {
            node=parseInt(val.substr(5)); // COULD GO AT START OF HANDLES SECTION
            if(mode=='addPoint') { // add point after start-point
                var points=element.points;
                x=Math.round((Number(points[0].x)+Number(points[1].x))/2);
                y=Math.round((Number(points[0].y)+Number(points[1].y))/2);
                var pts=points[0].x+','+points[0].y+' '+x+','+y+' ';
                for(var i=1;i<points.length;i++) pts+=points[i].x+','+points[i].y+' ';
                element.setAttribute('points',pts);
                updateGraph(elID,['points',pts]);
                refreshNodes(element);
                cancel();
                return;
            }
            else if(mode=='removePoint') {
                showDialog('removeDialog',true);
                return;
            }
            console.log('move using node '+node);
            mode='move';
            prompt('drag to MOVE');
            switch(type(element)) {
                case 'line':
                case 'shape':
                    x0=element.points[0].x;
                    y0=element.points[0].y;
                    offset.x=element.points[0].x-element.points[node].x;
                    offset.y=element.points[0].y-element.points[node].y;
                    break;
                case 'box':
                    x0=element.getAttribute('x');
                    y0=element.getAttribute('y');
                    if(node<1) {
                        offset.x=-w/2;
                        offset.y=-h/2;
                    }
                    else {
                        offset.x=(node%2<1)?-w:0;
                        offset.y=(node>2)?-h:0;
                    }
                    break;
                case 'oval':
                    x0=element.getAttribute('cx');
                    y0=element.getAttribute('cy');
                    if(node<1) {
                        offset.x=-w/2;
                        offset.y=-h/2;
                    }
                    else {
                        offset.x=(node%2<1)?-w:0;
                        offset.y=(node>2)?-h:0;
                    }
                    break;
                case 'arc':
                    var d=element.getAttribute('d');
                    getArc(d);
                    x0=arc.cx;
                    y0=arc.cy;
                    switch(node) {
                        case 0:
                            offset.x=bounds.x-x0;
                            offset.y=bounds.y-y0;
                            break;
                        case 1:
                            offset.x=bounds.x-arc.x1;
                            offset.y=bounds.y-arc.y1;
                            break;
                        case 2:
                            offset.x=bounds.x-arc.x2;
                            offset.y=bounds.y-arc.y2;
                    }
                    break;
                case 'text':
                    x0=element.getAttribute('x');
                    y0=element.getAttribute('y');
                    var bounds=element.getBBox();
                    offset.x=0;
                    offset.y=-bounds.height;
                    break;
                case 'dim':
                    id('blueBox').setAttribute('width',0);
                    id('blueBox').setAttribute('height',0);
                    mode='dimAdjust';
                    x0=parseInt(element.firstChild.getAttribute('x1'));
                    y0=parseInt(element.firstChild.getAttribute('y1'));
                    dx=parseInt(element.firstChild.getAttribute('x2'))-x0;
                    dy=parseInt(element.firstChild.getAttribute('y2'))-y0;
                    id('blueLine').setAttribute('x1',x0);
                    id('blueLine').setAttribute('y1',y0);
                    id('blueLine').setAttribute('x2',(x0+dx));
                    id('blueLine').setAttribute('y2',(y0+dy));
                    var spin=element.getAttribute('transform');
                    id('blueLine').setAttribute('transform',spin);
                    id('guides').style.display='block';
                    prompt('MOVE DIMENSION (UP/DOWN)');
                    break;
                case 'combi':
                    x0=element.getAttribute('x');
                    y0=element.getAttribute('y');
            }
            console.log('offsets: '+offset.x+','+offset.y);
            id('blueBox').setAttribute('x',x+offset.x);
            id('blueBox').setAttribute('y',y+offset.y);
            id('guides').style.display='block';
            id('graphic').addEventListener('pointermove',drag);
            return;
        }
        else if(val.startsWith('sizer')) {
            node=parseInt(val.substr(5)); // COULD GO AT START OF HANDLES SECTION?
            if(mode=='addPoint') {
                console.log('add point after point '+node);
                var points=element.points;
                console.log('point '+node+': '+points[node].x+','+points[node].y);
                var n=points.length-1;
                var pts='';
                if(node==n) { // append point after end-point
                    dx=points[n].x-points[n-1].x;
                    dy=points[n].y-points[n-1].y;
                    x=points[n].x+dx;
                    y=points[n].y+dy;
                    for(var i=0;i<points.length;i++) {
                        pts+=points[i].x+','+points[i].y+' ';
                    }
                    pts+=x+','+y;
                }
                else { // insert point midway between selected point and next point
                    console.log('add between points '+val+'('+points[val].x+','+points[val].y+') and '+(val+1));
                    x=Math.round((points[val].x+points[val+1].x)/2);
                    y=Math.round((points[val].y+points[val+1].y)/2);
                    var i=0;
                    while(i<points.length) {
                        if(i==val) pts+=points[i].x+','+points[i].y+' '+x+','+y+' ';
                        else pts+=points[i].x+','+points[i].y+' ';
                        console.log('i: '+i+' pts: '+pts);
                        i++;
                    }
                }
                element.setAttribute('points',pts);
                updateGraph(elID,['points',pts]);
                refreshNodes(element);
                cancel();
                return;
            }
            else if(mode=='removePoint') {
                console.log('remove point '+node);
                var points=element.points;
                console.log('point '+node+': '+points[node].x+','+points[node].y);
                var pts='';
                for(var i=0;i<points.length-1;i++) {
                    if(i<val) pts+=points[i].x+','+points[i].y+' ';
                    else pts+=points[i+1].x+','+points[i+1].y+' ';
                }
                element.setAttribute('points',pts);
                updateGraph(elID,['points',pts]);
                refreshNodes(element);
                cancel();
                return;
            }
            else prompt('drag to SIZE');
            console.log('size using node '+node);
            dx=dy=0;
            switch(type(element)) {
                case 'line':
                case 'shape':
                    mode='movePoint'+node;
                    var points=element.getAttribute('points');
                    id('bluePolyline').setAttribute('points',points);
                    id('blueBox').setAttribute('width',0);
                    id('blueBox').setAttribute('height',0);
                    id('guides').style.display='block';
                    break;
                case 'box':
                    mode='boxSize';
                    // dx=dy=0; // MOVE FOR GENERAL USE?
                    break;
                case 'oval':
                    mode='ovalSize';
                    // dx=dy=0; // MOVE FOR GENERAL USE?
                    break;
                case 'arc':
                    mode='arcSize';
                    var d=element.getAttribute('d');
                    getArc(d);
                    x0=arc.cx;
                    y0=arc.cy;
                    console.log('arc centre: '+x0+','+y0+' radius: '+arc.radius);
                    id('blueBox').setAttribute('width',0);
                    id('blueBox').setAttribute('height',0);
                    id('blueOval').setAttribute('cx',x0); // circle for radius
                    id('blueOval').setAttribute('cy',y0);
                    id('blueOval').setAttribute('rx',arc.r);
                    id('blueOval').setAttribute('ry',arc.r);
                    id('blueLine').setAttribute('x1',x0); // prepare radius
                    id('blueLine').setAttribute('y1',y0);
                    id('blueLine').setAttribute('x2',x0);
                    id('blueLine').setAttribute('y2',y0);
                    id('guides').style.display='block';
                    break;
            }
            id('graphic').addEventListener('pointermove',drag);
            return;
        }
    }
    snap=snapCheck(); //  JUST DO if(snapCheck())?
    console.log('SNAP: '+snap);
    if(snap) { // snap start/centre to snap target
        x0=x;
        y0=y;
    }
    console.log('mode: '+mode);
    switch(mode) {
        case 'line':
            blueline=id('bluePolyline');
            var point=id('svg').createSVGPoint();
            point.x=x;
            point.y=y;
            if(blueline.points.length>1) {
            // if(element.points.length>1) {
                point=blueline.points[blueline.points.length-1];
                // point=element.points[element.points.length-1];
                x0=point.x;
                y0=point.y;
            }
            else if(blueline.points.length>0) blueline.points[0]=point;
            blueline.points.appendItem(point);
            refreshNodes(blueline); // set blueline nodes to match new point
            id('guides').style.display='block';
            prompt('LINES: drag to next point; tap twice to end lines or on start to close shape');
            break;
        case 'box':
            id('blueBox').setAttribute('x',x0);
            id('blueBox').setAttribute('y',y0);
            id('guides').style.display='block';
            prompt('BOX: drag to size');
            break;
        case 'oval':
            id('blueOval').setAttribute('cx',x0);
            id('blueOval').setAttribute('cy',y0);
            id('guides').style.display='block';
            prompt('OVAL: drag to size');
            break;
        case 'arc':
            arc.x1=x0;
            arc.y1=y0;
            prompt('ARC: drag to centre');
            id('blueLine').setAttribute('x1',arc.x1);
            id('blueLine').setAttribute('y1',arc.y1);
            id('blueLine').setAttribute('x2',arc.x1);
            id('blueLine').setAttribute('y2',arc.y1);
            id('guides').style.display='block';
            break;
        case 'text':
            console.log('show text dialog');
            id('textDialog').style.left=scr.x+'px';
            id('textDialog').style.top=scr.y+'px';
            id('text').value='';
            id('textDialog').style.display='block';
            break;
        case 'combi':
            console.log('place combi '+combiID+' at '+x0+','+y0);
            var graph={};
	        graph.type='combi';
            graph.name=combiID;
            graph.x=x0;
            graph.y=y0;
            graph.spin=0;
	        graph.flip=0;
	        addGraph(graph);
	        cancel();
            break;
        case 'select':
        case 'pointEdit':
            id('selectionBox').setAttribute('x',x0);
            id('selectionBox').setAttribute('y',y0);
            id('guides').style.display='block';
            selectionBox.x=x0;
            selectionBox.y=y0;
            selectionBox.w=selectionBox.h=0;
            showSizes(true);
    }
    event.stopPropagation();
    console.log('exit pointer down code');
    if(mode!='combi') id('graphic').addEventListener('pointermove',drag);
});
// POINTER MOVE
function drag(event) {
    event.preventDefault();
    id('datumSet').style.display='block'; // show datum lines while dragging
    scr.x=Math.round(event.clientX);
    scr.y=Math.round(event.clientY);
    x=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=Math.round(scr.y*scaleF/zoom+dwg.y);
    if((Math.abs(x-x0)<snapD)&&(Math.abs(y-y0)<snapD)) return; // ignore tiny drag
    // console.log('drag from '+x0+','+y0+' to '+x+','+y+' mode: '+mode);
    if(mode!='arcEnd') {
        snap=snapCheck(); // snap to nearby nodes, datum,...
        // console.log('SNAP: '+snap);
        if(!snap) {
            if(Math.abs(x-x0)<snapD) x=x0; // ...vertical...
            if(Math.abs(y-y0)<snapD) y=y0; // ...or horizontal
        }
    }
    if(mode.startsWith('movePoint')) {
        // var n=parseInt(mode.substr(9));
        // console.log('drag polyline point '+n);
        id('bluePolyline').points[node].x=x;
        id('bluePolyline').points[node].y=y;
    }
    else switch(mode) {
        case 'move':
            if(selection.length>1) { // move multiple selection
                dx=x-x0;
                dy=y-y0;
                id('selection').setAttribute('transform','translate('+dx+','+dy+')');
            }
            else { // drag  single element
                id('blueBox').setAttribute('x',Number(x)+Number(offset.x));
                id('blueBox').setAttribute('y',Number(y)+Number(offset.y));
                // console.log('dragged to '+x+','+y);
            }
            if(anchor) {
                id('anchor').setAttribute('x',x);
                id('anchor').setAttribute('y',y);
            }
            setSizes('polar',null,x0,y0,x,y);
            break;
        case 'boxSize':
            var aspect=w/h;
            dx=(node%2<1)?(x-x0):(x0-x);
            dy=(node>2)?(y-y0):(y0-y);
            if(Math.abs(dx)<(snapD*2)) dx=0; // snap to equal width,...
            else if(Math.abs(dy)<(snapD*2)) dy=0; // ...equal height,... 
            else if((w+dx)/(h+dy)>aspect) dy=dx/aspect; // ...or equal proportion
            else dx=dy*aspect;
            x=parseInt(element.getAttribute('x'));
            y=parseInt(element.getAttribute('y'));
            w=parseInt(element.getAttribute('width'));
            h=parseInt(element.getAttribute('height'));
            if(node%2>0) id('blueBox').setAttribute('x',(x-dx)); // sizing left edge
            if(node<3) id('blueBox').setAttribute('y',(y-dy)); // sizing top edge
            w+=dx;
            h+=dy;
            id('blueBox').setAttribute('width',w);
            id('blueBox').setAttribute('height',h);
            setSizes('box',null,w,h);
            break;
        case 'ovalSize':
            var aspect=w/h;
            dx=(node%2<1)?(x-x0):(x0-x);
            dy=(node>2)?(y-y0):(y0-y);
            if(Math.abs(dx)<(snapD*2)) dx=0; // snap to equal width,...
            else if(Math.abs(dy)<(snapD*2)) dy=0; // ...equal height,... 
            else if((w+dx)/(h+dy)>aspect) dy=dx/aspect; // ...or equal proportion
            else dx=dy*aspect;
            x=parseInt(element.getAttribute('cx')); // centre
            y=parseInt(element.getAttribute('cy'));
            w=parseInt(element.getAttribute('rx'))*2; // overall size
            h=parseInt(element.getAttribute('ry'))*2;
            x-=w/2; // left
            y-=h/2; // top
            if(node%2>0) id('blueBox').setAttribute('x',(x-dx)); // sizing left edge
            if(node<3) id('blueBox').setAttribute('y',(y-dy)); // sizing top edge
            w+=dx;
            h+=dy;
            id('blueBox').setAttribute('width',w);
            id('blueBox').setAttribute('height',h);
            console.log('set size to '+w+'x'+h);
            setSizes('box',null,w,h);
            break;
        case 'arcSize':
            dx=x-x0;
            dy=y-y0;
            var r=Math.sqrt((dx*dx)+(dy*dy));
            if(Math.abs(r-arc.r)<snapD) { // change angle but not radius
                id('blueLine').setAttribute('x2',x);
                id('blueLine').setAttribute('y2',y);
                id('blueOval').setAttribute('rx',arc.r);
                id('blueOval').setAttribute('ry',arc.r);
                var a=Math.atan(dy/dx); // radians
                a=a*180/Math.PI+90; // 'compass' degrees
                if(dx<0) a+=180;
                id('second').value=a; // new angle
            }
            else { // change radius but not angle
                id('blueOval').setAttribute('rx',r);
                id('blueOval').setAttribute('ry',r);
                id('blueLine').setAttribute('x2',x0);
                id('blueLine').setAttribute('y2',y0);
                id('first').value=r; // new radius
            }
            break;
        case 'pan':
            dx=dwg.x-(x-x0);
            dy=dwg.y-(y-y0);
            // console.log('drawing x,y: '+dx+','+dy);
            id('svg').setAttribute('viewBox',dx+' '+dy+' '+(dwg.w*scale/zoom)+' '+(dwg.h*scale/zoom));
            id('ref').setAttribute('viewBox',dx+' '+dy+' '+(dwg.w*scale/zoom)+' '+(dwg.h*scale/zoom));
            break;
        case 'line':
            if(Math.abs(x-x0)<snapD) x=x0; // snap to vertical
            if(Math.abs(y-y0)<snapD) y=y0; // snap to horizontal
            var n=blueline.points.length;
            // var n=element.points.length;
            var point=blueline.points[n-1];
            // var point=element.points[n-1];
            point.x=x;
            point.y=y;
            blueline.points[n-1]=point;
            // element.points[n-1]=point;
            setSizes('polar',null,x0,y0,x,y);
            break;
        case 'box':
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            if(Math.abs(w-h)<snapD*2) w=h; // snap to square
            var left=(x<x0)?(x0-w):x0;
            var top=(y<y0)?(y0-h):y0;
            id('blueBox').setAttribute('x',left);
            id('blueBox').setAttribute('y',top);
            id('blueBox').setAttribute('width',w);
            id('blueBox').setAttribute('height',h);
            setSizes('box',null,w,h);
            break;
        case 'oval':
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            if(Math.abs(w-h)<snapD*2) w=h; // snap to circle
            var left=(x<x0)?(x0-w):x0;
            var top=(y<y0)?(y0-h):y0;
            id('blueOval').setAttribute('cx',(left+w/2));
            id('blueOval').setAttribute('cy',(top+h/2));
            id('blueOval').setAttribute('rx',w/2);
            id('blueOval').setAttribute('ry',h/2);
            setSizes('box',null,w,h);
            break;
        case 'arc':
            if(Math.abs(x-x0)<snapD) x=x0; // snap to vertical
            if(Math.abs(y-y0)<snapD) y=y0; // snap to horizontal
            w=x-x0;
            h=y-y0;
            if((Math.abs(w)<2)&&(Math.abs(h)<2)) break; // wait for significant movement
            arc.cx=x;
            arc.cy=y;
            arc.radius=Math.round(Math.sqrt(w*w+h*h));
            id('blueLine').setAttribute('x2',arc.cx);
            id('blueLine').setAttribute('y2',arc.cy);
            id('blueOval').setAttribute('cx',x);
            id('blueOval').setAttribute('cy',y);
            id('blueOval').setAttribute('rx',arc.radius);
            id('blueOval').setAttribute('ry',arc.radius);
            setSizes('polar',null,x0,y0,x,y);
            break;
        case 'arcEnd':
            if((x==x0)&&(y==y0)) break;
            if(arc.sweep==null) {
                // console.log('set arc sweep direction');
                if(Math.abs(y-arc.cy)>Math.abs(x-arc.cx)) { // get sweep from horizontal movement
                    console.log('get sweep from x - x0: '+x0+'; x: '+x);
                    if(y<arc.cy) arc.sweep=(x>x0)?1:0; // above...
                    else arc.sweep=(x<x0)?1:0; // ...or below centre of arc
                }
                else {
                    console.log('get sweep from y');
                    if(x<arc.cx) arc.sweep=(y<y0)?1:0; // left or...
                    else arc.sweep=(y>y0)?1:0; // ...right of centre of arc
                }
                console.log('ARC sweep SET TO '+arc.sweep);
            }
            w=x-arc.cx;
            h=y-arc.cy;
            arc.a2=Math.atan(h/w); // radians clockwise from x-axis ????????????
            if(w<0) arc.a2+=Math.PI; // from -PI/2 to 1.5PI
            arc.a2+=Math.PI/2; // 0 to 2PI
            arc.x2=Math.round(arc.cx+arc.r*Math.sin(arc.a2));
            arc.y2=Math.round(arc.cy-arc.r*Math.cos(arc.a2));
            arc.a2*=180/Math.PI; // 0-360 degrees
            x=arc.x2;
            y=arc.y2;
            x0=arc.cx;
            y0=arc.cy;
            setSizes('polar',null,x0,y0,x,y);
            id('blueRadius').setAttribute('x2',arc.x2);
            id('blueRadius').setAttribute('y2',arc.y2);
            break;
        case 'dimPlace':
            if(dim.dir=='v') {
                id('blueDim').setAttribute('x1',x);
                id('blueDim').setAttribute('x2',x);
                dim.offset=Math.round(x-dim.x1);
            }
            else if(dim.dir=='h') {
                id('blueDim').setAttribute('y1',y);
                id('blueDim').setAttribute('y2',y);
                dim.offset=Math.round(y-dim.y1);
            }
            else { // oblique dimension needs some calculation
                dx=dim.x2-dim.x1;
                dy=dim.y2-dim.y1;
                var a=Math.atan(dy/dx); // angle of line between start and end of dimension
                dx=x-x0;
                dy=y-y0;
                o=Math.sqrt(dx*dx+dy*dy);
                if((y<y0)||((y==y0)&&(x<x0))) o=o*-1;
                dim.offset=Math.round(o);
                id('blueDim').setAttribute('x1',dim.x1-o*Math.sin(a));
                id('blueDim').setAttribute('y1',dim.y1+o*Math.cos(a));
                id('blueDim').setAttribute('x2',dim.x2-o*Math.sin(a));
                id('blueDim').setAttribute('y2',dim.y2+o*Math.cos(a));
            }
            break;
        case 'dimAdjust':
            id('blueLine').setAttribute('y1',y);
            id('blueLine').setAttribute('y2',y);
            break;
        case 'select':
        case 'pointEdit':
            var boxX=(x<x0)?x:x0;
            var boxY=(y<y0)?y:y0;
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            id('selectionBox').setAttribute('x',boxX);
            id('selectionBox').setAttribute('y',boxY);
            id('selectionBox').setAttribute('width',w);
            id('selectionBox').setAttribute('height',h);
            selectionBox.x=boxX;
            selectionBox.y=boxY;
            selectionBox.w=w;
            selectionBox.h=h;
            setSizes('box',null,w,h);
    }
    event.stopPropagation();
};
// POINTER UP
id('graphic').addEventListener('pointerup',function() {
    console.log('pointer up at '+x+','+y+' mode: '+mode);
    id('graphic').removeEventListener('pointermove',drag);
    snap=snapCheck(); // NEEDED???
    console.log('snap - x:'+snap.x+' y:'+snap.y+' n:'+snap.n);
    if(mode.startsWith('movePoint')) { // move polyline/polygon point
        id('handles').innerHTML='';
        // var n=parseInt(mode.substr(9));
        console.log('move point '+node);
        element.points[node].x=x;
        element.points[node].y=y;
        if((Math.abs(x-x0)<snapD)&&(Math.abs(y-y0)<snapD)) { // no drag - swop to mover
            console.log('TAP - add mover at node '+node); // node becomes new element 'anchor'
            var html="<use id='mover"+node+"' href='#mover' x='"+x+"' y='"+y+"'/>";
            id('handles').innerHTML=html;
            mode='edit';
            return;
        }
        updateGraph(elID,['points',element.getAttribute('points')]);
        id('bluePolyline').setAttribute('points','0,0');
        refreshNodes(element);
        cancel();
    }
    else switch(mode) {
        case 'move':
            // console.log('move element '+elID+' ends at '+x+','+y);
            id('handles').innerHTML='';
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            if(selection.length>0) {
                dx=x-x0;
                dy=y-y0;
                console.log('selection moved by '+dx+','+dy);
            }
            else selection.push(elID); // move single element
            switch(type(element)) {
                case 'line':
                case 'shape':
                case 'box':
                    dx=x-x0+offset.x;
                    dy=y-y0+offset.y;
                    break;
                case 'oval':
                    dx=x-x0+w/2+offset.x;
                    dy=y-y0+h/2+offset.y;
                    break;
                case 'arc':
                    console.log('moved arc - node is '+node);
                    dx=x-x0;
                    dy=y-y0;
                    //
                    if(node==1) {
                        dx+=(arc.cx-arc.x1);
                        dy+=(arc.cy-arc.y1);
                    }
                    else if(node==2) {
                        dx+=(arc.cx-arc.x2);
                        dy+=(arc.cy-arc.y2);
                    }
                    //
                    break;
                default:
                    dx=x-x0;
                    dy=y-y0;
            }
            console.log('move '+selection.length+' elements by '+dx+','+dy);
            if(anchor && (selection.length>1)) { // dispose of anchor after use
                id('blue').removeChild(id('anchor'));
                anchor=false;
            }
            while(selection.length>0) { // move all selected elements
                elID=selection.pop();
                console.log('move element '+elID);
                element=id(elID);
                move(element,dx,dy);
            }
            id('selection').setAttribute('transform','translate(0,0)');
            cancel();
            break;
        case 'boxSize':
            console.log('pointer up - moved: '+dx+'x'+dy);
            if((Math.abs(dx)<snapD)&&(Math.abs(dy)<snapD)) { // node tapped - add mover
                console.log('TAP - add mover at node '+node);
                var html="<use id='mover"+node+"' href='#mover' x='"+x+"' y='"+y+"'/>";
                id('handles').innerHTML=html;
                mode='edit';
                return;
            }
            id('handles').innerHTML='';
            x=id('blueBox').getAttribute('x');
            y=id('blueBox').getAttribute('y');
            w=id('blueBox').getAttribute('width');
            h=id('blueBox').getAttribute('height');
            updateGraph(elID,['x',x,'y',y,'width',w,'height',h]);
            element.setAttribute('x',x);
            element.setAttribute('y',y);
            element.setAttribute('width',w);
            element.setAttribute('height',h);
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            refreshNodes(element);
            cancel();
            break;
        case 'ovalSize':
            if((Math.abs(dx)<snapD)&&(Math.abs(dy)<snapD)) { // node tapped - add mover
                console.log('TAP - add mover at node '+node);
                var html="<use id='mover"+node+"' href='#mover' x='"+x+"' y='"+y+"'/>";
                id('handles').innerHTML=html;
                mode='edit';
                return;
            }
            id('handles').innerHTML='';
            x=Number(id('blueBox').getAttribute('x'));
            y=Number(id('blueBox').getAttribute('y'));
            w=Number(id('blueBox').getAttribute('width'));
            h=Number(id('blueBox').getAttribute('height'));
            updateGraph(elID,['cx',(x+w/2),'y',(y+h/2),'rx',w/2,'height',h/2]);
            element.setAttribute('cx',(x+w/2));
            element.setAttribute('cy',(y+h/2));
            element.setAttribute('rx',w/2);
            element.setAttribute('ry',h/2);
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            refreshNodes(element);
            cancel();
            break;
        case 'arcSize':
            if((Math.abs(dx)<snapD)&&(Math.abs(dy)<snapD)) { // node tapped - add mover
                console.log('TAP - add mover at node '+node);
                var html="<use id='mover"+node+"' href='#mover' x='"+x+"' y='"+y+"'/>";
                id('handles').innerHTML=html;
                mode='edit';
                return;
            }
            dx=x-x0;
            dy=y-y0;
            r=Math.sqrt((dx*dx)+(dy*dy));
            console.log('pointer up - radius: '+r);
            if(Math.abs(r-arc.r)<snapD) { // radius unchanged - set angle
                var a=Math.atan(dy/dx);
                if(node<2) {
                    arc.x1=x0+arc.r*Math.cos(a);
                    arc.y1=y0+arc.r*Math.sin(a);
                }
                else {
                    arc.x2=x0+arc.r*Math.cos(a);
                    arc.y2=y0+arc.r*Math.sin(a);
                }
            }
            else { // radius changed - adjust arc start...
                dx=arc.x1-arc.cx;
                dy=arc.y1-arc.cy;
                dx*=r/arc.r;
                dy*=r/arc.r;
                arc.x1=arc.cx+dx;
                arc.y1=arc.cy+dy;
                // ...and end points...
                dx=arc.x2-arc.cx;
                dy=arc.y2-arc.cy;
                dx*=r/arc.r;
                dy*=r/arc.r;
                arc.x2=arc.cx+dx;
                arc.y2=arc.cy+dy;
                // ...and radius 
                arc.r=r;
            }
            var d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
            element.setAttribute('d',d);
            updateGraph(elID,['x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2,'r',arc.r]);
            refreshNodes(element);
            id('handles').innerHTML='';
            id('blueOval').setAttribute('rx',0);
            id('blueOval').setAttribute('ry',0);
            cancel();
            break;
        case 'pan':
            console.log('pan ends at '+x+','+y);
            dwg.x-=(x-x0);
            dwg.y-=(y-y0);
            // console.log('drawing x,y: '+dwg.x+','+dwg.y+'; scale: '+scale+'; zoom: '+zoom);
            // STAY IN PAN MODE UNTIL TAP TO EXIT
            if((Math.abs(x-x0)<snapD)&&(Math.abs(y-y0)<snapD)) mode='select';
            // console.log('mode is '+mode);
            break;
        case 'line':
            console.log('pointer up - blueline is '+blueline.id);
            var n=blueline.points.length;
            if(snap) {  // adjust previous point to snap target
                blueline.points[n-1].x=x;
                blueline.points[n-1].y=y;
            }
            // var n=element.points.length;
            console.log(n+' points');
            var d=Math.sqrt((x-x0)*(x-x0)+(y-y0)*(y-y0));
            refreshNodes(blueline); // set blueline nodes to match new point
            if((d<snapD)||(n>9)) { // click/tap to finish polyline - capped to 10 points
                console.log('END LINE');
                var points=blueline.points;
                // var points=id('bluePolyline').points;
                console.log('points: '+points);
                // create polyline element
                var graph={};
	            graph.type='line';
	            graph.points='';
	            var len=0;
	            for(var i=0;i<points.length-1;i++) {
	                graph.points+=(points[i].x+','+points[i].y+' ');
	                if(i>0) len+=Math.abs(points[i].x-points[i-1].x)+Math.abs(points[i].y-points[i-1].y);
	            }
	            graph.spin=0;
	            graph.stroke=lineShade;
	            graph.lineW=(pen*scale);
	            graph.lineStyle=lineType;
	            graph.fill='none';
	            if(len>=scale) addGraph(graph); // avoid zero-size lines
	            blueline.setAttribute('points','0,0');
	            // id('bluePolyline').setAttribute('points','0,0');
	            cancel();
            }
            else { // check if close to start point
                point=blueline.points[0]; // start point
                console.log('at '+x+','+y+' start at '+point.x+','+point.y);
                dx=x-point.x;
                dy=y-point.y;
                var d=Math.sqrt(dx*dx+dy*dy);
                if(d<snapD) { // close to start - create shape
                    console.log('CLOSE SHAPE');
                    var points=blueline.points;
                    // var points=id('bluePolyline').points;
                    console.log('points: '+points);
                    var graph={}; // create polygon element
                    graph.type='shape';
                    graph.points='';
                    var len=0;
	                for(var i=0;i<points.length-1;i++) {
	                    graph.points+=(points[i].x+','+points[i].y+' ');
	                    if(i>0) len+=Math.abs(points[i].x-points[i-1].x)+Math.abs(points[i].y-points[i-1].y);
	                }
	                graph.spin=0;
	                graph.stroke=lineShade;
	                graph.lineW=(pen*scale);
	                graph.lineStyle=lineType;
	                graph.fill=fillShade;
	                if(len>=scale) addGraph(graph); // avoid zero-size shapes
	                blueline.setAttribute('points','0,0');
	                // id('bluePolyline').setAttribute('points','0,0');
	                cancel();
                }
            }
            break;
        case 'shape':
            if(snap) {  // adjust previous point to snap target
                var n=element.points.length;
                var point=element.points[n-1];
                point.x=x;
                point.y=y;
                element.points[n-1]=point;
            }
            point=element.points[0]; // start point
            console.log('at '+x+','+y+' start at '+point.x+','+point.y);
            dx=x-point.x;
            dy=y-point.y;
            var d=Math.sqrt(dx*dx+dy*dy);
            if((d>snapD)&&(n<11)) break; // check if close to start point - if not, continue but cap at 10 sides
            console.log('end polyline & create shape');
            var points=id('bluePolyline').points;
            console.log('points: '+points);
            var graph={}; // create polygon element
            graph.type='shape';
            graph.points='';
            var len=0;
	        for(var i=0;i<points.length-1;i++) {
	            graph.points+=(points[i].x+','+points[i].y+' ');
	            if(i>0) len+=Math.abs(points[i].x-points[i-1].x)+Math.abs(points[i].y-points[i-1].y);
	        }
	        graph.spin=0;
	        graph.stroke=lineShade;
	        graph.lineW=(pen*scale);
	        graph.lineStyle=lineType;
	        graph.fill=fillShade;
	        if(len>=scale) addGraph(graph); // avoid zero-size shapes
	        id('bluePolyline').setAttribute('points','0,0');
	        cancel();
            break;
        case 'box':
            console.log('finish box');
            var graph={}
	        graph.type='box';
	        graph.x=parseInt(id('blueBox').getAttribute('x'));
	        graph.y=parseInt(id('blueBox').getAttribute('y'));
	        graph.width=w;
	        graph.height=h;
	        graph.radius=rad;
	        graph.spin=0;
	        graph.stroke=lineShade;
	        graph.lineW=pen*scale;
	        graph.lineStyle=lineType;
	        graph.fill=fillShade;
	        graph.opacity=opacity;
	        if((graph.width>=scale)&&(graph.width>=scale)) addGraph(graph); // avoid zero-size boxes
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            cancel();
            break;
        case 'oval':
            var graph={};
	        graph.type='oval';
	        graph.cx=parseInt(id('blueOval').getAttribute('cx'));
	        graph.cy=parseInt(id('blueOval').getAttribute('cy'));
	        graph.rx=w/2;
	        graph.ry=h/2;
	        graph.spin=0;
	        graph.stroke=lineShade
	        graph.lineStyle=lineType;
	        graph.lineW=pen*scale;
	        graph.fill=fillShade;
	        graph.opacity=opacity;
	        if((graph.rx>=scale)&&(graph.ry>=scale)) addGraph(graph); // avoid zero-size ovals
		    id('blueOval').setAttribute('rx',0);
            id('blueOval').setAttribute('ry',0);
            cancel();
            break;
        case 'arc':
            arc.cx=x;
            arc.cy=y;
            // console.log('arcCentre: '+arc.centreX+','+arc.centreY);
            w=arc.x1-arc.cx; // radii
            h=arc.y1-arc.cy;
            arc.r=Math.sqrt(w*w+h*h); // arc radius
            arc.a1=Math.atan(h/w); // start angle - radians clockwise from x-axis NO!!
            if(w<0) arc.a1+=Math.PI; // from -PI/2 to +1.5PI
            arc.a1+=Math.PI/2; // 0 to 2PI
            arc.a1*=180/Math.PI; // 0-180 degrees
            console.log('START ANGLE: '+(arc.a1)+'; radius: '+arc.r);
            arc.sweep=null; // determine sweep when move pointer
            arc.major=0; // always starts with minor arc
            x0=arc.x1;
            y0=arc.y1;
            id('blueRadius').setAttribute('x1',arc.cx); // draw blue arc radius with arrows
            id('blueRadius').setAttribute('y1',arc.cy); 
            id('blueRadius').setAttribute('x2',arc.x1); 
            id('blueRadius').setAttribute('y2',arc.y1);
            mode='arcEnd';
            break;
        case 'arcEnd':
            console.log('END ANGLE: '+arc.a2);
            var a=arc.a2-arc.a1;
            if(a<0) a+=360;
            if(arc.sweep<1) a=360-a;
            arc.major=(Math.abs(a)>180)? 1:0;
            console.log('arc angle: '+a+'deg; major: '+arc.major+'; sweep: '+arc.sweep);
            var graph={};
            graph.type='arc';
	        graph.cx=arc.cx; // centre coordinates
	        graph.cy=arc.cy;
	        graph.x1=arc.x1; // start point
	        graph.y1=arc.y1;
	        graph.x2=arc.x2; // end point
	        graph.y2=arc.y2;
	        graph.r=arc.r; // radius
	        graph.major=arc.major; // major/minor arc - 1/0
	        graph.sweep=arc.sweep; // direction of arc - 1: clockwise, 0: anticlockwise
	        graph.spin=0;
	        graph.stroke=lineShade
	        graph.lineStyle=lineType;
	        graph.lineW=pen*scale;
	        graph.fill='none'; // arcs default to no fill
	        graph.opacity=0;
	        if((arc.r>=scale)&&(a!=0)) addGraph(graph); // avoid zero-size arcs
            id('blueOval').setAttribute('rx',0);
            id('blueOval').setAttribute('ry',0);
            id('blueLine').setAttribute('x1',0);
            id('blueLine').setAttribute('y1',0);
            id('blueLine').setAttribute('x2',0);
            id('blueLine').setAttribute('y2',0);
            id('blueRadius').setAttribute('x1',0);
            id('blueRadius').setAttribute('y1',0);
            id('blueRadius').setAttribute('x2',0);
            id('blueRadius').setAttribute('y2',0);
            cancel();
            break;
        case 'dimStart':
            if(snap) {
                console.log('SNAP - start dimension at '+x+','+y+'; node '+snap.n);
                dim.x1=x;
                dim.y1=y;
                // dim.el1=snap.el;
                dim.n1=snap.n;
                dim.dir=null;
                mode='dimEnd';
                prompt('DIMENSION: tap end node');
            break;
            }
            else prompt('DIMENSION: tap start node')
            break;
        case 'dimEnd':
            if(snap) {
                console.log('SNAP - end dimension at '+x+','+y+'; node '+snap.n);
                dim.x2=x;
                dim.y2=y;
                // dim.el2=snap.el;
                dim.n2=snap.n;
                if(dim.x1==dim.x2) dim.dir='v'; // vertical
                else if(dim.y1==dim.y2) dim.dir='h'; // horizontal
                if(dim.dir) {
                    id('blueDim').setAttribute('x1',dim.x1);
                    id('blueDim').setAttribute('y1',dim.y1);
                    id('blueDim').setAttribute('x2',dim.x2);
                    id('blueDim').setAttribute('y2',dim.y2);
                    id('guides').style.display='block';
                    prompt('DIMENSION: drag to position');
                    mode='dimPlace';
                }
                else showDialog('dimDialog',true);
                console.log('dimension direction: '+dim.dir);
            }
            else prompt('Tap on a node at dimension end-point');
            break;
        case 'dimPlace':
            var graph={};
            graph.type='dim';
            if((dim.x1>dim.x2)||(dim.x1==dim.x2)&&(dim.y1>dim.y2)) {
                graph.x1=dim.x2;
                graph.y1=dim.y2;
                graph.x2=dim.x1;
                graph.y2=dim.y1;
                // graph.el1=dim.el2;
                graph.n1=dim.n2;
                // graph.el2=dim.el1;
                graph.n2=dim.n1;
            }
            else {
                graph.x1=dim.x1;
                graph.y1=dim.y1;
                graph.x2=dim.x2;
                graph.y2=dim.y2;
                // graph.el1=dim.el1;
                graph.n1=dim.n1;
                // graph.el2=dim.el2;
                graph.n2=dim.n2;
            }
            graph.dir=dim.dir; // direction: h/v/o (horizontal/vertical/oblique)
            graph.offset=dim.offset;
            id('blueDim').setAttribute('x1',0);
            id('blueDim').setAttribute('y1',0);
            id('blueDim').setAttribute('x2',0);
            id('blueDim').setAttribute('y2',0);
            addGraph(graph);
            cancel();
            break;
        case 'dimAdjust':
            var x1=parseInt(id('blueLine').getAttribute('x1'));
            var y1=parseInt(id('blueLine').getAttribute('y1'));
            var x2=parseInt(id('blueLine').getAttribute('x2'));
            var y2=parseInt(id('blueLine').getAttribute('y2'));
            var line=element.firstChild;
            line.setAttribute('x1',x1);
            line.setAttribute('y1',y1);
            line.setAttribute('x2',x2);
            line.setAttribute('y2',y2);
            var text=element.childNodes[1];
            text.setAttribute('x',(x1+x2)/2);
            text.setAttribute('y',(y1-1));
            id('blueLine').setAttribute('x1',0);
            id('blueLine').setAttribute('y1',0);
            id('blueLine').setAttribute('x2',0);
            id('blueLine').setAttribute('y2',0);
            id('blueLine').setAttribute('transform','rotate(0)');
            dy=y1-y0;
            var request=db.transaction('graphs').objectStore('graphs').get(Number(elID));
            request.onsuccess=function(event) {
                dim=request.result;
                console.log('dimension start node: '+dim.x1+','+dim.y1);
                dim.offset+=dy; // dimension moved up/down before rotation
                request=db.transaction('graphs','readwrite').objectStore('graphs').put(dim);
                request.onsuccess=function(event) {
                    console.log('dimension graph updated - offset is '+dim.offset );
                }
                request.onerror=function(event) {
                    console.log('error updating dimension');
                }
            }
            request.onerror=function(event) {
                console.log('get error');
            }
            cancel();
            break;
        case 'anchor':
            if(snap) {
                console.log('SNAP - place anchor: '+snap);
                var html="<use id='anchor' href='#mover' x='"+x+"' y='"+y+"'/>";
                // var html="<circle id='anchor' cx='"+x+"' cy='"+y+"' r='"+(2*scale)+"' stroke='blue' stroke-width='"+(0.25*scale)+"' fill='gray' fill-opacity='0.5'/>";
                id('blue').innerHTML+=html; // anchor is pseudo-element - put in <blue> layer
                anchor=true;
                mode='select';
                console.log('anchor placed');
                setButtons();
            }
            else prompt('Tap on a node to place anchor');
            break;
        case 'pointEdit':
            console.log('SELECT POINTS');
            if((selectionBox.w>20)&&(selectionBox.h>20)) { // significant selection box size
                var left=selectionBox.x;
                var right=selectionBox.x+selectionBox.w;
                var top=selectionBox.y;
                var bottom=selectionBox.y+selectionBox.h;
                console.log('box: '+left+'-'+right+' x '+top+'-'+bottom);
                var points=element.points;
                console.log('element has '+points.length+' points');
                selectedPoints=[];
                for(var i=0;i<points.length;i++) {
                    console.log('point '+i+': '+points[i].x+','+points[i].y);
                    if(points[i].x<left) continue;
                    if(points[i].y<top) continue;
                    if(points[i].x>right) continue;
                    if(points[i].y>bottom) continue;
                    selectedPoints.push(i);
                }
                console.log(selectedPoints.length+' points selected');
                if(selectedPoints.length>0) id('handles').innerHTML=''; // remove handles
                break;
            }
        case 'select':
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            id('guides').style.display='none';
            console.log('box size: '+selectionBox.w+'x'+selectionBox.h);
            if((selectionBox.w>20)&&(selectionBox.h>20)) { // significant selection box size
                console.log('GROUP SELECTION - box: '+selectionBox.w+'x'+selectionBox.h+' at '+selectionBox.x+','+selectionBox.y);
                var items=id('dwg').childNodes;
                console.log(items.length+' elements in dwg');
                for(var i=0;i<items.length;i++) { // collect elements entirely within selectionBox
                    console.log('item '+i+': '+items[i].id);
                    var el=id(items[i].id);
                    if((type(el)=='dim')||!el) continue; // don't include dimensions or 'null' nodes
                    var box=getBounds(items[i]);
                    console.log('bounds for '+items[i].id+": "+box.x+','+box.y);
                    console.log('item '+items[i].id+' box: '+box.width+'x'+box.height+' at '+box.x+','+box.y);
                    if(box.x<selectionBox.x) continue;
                    if(box.y<selectionBox.y) continue;
                    if((box.x+box.width)>(selectionBox.x+selectionBox.w)) continue;
                    if((box.y+box.height)>(selectionBox.y+selectionBox.h)) continue;
                    selection.push(items[i].id); // add to selection if passes tests
                    console.log('select '+items[i].id);
                    // if(type(el)=='combi') continue; // no blue box for combis
                    var html="<rect x='"+box.x+"' y='"+box.y+"' width='"+box.width+"' height='"+box.height+"' ";
                    html+="stroke='none' fill='blue' fill-opacity='0.25' el='"+items[i].id+"'/>";
                    id('selection').innerHTML+=html;
                }
                if(selection.length>0) { // highlight selected elements
                    mode='edit';
                    showEditTools(true);
                    console.log(selection.length+' elements selected');
                    // NEW CODE...
                    if(selection.length<2) {
                        console.log('only one selection');
                        id('selection').innerHTML=''; // no blue box
                        element=id(selection[0]);
                        // elID=selection[0];
                        // element=id(elID);
                        select(element); // add handles etc
                        // setStyle(element);
                    }
                    /* OLD CODE
                    if(selection.length<2) {
                        console.log('only one selection');
                        id('selection').innerHTML=''; // no blue box
                        elID=selection[0];
                        element=id(elID);
                        select(element); // add handles etc
                        // setStyle(element);
                    }
                    */
                    return;
                }
            }
            showSizes(false);
        case 'edit':
            var el=event.target;
            console.log('pointer up on element '+el.id);
            var hit=null;
            if(el.parentNode.id=='drawing') { // drawing background - check 10x10px zone
                console.log('nowt! - search locality');
                var e=-5;
                var n=-5;
                while(e<6 && !hit) {
                    n=-5;
                    while(n<6 && !hit) {
                        // console.log('check at '+e+','+n+' '+(scr.x+e)+','+(scr.y+n));
                        el=document.elementFromPoint(scr.x+e,scr.y+n);
                        console.log('element '+el.id);
                        if((el.id!='svg')&&(!el.id.startsWith('datum'))) hit=el.id; 
                        n++; 
                    }
                    e++;
                }
            }
            else while((el.parentNode.id!='dwg')&&(el.parentNode.id!='drawing')) {
                el=el.parentNode; // combis have elements within groups in svg container
            }
            console.log('parent is '+el.parentNode.id);
            if(el.parentNode.id=='dwg') hit=el.id;
            if(hit) console.log('HIT: '+hit+' type: '+type(el));
            else console.log('MISS');
            console.log('selected: '+selection.length);
            if(hit) {
                if(selection.indexOf(hit)<0) { // add to selection
                    selection.push(hit);
                    if(selection.length<2) { // only item selected
                    	// NEW CODE...
                    	// elID=hit;
                        element=id(hit);
                        select(element,false);
                        /* OLD CODE
                        elID=hit;
                        element=id(elID);
                        select(element);
                        */
                    }
                    else { // multiple selection
                        console.log('add '+type(el)+' '+el.id+' to multiple selection');
                        // NEW CODE...
                        if(selection.length<3) {
                            console.log('SECOND SELECTED ITEM');
                            id('handles').innerHTML='';
                            select(id(selection[0]),true); // highlight first selected item
                        }
                        select(el,true);
                    }
                    console.log('selected item: '+selection[0]);
                    setStyle();
                    setButtons();
                } // else ignore clicks on items already selected
                showEditTools(true);
            }
            else { // TRY THIS - CLICK ON BACKGROUND CLEARS SELECTION
                cancel();
            }
    }
    event.stopPropagation();
});
// ADJUST ELEMENT SIZES
id('first').addEventListener('change',function() {
    var val=parseInt(id('first').value);
    re('member');
    switch(type(element)) {
        case 'line':
        case 'shape':
            // console.log('element: '+element.id);
            if(elID=='bluePolyline') { // adjust length of latest line segment
                var n=element.points.length;
                var pt0=element.points[n-2];
                var pt1=element.points[n-1];
                w=pt1.x-pt0.x;
                h=pt1.y-pt0.y;
                len=Math.sqrt(w*w+h*h);
                // console.log('length: '+len);
                var r=val/len;
                w*=r;
                h*=r;
                x=x0+w;
                y=y0+h;
                pt1.x=x;
                pt1.y=y;
                // console.log('new end-point: '+x+','+y);
                element.points[n-1]=pt1;
            }
            else { // width of completed (poly)line
                var bounds=element.getBBox();
                w=bounds.width;
                var ratio=val/w;
                var points=element.points;
                console.log('adjust from node '+node);
                for(i=0;i<points.length;i++) {
                    dx=points[i].x-points[node].x;
                    points[i].x=points[node].x+dx*ratio;
                }
                var pts=[];
	            for(var i=0;i<points.length;i++) {
	                pts.push(points[i].x);
	                pts.push(points[i].y);
	            }
                updateGraph(elID,['points',pts]); // UPDATE DB
                refreshNodes(element);
                id('handles').innerHTML='';
                mode='select';
            }
            break;
        case 'box':
            console.log('change width of element '+elID);
            var elX=parseInt(element.getAttribute('x'));
            var elW=parseInt(element.getAttribute('width'));
            switch(node) {
                case 0: // size from centre
                    elX+=elW/2; // centre x
                    elX-=(val/2); // new x
                    break;
                case 2: // size from right
                case 4:
                    elX+=elW; // right x
                    elX-=val; // new x
                    break;
            }
            element.setAttribute('x',elX);
            element.setAttribute('width',val);
            updateGraph(elID,['x',elX,'width',val]);
            refreshNodes(element);
            id('handles').innerHTML='';
            mode='select';
            break;
        case 'oval':
            element.setAttribute('rx',val/2);
            updateGraph(elID,['rx',val/2]);
            var elX=parseInt(element.getAttribute('cx'));
            refreshNodes(element);
            id('handles').innerHTML='';
            mode='select';
            // id('handleSize').setAttribute('x',(elX+val/2-handleR));
            break;
        case 'arc':
            console.log('adjust arc radius to '+val);
            d=element.getAttribute('d');
            getArc(d);
            dx=arc.x1-arc.cx;
            dy=arc.y1-arc.cy;
            dx*=val/arc.r;
            dy*=val/arc.r;
            arc.x1=arc.cx+dx;
            arc.y1=arc.cy+dy;
            // ...and end points...
            dx=arc.x2-arc.cx;
            dy=arc.y2-arc.cy;
            dx*=val/arc.r;
            dy*=val/arc.r;
            arc.x2=arc.cx+dx;
            arc.y2=arc.cy+dy;
            // ...and radius
            console.log('diameter: '+(val*2));
            arc.r=val;
            console.log('arc radius:'+arc.r+' centre:'+arc.cx+','+arc.cy+' start:'+arc.x1+','+arc.y1+' end:'+arc.x2+','+arc.y2);
            var d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
            element.setAttribute('d',d);
            updateGraph(elID,['x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2,'r',arc.r]);
            id('handles').innerHTML='';
            mode='select';
            refreshNodes(element);
            break;
    }
});
id('second').addEventListener('change',function() {
    var val=parseInt(id('second').value);
    re('member');
    switch(type(element)) {
        case 'line':
        case 'shape':
            // console.log('element: '+element.id);
            if(elID=='bluePolyline') { // adjust angle of latest line segment
                var n=element.points.length;
                // console.log(n+' points');
                var pt0=element.points[n-2];
                var pt1=element.points[n-1];
                w=pt1.x-pt0.x;
                h=pt1.y-pt0.y;
                var r=Math.round(Math.sqrt(w*w+h*h));
                if(val==0) {
                    w=0;
                    h=-r;
                }
                else if(val==90) {
                    w=r;
                    h=0;
                }
                else if(val==180) {
                    w=0;
                    h=r;
                }
                else if(val==270) {
                    w=-r;
                    h=0;
                }
                else {
                    val-=90;
                    if(val<0) val+=360;
                    val*=(Math.PI/180);
                    w=r*Math.cos(val);
                    h=r*Math.sin(val);
                }
                pt1.x=pt0.x+w;
                pt1.y=pt0.y+h;
                element.points[n-1]=pt1;
            }
            else { // height of completed (poly)line
                var bounds=element.getBBox();
                h=bounds.height;
                var ratio=val/h;
                var points=element.points;
                console.log('adjust from node '+node);
                for(i=0;i<points.length;i++) {
                    dy=points[i].y-points[node].y;
                    points[i].y=points[node].y+dy*ratio;
                }
                var pts=[];
	            for(var i=0;i<points.length;i++) {
	                pts.push(points[i].x);
	                pts.push(points[i].y);
	            }
                updateGraph(elID,['points',pts]);
                refreshNodes(element);
                id('handles').innerHTML='';
                mode='select';
            }
            break;
        case 'box':
            var elY=parseInt(element.getAttribute('y'));
            var elH=parseInt(element.getAttribute('height'));
            switch(node) {
                case 0: // size from centre
                    elY+=elH/2; // centre y
                    elY-=(val/2); // new y
                    break;
                case 3: // size from bottom
                case 4:
                    elY+=elH; // bottom y
                    elY-=val; // new y
                    break;
            }
            element.setAttribute('y',elY);
            element.setAttribute('height',val);
            updateGraph(elID,['y',elY,'height',val]);
            refreshNodes(element);
            id('handles').innerHTML='';
            mode='select';
            break;
        case 'oval':
            element.setAttribute('ry',val/2);
            updateGraph(elID,['ry',val/2]);
            var elY=parseInt(element.getAttribute('cy'));
            refreshNodes(element);
            id('handles').innerHTML='';
            mode='select';
            // id('handleSize').setAttribute('y',(elY+val/2-handleR));
            break;
        case 'arc':
            console.log('change arc angle to '+val);
            val*=Math.PI/180; // radians
            var d=element.getAttribute('d');
            getArc(d);
            arc.a1=Math.atan((arc.y1-arc.cy)/(arc.x1-arc.cx));
            if(arc.sweep>0) arc.a2=arc.a1+val;
            else arc.a2=arc.a1-val;
            arc.x2=arc.cx+arc.r*Math.cos(arc.a2);
            arc.y2=arc.cy+arc.r*Math.sin(arc.a2);
            console.log('new end point: '+arc.x2+','+arc.y2);
            arc.major=(val>Math.PI)? 1:0;
            d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
            element.setAttribute('d',d);
            updateGraph(elID,['d',d,'x2',x,'y2',y,'sweep',arc.sweep]);
            refreshNodes(element);
            id('handles').innerHTML='';
            mode='select';
    }
});
id('spin').addEventListener('change',function() {
    re('member');
    var val=parseInt(id('spin').value);
    console.log('set spin to '+val+' degrees');
    element.setAttribute('spin',val);
    updateGraph(elID,['spin',val]);
    setTransform(element);
    refreshNodes(element);
});
id('undoButton').addEventListener('click',function() {
    re('call'); // recall & reinstate previous positions/points/sizes/spins/flips
});
// UTILITY FUNCTIONS
function addGraph(el) {
    console.log('add '+el.type+' element - spin: '+el.spin);
    var request=db.transaction('graphs','readwrite').objectStore('graphs').add(el);
    request.onsuccess=function(event) {
        // console.log('result: '+event.target.result);
        el.id=event.target.result;
        console.log('graph added - id: '+el.id+' - draw');
        id('dwg').appendChild(makeElement(el));
    }
    request.onerror=function(event) {
        console.log('add copy failed');
    }
}
function cancel() { // cancel current operation and return to select mode
    mode='select';
    id('tools').style.display='block';
    element=elID=null;
    selection=[];
    selectedPoints=[];
    selectionBox.w=selectionBox.h=0;
    id('selection').innerHTML='';
    id('handles').innerHTML=''; //remove element handles...
    id('selectionBox').setAttribute('width',0);
    id('selectionBox').setAttribute('height',0);
    id('blueBox').setAttribute('width',0);
    id('blueBox').setAttribute('height',0);
    id('blueOval').setAttribute('rx',0);
    id('blueOval').setAttribute('ry',0);
    id('bluePolyline').setAttribute('points','0,0');
    id('guides').style.display='none';
    id('datumSet').style.display='none';
    if(anchor) {
        id('anchor').remove();
        anchor=false;
    }
    showSizes(false);
    showEditTools(false);
    id('textDialog').style.display='none';
    setStyle(); // set styles to defaults
}
function checkDims(el) {
    console.log('check linked dimensions for element '+el.id);
    for(var i=0;i<dims.length;i++) {
        if((Math.floor(dims[i].n1/10)==Number(el.id))||(Math.floor(dims[i].n2/10)==Number(el.id))) {
            refreshDim(dims[i]); // adjust and redraw linked dimension
        }
    }
}
function download(content,fileName,contentType) {
	console.log("save as "+fileName);
	var a=document.createElement('a');
	var file=new Blob([content], {type:contentType});
	a.href=URL.createObjectURL(file);
	a.download=fileName;
	a.click();
	alert('file '+fileName+" saved to downloads folder");
}
function getAngle(x0,y0,x1,y1) {
    var dx=x1-x0;
    var dy=y1-y0;
    var a=Math.atan(dy/dx); // range -PI/25 to +PI/2
    a*=180/Math.PI; // -90 to +90 degrees
    a+=90; // 0-180
    if(dx<0) a+=180; // 0-360
    return a;
}
function getArc(d) {
    arc={};
    console.log('get arc from: '+d);
    var from=1;
    var to=d.indexOf(',');
    arc.cx=parseInt(d.substr(from,to));
    from=to+1;
    to=d.indexOf(' ',from);
    arc.cy=parseInt(d.substr(from,to));
    from=d.indexOf('M',to)+1;
    to=d.indexOf(',',from);
    arc.x1=parseInt(d.substr(from,to));
    from=to+1;
    to=d.indexOf(' ',from);
    arc.y1=parseInt(d.substr(from,to));
    from=d.indexOf('A')+1;
    to=d.indexOf(',',from);
    arc.r=parseInt(d.substr(from,to));
    from=to+1;
    to=d.indexOf(',',from);
    arc.major=parseInt(d.charAt(to-1));
    arc.sweep=parseInt(d.charAt(to+1));
    from=d.indexOf(' ',to);
    to=d.indexOf(',',from);
    arc.x2=parseInt(d.substr(from,to));
    from=to+1;
    arc.y2=parseInt(d.substr(from));
    console.log('arc centre: '+arc.cx+','+arc.cy+' start: '+arc.x1+','+arc.y1+'; radius: '+arc.r+'; major: '+arc.major+'; sweep: '+arc.sweep+'; end: '+arc.x2+','+arc.y2);
}
function getBounds(el) {
    var b=el.getBBox();
    return b;
}
function getLineStyle(el) {
    var lw=parseInt(el.getAttribute('stroke-width'));
    var dash=parseInt(el.getAttribute('stroke-dasharray'));
    if(dash>lw) return 'dashed';
    else if(dash==lw) return'dotted';
    else return 'solid';
}
function id(el) {
	return document.getElementById(el);
}
function initialise() {
    // SET DRAWING ASPECT
    console.log('set up 1:'+scale+' scale '+aspect+' drawing');
    scaleF=25.4*scale/96; // 96px/inch
    handleR=2*scale;
    snapD=2*scale;
    console.log('scaleF: '+scaleF+' handleR=snapD='+snapD);
    dwg.w=(aspect=='landscape')?297:210;
    dwg.h=(aspect=='landscape')?210:297;
    var gridSizes=id('gridSize').options;
    console.log('set '+gridSizes.length+' grid size options for scale '+scale);
    gridSizes[0].disabled=(scale>2);
    gridSizes[1].disabled=(scale>5);
    gridSizes[2].disabled=((scale<5)||(scale>10));
    gridSizes[3].disabled=((scale<5)||(scale>20));
    gridSizes[4].disabled=((scale<10)||(scale>50));
    gridSizes[5].disabled=gridSizes[6].disabled=gridSizes[7].disabled=gridSizes[8].disabled=gridSizes[9].disabled=(scale<50);
    var blues=document.getElementsByClassName('blue');
    console.log(blues.length+' elements in blue class');
    for(var i=0;i<blues.length;i++) blues[i].style.strokeWidth=0.25*scale;
    id('moveCircle').setAttribute('r',handleR);
    id('moveCircle').style.strokeWidth=scale;
    id('sizeDisc').setAttribute('r',handleR);
    id('selectionBox').setAttribute('stroke-dasharray',(scale+' '+scale+' '));
    id('ref').setAttribute('width',(dwg.w+'mm'));
    id('ref').setAttribute('height',(dwg.h+'mm'));
    // id('background').setAttribute('width',dwg.w);
    // id('background').setAttribute('height',dwg.h);
    id('svg').setAttribute('width',(dwg.w+'mm'));
    id('svg').setAttribute('height',(dwg.h+'mm'));
    w=dwg.w*scale; // viewBox is to scale
    h=dwg.h*scale;
    if(((dwg.w/scaleF)>scr.w)||((dwg.h/scaleF)>scr.h)) {
        console.log('ALLOW SMALLER ZOOM');
        zoomLimit/=2;
        // w/=2;
        // h/=2;
    }
    console.log('viewbox: '+w+'x'+h);
    id('ref').setAttribute('viewBox',"0 0 "+w+" "+h);
    id('background').setAttribute('width',w);
    id('background').setAttribute('height',h);
    id('svg').setAttribute('viewBox',"0 0 "+w+" "+h);
    id('datum').setAttribute('transform','scale('+scale+')');
    html="<rect x='0' y='0' width='"+w+"' height='"+h+"'/>"; // clip to drawing edges
    id('clipper').innerHTML=html;
    // console.log('drawing scale size: '+w+'x'+h+'mm; scaleF: '+scaleF+'; snapD: '+snapD);
    setLayout();
    for(var i=0;i<10;i++) nodes.push({'x':0,'y':0,'n':i}); // 10 nodes for blueline
    for(var i=0;i<10;i++) console.log('node '+i+': '+nodes[i].n+' at '+nodes[i].x+','+nodes[i].y);
    id('countH').value=id('countV').value=1;
    cancel(); // set select mode
    // report('screen size: '+scr.w+'x'+scr.h+' aspect: '+aspect+' drawing size: '+dwg.w+'x'+dwg.h+' scale: '+scale+' scaleF: '+scaleF);
}
function load() {
    var request=db.transaction('graphs').objectStore('graphs').openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if(cursor) {
            var graph=cursor.value;
            console.log('load '+graph.type+' id: '+graph.id);
            var el=makeElement(graph);
            if(graph.stroke=='blue') id('ref').appendChild(el); // blue items go into <ref>
            else id('dwg').appendChild(el);
	    	cursor.continue();  
        }
	    else {
	        console.log('all graphs added');
	    }
    };
    console.log('all graphs loaded');
    id('combiList').innerHTML="<option onclick='prompt(\'select a combi\');' value=null>select a combi</option>"; // rebuild combiList
    var request=db.transaction('combis').objectStore('combis').openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if(cursor) {
            var combi=cursor.value;
            // GET COMBI NAME AND ADD TO combiList AS AN OPTION
            var name=combi.name;
            // var s=(combi.nts>0)?scale:1;
            // if(combi.nts>0) name='NTS'+name;
            console.log('add combi '+name);
            var html="<g id='"+name+"'>"+combi.svg+"</g>"; // TRY WITHOUT ax,ay
            // var html="<g id='"+name+"' ax='"+combi.ax+"' ay='"+combi.ay+"'>"+combi.svg+"</g>";
            id('combis').innerHTML+=html; // copy combi svg into <defs>...
            html="<option value="+name+">"+name+"</option>";
            id('combiList').innerHTML+=html; //...and combi name into combiList
            console.log('added');
	    	cursor.continue();  
        }
	    else {
		    console.log("No more combis");
	    }
    };
}
function makeElement(g) {
    console.log('make '+g.type+' element '+g.id);
    var ns=id('svg').namespaceURI;
    switch(g.type) {
        case 'line':
            var el=document.createElementNS(ns,'polyline');
            el.setAttribute('id',g.id);
            el.setAttribute('points',g.points);
            el.setAttribute('spin',g.spin);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineStyle(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            // el.setAttribute('fill','none');
            var points=el.points;
            for(var i=0;i<points.length;i++) { // IF HAS SPIN - USE refreshNodes()?
                nodes.push({'x':points[i].x,'y':points[i].y,'n':Number(g.id*10+i)});
                console.log('add node '+i+' at '+points[i].x+','+points[i].y);
            } // NB node.n is id*10+[0-9]
			if(g.spin!=0) setTransform(el); // apply spin MAY NOT WORK!!!
            break;
        case 'shape':
            var el=document.createElementNS(ns,'polygon');
            el.setAttribute('id',g.id);
            el.setAttribute('points',g.points);
            el.setAttribute('spin',g.spin);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineStyle(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            // el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            var points=el.points;
            for(var i=0;i<points.length;i++) { // IF HAS SPIN - USE refreshNodes()?
                nodes.push({'x':points[i].x,'y':points[i].y,'n':Number(g.id*10+i)});
                console.log('add node '+i+' at '+points[i].x+','+points[i].y);
            }
			if(g.spin!=0) setTransform(el); // apply spin MAY NOT WORK!!!
            break;
        case 'box':
            var el=document.createElementNS(ns,'rect');
            el.setAttribute('id',g.id);
            el.setAttribute('x',g.x);
            el.setAttribute('y',g.y);
            el.setAttribute('width',g.width);
            el.setAttribute('height',g.height);
            el.setAttribute('rx',g.radius);
            el.setAttribute('spin',g.spin);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineStyle(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            console.log('made box'); // ADD NODES
            nodes.push({'x':(Number(g.x)+Number(g.width/2)),'y':(Number(g.y)+Number(g.height/2)),'n':Number(g.id*10+4)}); // centre - node 0
            nodes.push({'x':g.x,'y':g.y,'n':(g.id*10)}); // top/left - node 1
            nodes.push({'x':(Number(g.x)+Number(g.width)),'y':g.y,'n':Number(g.id*10+1)}); // top/right - node 2
            nodes.push({'x':g.x,'y':(Number(g.y)+Number(g.height)),'n':Number(g.id*10+3)}); // bottom/left - node 3
            nodes.push({'x':(Number(g.x)+Number(g.width)),'y':(Number(g.y)+Number(g.height)),'n':Number(g.id*10+2)}); // bottom/right - node 4
            if(g.spin!=0) setTransform(el);
            break;
        case 'oval':
            var el=document.createElementNS(ns,'ellipse');
            el.setAttribute('id',g.id);
            el.setAttribute('cx',g.cx);
            el.setAttribute('cy',g.cy);
            el.setAttribute('rx',g.rx);
            el.setAttribute('ry',g.ry);
            el.setAttribute('spin',g.spin);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineStyle(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            console.log('made oval'); // ADD NODES
            // add nodes
            nodes.push({'x':g.cx,'y':g.cy,'n':(g.id*10)}); // centre: node 0
            nodes.push({'x':(g.cx-g.rx),'y':(g.cy-g.ry),'n':Number(g.id*10+1)}); // ...top/left: node 1
            nodes.push({'x':Number(g.cx)+Number(g.rx),'y':(g.cy-g.ry),'n':Number(g.id*10+2)}); // top/right: node 2
            nodes.push({'x':(g.cx-g.rx),'y':Number(g.cy)+Number(g.ry),'n':Number(g.id*10+3)}); // bottom/left: node 3
            nodes.push({'x':Number(g.cx)+Number(g.rx),'y':Number(g.cy)+Number(g.ry),'n':Number(g.id*10+4)}); // bottom/right: node 4
            // console.log('oval nodes added');
            if(g.spin!=0) setTransform(el);
            break;
        case 'arc':
            var el=document.createElementNS(ns,'path');
            el.setAttribute('id',g.id);
            var d='M'+g.cx+','+g.cy+' M'+g.x1+','+g.y1+' A'+g.r+','+g.r+' 0 '+g.major+','+g.sweep+' '+g.x2+','+g.y2;
            el.setAttribute('d',d);
            el.setAttribute('spin',g.spin);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineStyle(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            // create nodes for arc start, centre & end points USE refreshNodes()? AND ALLOW FOR SPIN
            nodes.push({'x':g.cx,'y':g.cy,'n':(g.id*10)}); // centre - node 0
            nodes.push({'x':g.x1,'y':g.y1,'n':Number(g.id*10+1)}); // start - node 1
            nodes.push({'x':g.x2,'y':g.y2,'n':Number(g.id*10+2)}); // end - node 2
            if(g.spin!=0) setTransform(el);
            break;
        case 'text':
            var el=document.createElementNS(ns,'text');
            el.setAttribute('id',g.id);
            el.setAttribute('x',g.x);
            el.setAttribute('y',g.y);
            el.setAttribute('spin',g.spin);
            el.setAttribute('flip',g.flip);
            el.setAttribute('font-size',g.textSize*scale);
            if(g.textStyle=='bold') el.setAttribute('font-weight','bold');
            else if(g.textStyle=='italic') el.setAttribute('font-style','italic');
            el.setAttribute('stroke','none');
            el.setAttribute('fill',g.fill);
            var t=document.createTextNode(g.text);
            el.appendChild(t);
            id('textDialog').style.display='none';
            if((g.spin!=0)||(g.flip!=0)) setTransform(el);
            break;
        case 'dim':
            dx=Math.round(g.x2-g.x1);
            dy=Math.round(g.y2-g.y1);
            var d=0; // dimension length
            var a=0; // dimension angle
            if(g.dir=='h') {
                    d=Math.abs(dx);
                    a=0;
                }
            else if(g.dir=='v') {
                    d=Math.abs(dy);
                    a=Math.PI/2;
                }
            else {
                d=Math.round(Math.sqrt(dx*dx+dy*dy));
                a=Math.atan(dy/dx); // oblique dimension - angle in radians
            }
            console.log('dimension length: '+d+'; angle: '+a+' rad; nodes: '+g.n1+' '+g.n2);
            var x1=Number(g.x1); // start point/anchor of dimension line
            var y1=Number(g.y1);
            var o=parseInt(g.offset);
            if(a==0) y1+=Number(o);
            else if(a==Math.PI/2) x1+=o;
            else {
                x1-=o*Math.sin(a);
                y1+=o*Math.cos(a);
            }
            a*=180/Math.PI; // angle in degrees
            console.log('create dimension line from '+x1+','+y1+' length: '+d);
            var el=document.createElementNS(ns,'g');
            el.setAttribute('id',g.id);
            el.setAttribute('transform','rotate('+a+','+x1+','+y1+')');
            var dim=document.createElementNS(ns,'line');
            dim.setAttribute('x1',x1);
            dim.setAttribute('y1',y1);
            dim.setAttribute('x2',Number(x1)+Number(d));
            dim.setAttribute('y2',y1);
            dim.setAttribute('marker-start','url(#startArrow)');
            dim.setAttribute('marker-end','url(#endArrow)');
            dim.setAttribute('stroke','gray');
            dim.setAttribute('stroke-width',(0.25*scale));
            dim.setAttribute('fill','none');
            el.appendChild(dim);
            dim=document.createElementNS(ns,'text');
            dim.setAttribute('x',Number(x1)+d/2);
            dim.setAttribute('y',(y1-scale));
            dim.setAttribute('text-anchor','middle');
            dim.setAttribute('font-size',(4*scale));
            dim.setAttribute('stroke','none');
            dim.setAttribute('fill','gray');
            t=document.createTextNode(Math.abs(d));
            dim.appendChild(t);
            el.appendChild(dim);
            dim={}; // no nodes for dimensions but add to dims array
            dim.dim=g.id;
            // dim.el1=g.el1;
            dim.n1=g.n1;
            // dim.el2=g.el2;
            dim.n2=g.n2;
            console.log('add link - dim. '+dim.dim+' nodes: '+dim.n1+','+dim.n2);
            dims.push(dim);
            console.log('links added for dimension '+g.id);
            for(var i=0;i<dims.length;i++) console.log('link '+i+': dim:'+dims[i].dim+' nodes: '+dims[i].n1+','+dims[i].n2);
            break;
        case 'combi':
            var el=document.createElementNS(ns,'use');
            el.setAttribute('id',g.id);
            el.setAttribute('href','#'+g.name);
            el.setAttribute('x',g.x);
            el.setAttribute('y',g.y);
            el.setAttribute('spin',g.spin);
            el.setAttribute('flip',g.flip);
            nodes.push({'x':g.x,'y':g.y,'n':(g.id*10)});
            if((g.spin!=0)||(g.flip!=0)) setTransform(el);
            break;
    }
    return el;
}
function move(el,dx,dy) {
    switch(type(el)) {
        case 'line':
        case 'shape':
            console.log('move all points by '+dx+','+dy);
            var pts='';
            for(var i=0;i<el.points.length;i++) {
                el.points[i].x+=dx;
                el.points[i].y+=dy;
                pts+=el.points[i].x+','+el.points[i].y+' ';
            }
            el.setAttribute('points',pts);
            console.log(element.points.length+' points adjusted');
            updateGraph(el.id,['points',el.getAttribute('points')]);
            break;
        case 'box':
        case 'text':
        case 'combi':
            console.log('move by '+dx+','+dy);
            var valX=parseInt(el.getAttribute('x'));
            valX+=dx;
            el.setAttribute('x',valX);
            valY=parseInt(el.getAttribute('y'));
            valY+=dy;
            el.setAttribute('y',valY);
            updateGraph(el.id,['x',valX,'y',valY]);
            break;
        case 'oval':
            console.log('move oval by '+dx+','+dy);
            var valX=parseInt(el.getAttribute('cx'));
            valX+=dx;
            el.setAttribute('cx',valX);
            valY=parseInt(el.getAttribute('cy'));
            valY+=dy;
            el.setAttribute('cy',valY);
            updateGraph(el.id,['cx',valX,'cy',valY]);
            break;
        case 'arc':
            // move centre, start and end points by moveX, moveY
            var d=el.getAttribute('d');
            getArc(d);
            arc.cx+=dx;
            arc.cy+=dy;
            arc.x1+=dx;
            arc.y1+=dy;
            arc.x2+=dx;
            arc.y2+=dy;
            d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
            updateGraph(el.id,['d',d,'cx',arc.cx,'cy',arc.cy,'x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2]);
            el.setAttribute('d',d);
            break;
    }
    setTransform(el); // adjust spin to new position
    refreshNodes(el);
    // MOVE ANY LINKED DIMENSIONS TOO
}
function prompt(text) {
    console.log('PROMPT '+text);
    // re('wind'); // WAS id('undoButton').style.display='none';
    id('prompt').innerHTML=text; //display text for 3 secs
    id('prompt').style.display='block';
    setTimeout(function(){id('prompt').style.display='none'},5000);
}
function re(op) { // op is 're-member' (memorise and show undo), 're-call' (reinstate and hide undo) or 're-wind' (hide undo)
    console.log('re'+op+'; '+selection.length+' selected items; '+memory.length+' memory items');
    console.log('item 1: '+selection[0]);
    if(op=='member') {
        memory=[];
        console.log('REMEMBER');
        for(var i=0;i<selection.length;i++) {
            elID=selection[i];
            console.log('selected item '+i+': '+elID);
            var el=id(elID);
            var props={};
            props.id=elID; // all elements have an id
            console.log('element '+elID+' - '+type(el));
            switch(type(el)) {
                case 'line':
                case 'shape':
                    var pts='';
                    for(var j=0;j<el.points.length;j++) pts+=el.points[j].x+','+el.points[j].y+' ';
                    props.points=pts;
                    break;
                case 'box':
                    console.log('remember box '+elID);
                    props.x=el.getAttribute('x');
                    props.y=el.getAttribute('y');
                    props.width=el.getAttribute('width');
                    props.height=el.getAttribute('height');
                    props.rx=el.getAttribute('rx');
                    break;
                case 'oval':
                    props.cx=el.getAttribute('cx');
                    props.cy=el.getAttribute('cy');
                    props.rx=el.getAttribute('rx');
                    props.ry=el.getAttribute('ry');
                    break;
                case 'arc':
                    props.d=el.getAttribute('d');
                case 'text':
                case 'combi':
                    props.x=el.getAttribute('x');
                    props.y=el.getAttribute('y');
                    props.flip=el.getAttribute('flip');
            }
            props.spin=el.getAttribute('spin'); // any element can have spin
            if(props.spin!=0) props.transform=el.getAttribute('transform');
            memory.push(props);
            console.log('selection['+i+']: '+props.id);
        }
        id('line').style.display='none';
        id('undoButton').style.display='block';
        return;
    }
    else if(op=='call') for(var i=0;i<memory.length;i++) { // reinstate from memory
        var item=memory[i];
        console.log('reinstate item '+item.id);
        prompt('UNDO');
        elID=item.id;
        var el=id(elID);
        console.log('reinstate '+elID);
        switch(type(el)) {
            case 'line':
            case 'shape':
                console.log(item.points.length+' points - from '+item.points[0].x+','+item.points[0].y);
                /*
                for(var j=0;j<item.points.length;j++) {
                    el.points[j].x=item.points[j].x;
                    el.points[j].y=item.points[j].y;
                }
                */
                el.setAttribute('points',item.points);
                // el.setAttribute('points',el.getAttribute('points'));
                updateGraph(elID,['points',el.getAttribute('points'),'spin',item.spin]);
                refreshNodes(el);
                break;
            case 'box':
                console.log('reinstate box element');
                el.setAttribute('x',item.x);
                el.setAttribute('y',item.y);
                el.setAttribute('width',item.width);
                el.setAttribute('height',item.height);
                el.setAttribute('rx',item.rx);
                el.setAttribute('spin',item.spin);
                updateGraph(elID,['x',item.x,'y',item.y,'spin',item.spin,'flip',item.flip]);
                refreshNodes(el);
                break;
            case 'text':
            case 'combi':
                el.setAttribute('x',item.x);
                el.setAttribute('y',item.y);
                el.setAttribute('flip',item.flip);
                updateGraph(elID,['x',item.x,'y',item.y,'spin',item.spin,'flip',item.flip]);
                refreshNodes(el);
                break;
            case 'oval':
                el.setAttribute('cx',item.cx);
                el.setAttribute('cy',item.cy);
                el.setAttribute('rx',item.rx);
                el.setAttribute('ry',item.ry);
                updateGraph (elID,['cx',item.cx,'cy',item.cy,'rx',item.rx,'ry',item.ry,'spin',item.spin]);
                refreshNodes(el);
                break;
            case 'arc':
                el.setAttribute('d',item.d);
                getArc(item.d);
                updateGraph(elID,['cx',arc.cx,'cy',arc.cy,'r',arc.r,'x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2,'spin',item.spin]);
                refreshNodes(el);
        }
        el.setAttribute('spin',item.spin);
        if(item.transform) el.setAttribute('transform',item.transform)
        else el.setAttribute('transform','rotate(0)');
    }
    id('undoButton').style.display='none';
    id('line').style.display='block';
}
function redrawDim(d) {
    var request=db.transaction('graphs','readwrite').objectStore('graphs').put(d);
    request.onsuccess=function(event) {
        console.log('dimension '+dim.id+' updated - redraw from '+d.x1+','+d.y1+' to '+d.x2+','+d.y2+' direction: '+d.dir);
        var len=0; // dimension length...
        var a=0; // ...and angle
        if(d.dir=='h') { // horizontal dimension
            len=d.x2-d.x1;
            a=0;
        }
        else if(d.dir=='v') { // vertical dimension
            len=d.y2-d.y1;
            a=Math.PI/2;
        }
        else { // oblique dimension
            w=Math.round(d.x2-d.x1);
            h=Math.round(d.y2-d.y1);
            len=Math.sqrt(w*w+h*h);
            a=Math.atan(h/w); // angle in radians
        }
        len=Math.round(len);
        console.log('dimension length: '+len+'; angle: '+a+'radians; elements: '+d.el1+' '+d.el2);
        var o=parseInt(d.offset);
        var x1=d.x1; // start point/anchor of dimension line
        var y1=d.y1;
        if(a==0) y1+=o;
        else if(a==Math.PI/2) x1+=o;
        else {
            x1-=o*Math.sin(a);
            y1+=o*Math.cos(a);
        }
        a*=180/Math.PI; // angle in degrees
        var t='rotate('+a+','+x1+','+y1+')';
        id(d.id).setAttribute('transform',t); // adjust dimension rotation
        var line=id(d.id).firstChild;
        line.setAttribute('x1',x1); // adjust dimension end points
        line.setAttribute('y1',y1);
        line.setAttribute('x2',x1+len);
        line.setAttribute('y2',y1);
        t=id(d.id).children[1]; // adjust text location
        t.setAttribute('x',Number(x1+len/2));
        t.setAttribute('y',Number(y1-1));
        t.innerHTML=len; // adjust dimension measurement
        console.log('dimension '+d.id+' redrawn');
    }
    request.onerror=function(event) {
        console.log('dimension update failed');
    }
}
function refreshDim(d) {
    console.log('refresh dimension '+d.dim+' from node '+d.n1+' to node '+d.n2);
    var node1=nodes.find(function(node) {
        return (node.n==Number(d.n1));
        // return ((node.el==d.el1)&&(node.n==d.n1));
    });
    console.log('start node: '+node1);
    var node2=nodes.find(function(node) {
        return (node.n==Number(d.n2));
        // return ((node.el==d.el2)&&(node.n==d.n2));
    });
    console.log('end node: '+node2);
    var request=db.transaction('graphs').objectStore('graphs').get(Number(d.dim));
    request.onsuccess=function(event) {
        dim=request.result;
        console.log('got dimension '+dim.id);
        dim.x1=node1.x;
        dim.y1=node1.y;
        dim.x2=node2.x;
        dim.y2=node2.y;
        redrawDim(dim);
    }
    request.onerror=function(event) {
        console.log('get dimension failed');
    }
}
function refreshNodes(el) {
    // recalculate node.x, node.y after change to element
    console.log('check nodes for el '+el.id);
    if(el==blueline) {
        var points=el.points;
        console.log(points.length+' points in blueline');
        for(var i=0;i<points.length;i++) { // blueline nodes are first 10 in nodes[]
            nodes[i].x=Number(points[i].x);
            nodes[i].y=Number(points[i].y);
            console.log('node '+i+': '+nodes[i].x+','+nodes[i].y);
        }
        return;
    }
    var elNodes=nodes.filter(function(node) {
        return (Math.floor(node.n/10)==Number(el.id));
    });
    console.log('refresh '+elNodes.length+' nodes for element '+el.id);
    var ox=0; // element origin for spin
    var oy=0;
    var r=0; // radius for spin
    var a=0; // angle
    var spin=parseInt(el.getAttribute('spin'));
    switch(type(el)) {
        case 'line':
        case 'shape':
            var points=el.points;
            console.log(points.length+' points');
            ox=Number(points[0].x); // spin around start point
            oy=Number(points[0].y);
            console.log('origin: '+ox+','+oy+' spin: '+spin);
            elNodes[0].x=ox;
            elNodes[0].y=oy;
            if(points.length>elNodes.length) { // adding point
                elNodes.push({'x':0,'y':0}); // initialise new node at 0,0 - will soon be reset
            }
            for(var i=1;i<points.length;i++) {
                if(spin==0) { // no spin
                    elNodes[i].x=Number(points[i].x);
                    elNodes[i].y=Number(points[i].y);
                }
                else { // spin nodes around start point
                    dx=Number(points[i].x)-ox;
                    dy=Number(points[i].y)-oy;
                    console.log('dx:'+dx+' dy:'+dy);
                    a=Math.atan(dy/dx);
                    r=Math.sqrt(dx*dx+dy*dy);
                    a+=(spin*Math.PI/180);
                    console.log('a:'+a+' r:'+r);
                    dx=r*Math.cos(a);
                    dy=r*Math.sin(a);
                    elNodes[i].x=ox+dx;
                    elNodes[i].y=oy+dy;
                }
                console.log('node '+i+': '+elNodes[i].x+','+elNodes[i].y);
            }
            break;
        case 'box':
            x=Number(el.getAttribute('x')); // left
            y=Number(el.getAttribute('y')); // top
            w=Number(el.getAttribute('width'));
            h=Number(el.getAttribute('height'));
            var a=Number(el.getAttribute('spin'));
            a*=Math.PI/180;
            var c=Math.cos(a);
            var s=Math.sin(a);
            console.log(' spin: '+a+' radians cos: '+c+' sine: '+s);
            // spin around centre
            x+=w/2; // centre
            y+=h/2;
            elNodes[0].x=x; // centre
            elNodes[0].y=y;
            elNodes[1].x=x-w*c/2+h*s/2; // top/left
            elNodes[1].y=y-w*s/2-h*c/2;
            elNodes[2].x=x+w*c/2+h*s/2; // top/right
            elNodes[2].y=y+w*s/2-h*c/2;
            elNodes[3].x=x-w*c/2-h*s/2; // bottom/left
            elNodes[3].y=y-w*s/2+h*c/2;
            elNodes[4].x=x+w*c/2-h*s/2; // bottom/right
            elNodes[4].y=y+w*s/2+h*c/2;
            break;
        case 'oval':
            x=Number(el.getAttribute('cx'));
            y=Number(el.getAttribute('cy'));
            var rx=Number(el.getAttribute('rx'));
            var ry=Number(el.getAttribute('ry'));
            var a=Number(el.getAttribute('spin'));
            a*=Math.PI/180;
            var c=Math.cos(a);
            var s=Math.sin(a);
            elNodes[0].x=x; // centre
            elNodes[0].y=y;
            elNodes[1].x=x-rx*c+ry*s; // top/left
            elNodes[1].y=y-rx*s-ry*c;
            elNodes[2].x=x+rx*c+ry*s; // top/right
            elNodes[2].y=y+rx*s-ry*c;
            elNodes[3].x=x-rx*c-ry*s; // bottom/left
            elNodes[3].y=y-rx*s+ry*c;
            elNodes[4].x=x+rx*c-ry*s; // bottom/right
            elNodes[4].y=y+rx*s+ry*c;
            break;
        case 'arc':
            var d=el.getAttribute('d');
            console.log('arc path: '+d);
            elNodes[0].x=arc.cx; // centre
            elNodes[0].y=arc.cy;
            elNodes[1].x=arc.x1; // start point
            elNodes[1].y=arc.y1;
            elNodes[2].x=arc.x2; // end point
            elNodes[2].y=arc.y2;
            console.log('arc centre node: '+elNodes[0].x+','+elNodes[0].y);
            break;
        case 'combi':
            elNodes[0].x=Number(el.getAttribute('ax'));
            elNodes[0].y=Number(el.getAttribute('ay'));
            break;
    }
    checkDims(el); // check if any dimensions need refreshing
}
function remove(elID,keepNodes) {
    console.log('remove element '+elID);
    var linkedDims=[]; // first check for any linked dimensions
    for(var i=0;i<dims.length;i++) {
        if((Math.floor(dims[i].n1/10)==Number(elID))||(Math.floor(dims[i].n2/10)==Number(elID))) {
            linkedDims.push(dims[i].dim);
            dims.splice(i,1); // remove dimension link
        }
    }
    var el=id(elID);
    var request=db.transaction('graphs','readwrite').objectStore('graphs').delete(Number(elID));
    request.onsuccess=function(event) {
        el.remove();
        console.log('element removed');
    }
 	request.onerror=function(event) {
	    console.log("error deleting element "+el.id);
	};
	while(linkedDims.length>0) remove(linkedDims.pop()); // remove any linked dimensions
}
function reset() {
    zoom=1;
    dwg.x=0;
    dwg.y=0;
    console.log('new viewBox: '+dwg.x+','+dwg.y+' '+dwg.w+'x'+dwg.h);
    id('svg').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+(dwg.w*scale)+' '+(dwg.h*scale));
    id('ref').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+(dwg.w*scale)+' '+(dwg.h*scale));
    id('zoom').innerHTML=zoom;
}
function saveSVG() {
    id('datumSet').style.display='none';
    var fileName=id('printName').value+'.svg';
    var svg=id('drawing').innerHTML;
    download(svg,fileName,'data:image/svg+xml');
	id('datumSet').style.display='block';
}
function select(el,multiple) {
	// NEW CODE...
	if(multiple) { // one of multiple selection - highlight in blue
		console.log('select element '+el.id+' of multiple selection');
		var box=getBounds(el);
		var html="<rect x='"+box.x+"' y='"+box.y+"' width='"+box.width+"' height='"+box.height+"' ";
		html+="stroke='none' fill='blue' fill-opacity='0.25' el='"+el.id+"'/>";
		console.log('box html: '+html);
		id('selection').innerHTML+=html; // blue block for this element
	}
	else {
		// setStyle(el); // set style to suit selected element
    	// add node markers, boxes and handles to single selected item
    	id('handles').innerHTML=''; // clear any handles then add handles for selected element 
    	// first draw node markers?
    	for(var i=0;i<nodes.length;i++) { // draw tiny circle at each node
        if(Math.floor(nodes[i].n/10)!=elID) continue;
        var html="<circle cx='"+nodes[i].x+"' cy='"+nodes[i].y+"' r='"+scale+"'/>";
        console.log('node at '+nodes[i].x+','+nodes[i].y);
        id('handles').innerHTML+=html;
    }
    	switch(type(el)) {
        	case 'line':
        	case 'shape':
            	var bounds=el.getBBox();
            	w=bounds.width;
            	h=bounds.height;
            	var points=el.points;
            	var n=points.length;
            	console.log('bounds: '+w+'x'+h+'mm; '+n+' points');
            	setSizes('box',el.getAttribute('spin'),w,h); // size of bounding box
            	// draw handles
            	var html="<use id='mover0' href='#mover' x='"+points[0].x+"' y='"+points[0].y+"'/>";
            	id('handles').innerHTML+=html; // circle handle moves whole element
            	for(var i=1;i<n;i++) {
                html="<use id='sizer"+i+"' href='#sizer' x='"+points[i].x+"' y='"+points[i].y+"'/>";
                id('handles').innerHTML+=html; // disc handles move remaining nodes
            }
            	id('bluePolyline').setAttribute('points',el.getAttribute('points'));
            	id('guides').style.display='block';
            	showSizes(true,'LINE');
            	if(mode=='shape') prompt('SHAPE');
            	node=0; // default anchor node
            	mode='pointEdit';
            	break;
        	case 'box':
            	x=parseFloat(el.getAttribute('x'));
            	y=parseFloat(el.getAttribute('y'));
            	w=parseFloat(el.getAttribute('width'));
            	h=parseFloat(el.getAttribute('height'));
            	// draw blueBox for sizing
            	id('blueBox').setAttribute('x',x); // SET blueBox TO MATCH BOX (WITHOUT SPIN)
            	id('blueBox').setAttribute('y',y);
            	id('blueBox').setAttribute('width',w);
            	id('blueBox').setAttribute('height',h);
            	id('guides').style.display='block';
            	// draw handles
            	var html="<use id='mover0' href='#mover' x='"+(x+w/2)+"' y='"+(y+h/2)+"'/>"; // center
            	html+="<use id='sizer1' href='#sizer' x='"+x+"' y='"+y+"'/>"; // top/left
            	html+="<use id='sizer2' href='#sizer' x='"+(x+w)+"' y='"+y+"'/>"; // top/right
            	html+="<use id='sizer3' href='#sizer' x='"+x+"' y='"+(y+h)+"'/>"; // bottom/left
            	html+="<use id='sizer4' href='#sizer' x='"+(x+w)+"' y='"+(y+h)+"'/>"; // bottom/right
            	id('handles').innerHTML+=html;
            	setSizes('box',el.getAttribute('spin'),w,h);
            	showSizes(true,(w==h)?'SQUARE':'BOX');
            	node=0; // default anchor node
            	mode='edit';
            	break;
        	case 'oval':
            	x=parseFloat(el.getAttribute('cx'));
            	y=parseFloat(el.getAttribute('cy'));
            	w=parseFloat(el.getAttribute('rx'))*2;
            	h=parseFloat(el.getAttribute('ry'))*2;
            	// draw blueBox for sizing
            	id('blueBox').setAttribute('x',(x-w/2)); // SET blueBox TO MATCH OVAL (WITHOUT SPIN)
            	id('blueBox').setAttribute('y',(y-h/2));
            	id('blueBox').setAttribute('width',w);
            	id('blueBox').setAttribute('height',h);
            	id('guides').style.display='block';
            	// draw handles
            	var html="<use id='mover0' href='#mover' x='"+x+"' y='"+y+"'/>"; // center
            	html+="<use id='sizer1' href='#sizer' x='"+(x-w/2)+"' y='"+(y-h/2)+"'/>"; // top/left
            	html+="<use id='sizer2' href='#sizer' x='"+(x+w/2)+"' y='"+(y-h/2)+"'/>"; // top/right
            	html+="<use id='sizer3' href='#sizer' x='"+(x-w/2)+"' y='"+(y+h/2)+"'/>"; // bottom/left
            	html+="<use id='sizer4' href='#sizer' x='"+(x+w/2)+"' y='"+(y+h/2)+"'/>"; // bottom/right
            	id('handles').innerHTML+=html;
            	setSizes('box',el.getAttribute('spin'),w,h);
            	showSizes(true,(w==h)?'CIRCLE':'OVAL');
            	node=0; // default anchor node
            	mode='edit';
            	break;
        	case 'arc':
            	var d=el.getAttribute('d');
            	console.log('select arc - d: '+d);
            	getArc(d); // derive arc geometry from d
            	// draw handles
            	var html="<use id='mover0' href='#mover' x='"+arc.cx+"' y='"+arc.cy+"'/>"; // mover at centre
            	html+="<use id='sizer1' href='#sizer' x='"+arc.x1+"' y='"+arc.y1+"'/>"; // sizers at start...
            	html+="<use id='sizer2' href='#sizer' x='"+arc.x2+"' y='"+arc.y2+"'/>"; // ...and end or arc
            	id('handles').innerHTML+=html;
            	var a1=Math.atan((arc.y1-arc.cy)/(arc.x1-arc.cx));
            	if(arc.x1<arc.cx) a1+=Math.PI;
            	var a=Math.atan((arc.y2-arc.cy)/(arc.x2-arc.cx));
            	console.log('end angle: '+a);
            	if(arc.x2<arc.cx) a+=Math.PI;
            	x0=arc.cx; // centre
            	y0=arc.cy;
            	x=x0+arc.r*Math.cos(a); // end point
	            	y=y0+arc.r*Math.sin(a);
    	        a=Math.abs(a-a1); // swept angle - radians
        	    a*=180/Math.PI; // degrees
            	a=Math.round(a);
	            if(arc.major>0) a=360-a;
    	        setSizes('arc',el.getAttribute('spin'),arc.r,a);
        	    showSizes(true,'ARC');
            	mode='edit';
	            break;
    	    case 'text':
        	    var bounds=el.getBBox();
            	w=Math.round(bounds.width);
	            h=Math.round(bounds.height);
    	        // draw handle
        	    var html="<use id='mover0' href='#mover' x='"+bounds.x+"' y='"+(bounds.y+h)+"'/>";
            	// var html="<circle id='handle' cx="+bounds.x+" cy="+(bounds.y+bounds.height)+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>";
	            id('handles').innerHTML+=html; // circle handle moves text
    	        // show text edit dialog
        	    id('textDialog').style.left='48px';
            	id('textDialog').style.top='4px';
	            id('text').value=element.innerHTML;
    	        id('textDialog').style.display='block';
        	    mode='edit';
            	break;
	        case 'dim':
    	        var line=el.firstChild;
        	    var x1=parseInt(line.getAttribute('x1'));
            	var y1=parseInt(line.getAttribute('y1'));
	            var x2=parseInt(line.getAttribute('x2'));
    	        var y2=parseInt(line.getAttribute('y2'));
        	    var spin=el.getAttribute('transform');
            	console.log('dim from '+x1+','+y1+' to '+x2+','+y2);
	            // draw handle
    	        var html="<use id='mover0' href='#mover' x='"+((x1+x2)/2)+"' y='"+((y1+y2)/2)+"' "; 
        	    html+="transform='"+spin+"'/>";
            	id('handles').innerHTML+=html;
	            prompt('DIMENSION');
    	        mode='edit';
        	    break;
	        case 'combi':
    	        var bounds=getBounds(el);
        	    x=Number(el.getAttribute('x'));
            	y=Number(el.getAttribute('y'));
	            w=Number(bounds.width);
    	        h=Number(bounds.height);
        	    // s=Number(el.getAttribute('scale'));
            	// draw handle
	            var html="<use id='mover0' href='#mover' x='"+x+"' y='"+y+"'/>";
	            // var html="<circle id='handle' cx='"+x+"' cy='"+y+"' r='"+handleR+"' stroke='none' fill='#0000FF88'/>";
    	        id('handles').innerHTML=html;
        	    setSizes('box',el.getAttribute('spin'),w,h);
            	showSizes(true,'COMBI');
	            mode='edit';
    	        break;
    	};
	}
}
function setButtons() {
    var n=selection.length;
    console.log('set buttons for '+n+' selected elements');
    var active=[3,9]; // active buttons - remove & move always active
    // childNodes of editTools are... 0:add 1:remove 2:forward 3:back 4:move 5:spin 6:flip 7:align 8:double 9:repeat 10:fillet 11: anchor 12:combine
    if(n>1) { // multiple selection
        if(anchor) { // spin and flip and combine active if anchor available for multiple selection
            active.push(11);
            active.push(13);
            active.push(25);
        }
        active.push(15); // align and anchor active for multiple selection
        active.push(23);
    }
    else { // single element selected
        var t=type(id(selection[0]));
        // console.log('selected element is '+t);
        if((t=='line')||(t=='shape')) active.push(1); // can add points to selected line/shape
        else if(t=='box') active.push(21); // fillet tool active for a selected box
        if(selectedPoints.length<1) { // unless editing line/shape active tools include...
            active.push(5); // push/pull back/forwards
            active.push(7);
            active.push(11); // spin and flip
            active.push(13);
            active.push(17); // double, repeat and anchor
            active.push(19);
            active.push(23);
        } 
    }
    id('sizes').style.display=(n>1)?'none':'block';
    var set='';
    for(i=0;i<active.length;i++) set+=active[i]+' ';
    // console.log(active.length+' edit tools active: '+set);
    var n=id('editTools').childNodes.length;
    for(var i=0;i<n;i++) {
        var btn=id('editTools').childNodes[i];
        // console.log(i+' '+btn.id+': '+(active.indexOf(i)>=0));
        id('editTools').childNodes[i].disabled=(active.indexOf(i)<0);
    }
}
function setLayout() {
    console.log('set layout to '+hand+' sizes width: '+id('sizes').clientWidth);
    if(hand=='left') { // LH tools and dialogs
        id('swop').setAttribute('href','brunelStyleLeft.css');
        id('prompt').style.top='48px';
        id('goofy').checked=false;
    }
    else { // RH tools and dialogs
        id('swop').setAttribute('href','brunelStyleRight.css');
        id('prompt').style.top='8px';
        id('goofy').checked=true;
    }
}
function setLineStyle(g) {
    if(g.lineStyle=='dashed') return (4*g.lineW)+" "+(4*g.lineW);
    else if(g.lineStyle=='dotted') return g.lineW+" "+g.lineW;
    // else return null;
}
function setSizes(mode,spin,p1,p2,p3,p4) {
    // console.log('setSizes - '+mode+','+p1+','+p2+','+p3+','+p4);
    if(mode=='box') {
        id('first').value=Math.round(p1);
        id('between').innerHTML='x';
        id('second').value=Math.round(p2);
        id('after').innerHTML='mm';
    }
    else if(mode=='polar') { // drawing line or arc
        var h=p3-p1;
        var v=p4-p2;
        var d=Math.round(Math.sqrt(h*h+v*v));
        var a=Math.atan(v/h); // radians
        a=Math.round(a*180/Math.PI); // degrees
        a+=90; // from North
        if(p3<p1) a+=180;
        id('first').value=d;
        id('between').innerHTML='mm';
        id('second').value=a;
        id('after').innerHTML='&deg;';
    }
    else { // arc
        id('first').value=Math.round(p1); // radius
        id('between').innerHTML='mm';
        id('second').value=Math.round(p2); // angle of arc
        id('after').innerHTML='&deg;';
    }
    id('spin').value=spin;
}
function setStyle() {
	console.log('setStyle: '+selection.length+' items selected');
	var el=(selection.length>0)?id(selection[0]):null;
    if(!el ||(type(el)=='combi')||(type(el)=='dim')) { // no element/combi/dimension - show default styles
        id('lineType').value=lineType;
        id('line').style.borderBottomStyle=lineType;
        id('line').style.borderWidth=pen+'mm';
        id('lineShade').style.backgroundColor=lineShade;
        id('line').style.borderColor=lineShade;
        id('fill').style.backgroundColor=fillShade;
        id('fill').style.opacity=opacity;
        id('opacity').value=opacity;
    }
    else { // show styles for element el
    	console.log('set style for element '+el.id);
        val=getLineStyle(el);
        id('lineType').value=val;
        id('line').style.borderBottomStyle=val;
        val=el.getAttribute('stroke-width');
        if(val) {
            id('line').style.borderWidth=(val/scaleF)+'px';
            val=Math.floor(val/4);
            if(val>3) val=3;
            console.log('select option '+val);
            id('penSelect').options[val].selected=true;;
        }
        val=el.getAttribute('stroke');
        if(val) {
            id('lineShade').style.backgroundColor=val;
            id('line').style.borderColor=val;
        }
        val=el.getAttribute('fill');
        console.log('fill: '+val);
        if(val=='none') {
            id('fill').style.background='#00000000';
            id('fillShade').style.backgroundColor='white';
            id('opacity').value=0;
        }
        else {
            if(type(el)=='text') {
                id('lineShade').style.backgroundColor=val;
            }
            else {
                id('fillShade').style.backgroundColor=val;
                id('fill').style.background=val;
            }
        }
        val=el.getAttribute('fill-opacity');
        if(val) {
            id('opacity').value=val;
            id('fill').style.opacity=val;
        }
        if(type(el)=='text') {
            val=el.getAttribute('font-size')/scale;
            console.log('text size: '+val);
            id('textSize').value=val;
            id('textStyle').value='fine';
            val=el.getAttribute('font-style');
            if(val=='italic') id('textStyle').value='italic';
            val=el.getAttribute('font-weight');
            if(val=='bold') id('textStyle').value='bold';
        } 
    }
}
function setTransform(el) {
    console.log('set transform for element '+el.id);
    var spin=parseInt(el.getAttribute('spin'));
    var flip=el.getAttribute('flip');
    // var s=1; // scale factor (only affects NTS combis)
    console.log('set spin to '+spin+' degrees and flip to '+flip+' for '+type(el));
    switch(type(el)) {
        case 'line':
        case 'shape':
            x=parseInt(el.points[0].x);
            y=parseInt(el.points[0].y);
            break;
        case 'box':
            x=parseInt(el.getAttribute('x'))+parseInt(el.getAttribute('width'))/2;
            y=parseInt(el.getAttribute('y'))+parseInt(el.getAttribute('height'))/2;
            break;
        case 'text':
        case 'combi':
            x=parseInt(el.getAttribute('x'));
            y=parseInt(el.getAttribute('y'));
            break;
        case 'oval':
        case 'arc':
            x=parseInt(el.getAttribute('cx'));
            y=parseInt(el.getAttribute('cy'));
    }
    var t='';
    if(flip) {
        var hor=flip&1;
        var ver=flip&2;
        t='translate('+(hor*x*2)+','+(ver*y)+') ';
        t+='scale('+((hor>0)? -1:1)+','+((ver>0)? -1:1)+')';
    }
    if(spin!=0) t+='rotate('+spin+','+x+','+y+')';
    el.setAttribute('transform',t);
    refreshNodes(el);
}
function showDialog(dialog,visible) {
    console.log('show dialog '+dialog);
    if(visible) id('prompt').style.display='none';
    if(currentDialog) id(currentDialog).style.display='none'; // hide any currentDialog
    id('shadeMenu').style.display='none';
    id(dialog).style.display=(visible)?'block':'none'; // show/hide dialog
    currentDialog=(visible)?dialog:null; // update currentDialog
    // console.log('current dialog: '+currentDialog);
}
function showShadeMenu(visible,x,y) {
    var m=id('shadeMenu').mode;
    console.log('show shadeMenu - mode is '+m);
    id('blueWhite').setAttribute('fill',(m=='line')?'blue':'white');
    if(x) {
        id('shadeMenu').style.left=x+'px';
        id('shadeMenu').style.top=y+'px';
    }
    id('shadeMenu').style.display=(visible)?'block':'none';
}
function showEditTools(visible) {
    if(visible) {
        id('tools').style.display='none';
        id('editTools').style.display='block';
    }
    else {
        id('editTools').style.display='none';
        id('tools').style.display='block';
    }
}
function showSizes(visible,promptText) {
    id('sizes').style.display=(visible)?'block':'none';
    if(visible && promptText) prompt(promptText);
}
function snapCheck() {
    var near=nodes.filter(function(node) {
        return (Math.abs(node.x-x)<snapD)&&(Math.abs(node.y-y)<snapD);
    });
    if(near.length) { // snap to nearest node...
        var min=snapD*2;
        for(var i=0;i<near.length;i++) {
            var d=Math.abs(near[i].x-x)+Math.abs(near[i].y-y);
            if(d<min) {
                min=d;
                snap={'x':near[i].x,'y':near[i].y,'n':near[i].n};
            }
        }
        console.log('SNAP x: '+snap.x+' y: '+snap.y+' n: '+snap.n);
        if(snap.n!=datum2.n) {
            datum1.x=datum2.x;
            datum1.y=datum2.y;
            datum1.n=datum2.n;
            id('datum1').setAttribute('x',datum1.x);
            id('datum1').setAttribute('y',datum1.y);
            console.log('DATUM1: '+datum1.n+' at '+datum1.x+','+datum1.y);
            datum2.x=snap.x;
            datum2.y=snap.y;
            datum2.n=snap.n;
            id('datum2').setAttribute('x',datum2.x);
            id('datum2').setAttribute('y',datum2.y);
            console.log('DATUM2: '+datum2.n+' at '+datum2.x+','+datum2.y);
        }
        x=snap.x;
        y=snap.y;
        return snap;
    }
    else { // if no nearby nodes...
        if(Math.abs(x-datum.x1)<snapD) x=datum.x1;
        else if(Math.abs(x-datum.x2)<snapD) x=datum.x2;
        else if(gridSnap>0) x=Math.round(x/gridSize)*gridSize;
        if(Math.abs(y-datum.y1)<snapD) y=datum.y1;
        else if(Math.abs(y-datum.y2)<snapD) y=datum.y2;
        else if(gridSnap>0) y=Math.round(y/gridSize)*gridSize;
        return false;
    }
}
function swopGraphs(g1,g2) {
    console.log('swop graphs '+g1+' and '+g2);
    g1=Number(g1);
    g2=Number(g2);
    var graph1={};
    var graph2={};
    var transaction=db.transaction('graphs','readwrite');
    var graphs=transaction.objectStore('graphs');
    var request=graphs.get(g1);
    request.onsuccess=function(event) {
        graph1=request.result;
        console.log('got graph: '+graph1.id);
        request=graphs.get(g2);
        request.onsuccess=function(event) {
            graph2=request.result;
            console.log('got graph: '+graph2.id);
            var tempID=graph1.id;
            graph1.id=graph2.id;
            graph2.id=tempID;
            console.log('IDs swopped');
            request=graphs.put(graph1);
            request.onsuccess=function(event) {
                console.log('g1 saved');
                request=graphs.put(graph2);
                request.onsuccess=function(event) {
                    console.log('g2 saved');
                }
            }
        }
        request.onerror=function(event) {
            console.log('error getting graph2 to swop');
        }
    }
    request.onerror=function(event) {
        console.log('error getting graph1 to swop');
    }
    transaction.oncomplete=function(event) {
        console.log('swop complete');
    }
}
function type(el) {
    if(el instanceof SVGPolylineElement) {
        return 'line';
    }
    else if(el instanceof SVGPolygonElement) {
        return'shape';
    }
    else if(el instanceof SVGRectElement) {
        return 'box';
    }
    else if(el instanceof SVGEllipseElement) {
        return 'oval';
    }
    else if(el instanceof SVGPathElement) {
        return 'arc';
    }
    else if(el instanceof SVGTextElement) {
        return 'text';
    }
    else if(el instanceof SVGGElement) {
        return 'dim';
    }
    else if(el instanceof SVGSVGElement) {
        return 'combi';
    }
    else if(el instanceof SVGCircleElement) {
        return 'anchor';
    }
    else if(el instanceof SVGUseElement) {
        return 'combi';
    }
}
function updateGraph(id,parameters) {
    // console.log('adjust '+attribute+' of graph '+id+' to '+val);
	var graphs=db.transaction('graphs','readwrite').objectStore('graphs');
	var request=graphs.get(Number(id));
	request.onsuccess=function(event) {
	    var graph=request.result;
	    console.log('got graph '+graph.id);
	    while(parameters.length>0) {
	        var attribute=parameters.shift();
	        val=parameters.shift();
	        console.log('set '+attribute+' to '+val);
	        eval('graph.'+attribute+'="'+val+'"');
	    }
	    request=graphs.put(graph);
	        request.onsuccess=function(event) {
			    console.log('graph '+id+' updated');
		};
		request.onerror=function(event) {
		    console.log("PUT ERROR updating graph "+id);
		};
	}
	request.onerror=function(event) {console.log('error updating '+id);};
}
// START-UP CODE
var request=window.indexedDB.open("brunelDB",dbVersion);
request.onsuccess=function(event) {
    db=event.target.result;
    // nodes=[];
    load();
};
request.onupgradeneeded=function(event) {
    var db=event.target.result;
    if (!db.objectStoreNames.contains('graphs')) {
        var graphs=db.createObjectStore('graphs',{keyPath:'id',autoIncrement:true});
    }
    if (!db.objectStoreNames.contains('combis')) {
        var combis=db.createObjectStore("combis",{keyPath:'name'});
    }
};
request.onerror=function(event) {
	alert("indexedDB error");
};
// SERVICE WORKER
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
}
else { //Register the ServiceWorker
	navigator.serviceWorker.register('brunelSW.js').then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}