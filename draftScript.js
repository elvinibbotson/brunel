// GLOBAL VARIABLES 
var dbVersion=3;
var name=''; // drawing name
var saved=false; // flags whether drawing has been saved
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
var datum={'x':0,'y':0};
var offset={'x':0,'y':0};
var arc={};
var dim={};
var selectionBox={}; // for box select
var selection=[]; // list of elements in selectionBox
var selectedPoints=[]; // list of selected points in line or shape
var anchor=false; // flags existance of anchor
var db=null; // indexed database holding SVG elements
var nodes=[]; // array of nodes each with x,y coordinates and element ID
var node=null;
var dims=[]; // array of links between elements and dimensions
var element=null; // current element
var elID=null; // id of current element 
var combi=null; // current combi
var combiID=null; // id of current combi
// var combis=[]; // holds dimensions for combis to aid selection
var lineType='solid'; // default styles
var lineShade='black';
var pen=0.25; // 0.25mm at 1:1 scale - increase for smaller scales (eg.12.5 at 1:50 scale)
var fillShade='white';
var opacity='1';
var textSize=5; // default text size
var textStyle='fine'; // normal text
var currentDialog=null;

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
id('new').addEventListener('click',function() {
    if(!saved) alert('You may want to save your work before starting a new drawing');
    console.log("show newDrawingDialog");
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
    id('ref').innerHTML=''; // clear reference layer
    id('handles').innerHTML=''; // clear any edit handles
    drawOrder();
    var request=db.transaction('graphs','readwrite').objectStore('graphs').clear(); // clear graphs database
	request.onsuccess=function(event) {
		console.log("database cleared");
	};
	request.onerror=function(event) {
		console.log("error clearing database");
	};
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
            id('ref').innerHTML=''; // clear reference layer
            id('handles').innerHTML=''; // clear any edit handles
		    graphStore.clear();
		    combiStore.clear();
		    aspect=json.aspect;
		    window.localStorage.setItem('aspect',aspect);
		    scale=json.scale;
		    window.localStorage.setItem('scale',scale);
		    console.log('load drawing - aspect:'+aspect+' scale:'+scale);
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
		        }
		        var request=graphStore.add(json.graphs[i]);
		    }
		    for(i=0;i<json.combis.length;i++) {
		        console.log('add combi '+json.combi[i].name);
		        request=combiStore.add(json.combis[i]);
		    }
		}
		transaction.oncomplete=function() {
		    console.log('drawing imported - load & draw');
		    initialise();
            load();
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
    var order=drawOrder();
    var transaction=db.transaction(['graphs','combis']);
    var request=transaction.objectStore('graphs').openCursor();
    request.onsuccess=function(event) {
        var cursor=event.target.result;
        if(cursor) {
            // console.log('graph: '+cursor.value.id);
            var index=order.indexOf(Number(cursor.value.id)); // save graphs in drawing order
            // console.log('index: '+index);
            delete cursor.value.id; 
            data.graphs[index]=cursor.value;
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
    prompt('ZOOM IN');
    zoom*=2;
    // console.log('zoom in to '+zoom);
    w=Math.round(dwg.w*scale/zoom);
    h=Math.round(dwg.h*scale/zoom);
    // console.log('new viewBox: '+dwg.x+','+dwg.y+' '+w+'x'+h);
    id('svg').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+w+' '+h);
    id('ref').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+w+' '+h);
    snapD/=2; // avoid making snap too easy
    handleR/=2; // avoid oversizing edit handles
    id('zoom').innerHTML=zoom;
});
id('zoomOutButton').addEventListener('click',function() {
    prompt('ZOOM OUT');
    if(zoom<2) return;
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
    // console.log('zoom out to full drawing');
    zoom=1;
    dwg.x=0;
    dwg.y=0;
    console.log('new viewBox: '+dwg.x+','+dwg.y+' '+dwg.w+'x'+dwg.h);
    id('svg').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+(dwg.w*scale)+' '+(dwg.h*scale));
    id('ref').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+(dwg.w*scale)+' '+(dwg.h*scale));
    id('zoom').innerHTML=zoom;
});
id('panButton').addEventListener('click',function() {
    // console.log('pan mode');
    mode='pan';
    prompt('PAN');
});
console.log('zoom; '+zoom+' w: '+w+' h: '+h);
// DRAWING TOOLS
id('lineButton').addEventListener('click',function() {
    mode='line';
    showSizes(true,'LINE: drag from start');
});
id('shapeButton').addEventListener('click',function() {
    mode='shape';
    showSizes(true,'SHAPE: drag from start');
});
id('boxButton').addEventListener('click',function() {
    mode='box';
    rad=0;
    showSizes(true,'BOX: drag from corner');
});
id('ovalButton').addEventListener('click',function() { // OVAL/CIRCLE
    mode='oval';
    showSizes(true,'OVAL: drag from centre');
})
id('arcButton').addEventListener('click', function() {
   mode='arc';
   showSizes(true,'ARC: drag from start');
});
id('textButton').addEventListener('click',function() {
    mode='text';
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
	    /*
	    var request=db.transaction('graphs','readwrite').objectStore('graphs').add(graph);
	    request.onsuccess=function(event) {
	        graph.id=request.result;
	        console.log("new text element added: "+graph.id);
	        drawElement(graph);
	    };
	    request.onerror=function(event) {
	        console.log("error adding new text element");
	    };
	    */
    }
    element=elID=null;
    mode='select';
});
id('dimButton').addEventListener('click',function() {
   mode='dimStart';
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
    prompt('DIMENSION: drag to position');
    mode='dimPlace';
});
id('combiButton').addEventListener('click',function() {
    // PLACE CURRENT COMBI OR HOLD TO SHOW LIST OF COMBIS
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
    var points=element.points;
    if((t=='line')||(t=='shape')) {
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
                prompt('REMOVE: tap (round) start-point to remove element or a (square) point to remove it');
                mode='removePoint'; // remove whole element or one point
                return;
            }
        }
    }
    prompt('REMOVE');
    for(var i=0;i<selection.length;i++) console.log('delete '+selection[i]);
    console.log('element is '+elID);
    /*
    if(selection.length>0) {
        while(selection.length>0) remove(selection.pop());
    }
    */
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
    showDialog('textDialog',false); // ...and content (if shown)
	showEditTools(false);
});
id('backButton').addEventListener('click',function() {
    /* SHOULDN'T HAPPEN
    if(selection.length>1) {
        prompt('OOPS');
        return;
    }
    */
    prompt('PUSH BACK');
    var previousElement=element.previousSibling;
    if(previousElement===null) alert('already at back');
    else id('dwg').insertBefore(element,previousElement);
    drawOrder(); // update drawing order
});
id('forwardButton').addEventListener('click',function() {
    /* SHOULDN'T HAPPEN
    if(selection.length>1) {
        prompt('OOPS');
        return;
    }
    */
    prompt('PULL FORWARD');
    var nextElement=element.nextSibling;
    if(nextElement===null) alert('already at front');
    else id('dwg').insertBefore(nextElement,element);
    drawOrder(); // update drawing order
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
        /* USE setTransform()
        var t='rotate('+netSpin+','+ox+','+oy+')';
        console.log('transform is: '+t);
        // NEW - SPIN ELEMENT BEFORE MOVING?
        element.setAttribute('transform',t);
        element.setAttribute('spin',netSpin);
        */
        element.setAttribute('spin',netSpin);
        updateGraph(elID,['spin',netSpin]);
        setTransform(element);
        //
        if(axis) { // reposition elements, spinning around axis
            dx=ox-axis.x;
            dy=oy-axis.y;
            var d=Math.sqrt(dx*dx+dy*dy);
            var a=Math.atan(dy/dx);
            a+=(spin*Math.PI/180);
            dx=Math.round(d*Math.sin(a));
            dy=Math.round(d*Math.cos(a));
            // NEW - USE move() TO MOVE SPIN ELEMENTS AROUND AXIS
            move(element,dx,dy);
            /*
            ox=axis.x+dx;
            oy=axis.y+dy;
            switch(type(element)) {
                case 'line':
                case 'shape':
                    console.log('move all points by '+dx+','+dy);
                    for(var i=0;i<element.points.length;i++) {
                        element.points[i].x+=dx;
                        element.points[i].y+=dy;
                    }
                    console.log(element.points.length+' points adjusted');
                    element.setAttribute('transform',t);
                    updateGraph(el.id,['points',element.getAttribute('points'),'spin',spin]);
                    break;
                case 'box':
                case 'text':
                case 'combi':
                    element.setAttribute('x',ox);
                    element.setAttribute('y',oy);
                    element.setAttribute('transform',t);
                    updateGraph(elID,['x',ox,'y',oy,'spin',spin]);
                    break;
                case 'oval':
                case 'arc':
                    element.setAttribute('cx',ox);
                    element.setAttribute('cy',oy);
                    element.setAttribute('transform',t);
                    updateGraph(elID,['cx',ox,'cy',oy,'spin',spin]);
            }
            */
        }
        else refreshNodes(element); // if not already done after move() or setTransform()
    }
    showDialog('spinDialog',false);
    id('handles').innerHTML='';
    id('selection').innerHTML='';
    selected=[];
    mode='select';
    showSizes(false);
    elID=null;
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
    /*
    if(copy) { // mirror copy/copies just to left/right/above/below
        switch(opt) {
            case 0: //flip copy to left
                axis.x=minX-snapD;
                break;
            case 1: // flip copy to right
                axis.x=maxX+snapD;
                break;
            case 2: // flip copy above
                axis.y=minY-snapD;
                break;
            case 3: // flip copy below
                axis.y=maxY+snapD;
        }
    }
    */
    if(anchor) { // flip around anchor
        axis.x=parseInt(id('anchor').getAttribute('cx'));
        axis.y=parseInt(id('anchor').getAttribute('cy'));
    }
    else { // flip in-situ around mid-point
        copy=false;
        axis.x=(minX+maxX)/2;
        axis.y=(minY+maxY)/2;
    }
    console.log('axis: '+axis.x+','+axis.y);
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
                        if(copy) pts+=points[i].x+' '+(axis.y-dy)+' ';
                        else points[i].y=axis.y-dy;
                    }
                }
                if(copy) {
                    console.log('create copy of element '+elID);
                    var g={}; // new graph for copy/copies
                    g.type=type(el); // line or shape
                    g.points=pts;
                    // AVOID DATABASE OPERATIONS
                    g.stroke=el.getAttribute('stroke');
                    g.lineW=el.getAttribute('stroke-width');
                    g.lineStyle=getLineStyle(el);
                    g.fill=el.getAttribute('fill');
                    var o=el.getAttribute('fill-opacity');
                    g.opacity=(o)?o:1;
                    addGraph(g);
                    /*
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
                    */
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
                    // g.radius=parseInt(el.getAttribute('rx'));
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
                    /* USE setTransform()
                    var hor=flip&1;
                    var ver=flip&2;
                    var t='translate('+(hor*parseInt(el.getAttribute('x'))*2)+','+(ver*parseInt(el.getAttribute('y')))+') ';
                    t+='scale('+((hor>0)? -1:1)+','+((ver>0)? -1:1)+')';
                    // ADD rotate() FOR SPIN
                    el.setAttribute('flip',flip);
                    el.setAttribute('transform',t);
                    */
                    updateGraph(elID,['flip',flip]);
                }
                break;
            case 'combi':
                if(copy) {
                    var g={};
                    g.type='combi';
                    if(opt<1) { // mirror copy left or right...
                        // dx=parseInt(el.getAttribute('x'))+parseInt(el.getAttribute('width'))-axis.x;
                        g.x=axis.x-dx;
                        g.y=parseInt(el.getAttribute('y'));
                        // dx=parseInt(el.getAttribute('ax'))-axis.x;
                        dx=parseInt(el.getAttribute('x'))-axis.x;
                        // g.ax=axis.x-dx;
                        // g.ay=parseInt(el.getAttribute('ay'));
                        g.flip=parseInt(el.getAttribute('flip'))^1;
                    }
                    else { // ...above or below
                        g.x=parseInt(el.getAttribute('x'));
                        // dy=parseInt(el.getAttribute('y'))+parseInt(el.getAttribute('height'))-axis.y;
                        // g.y=axis.y-dy;
                        // g.ax=parseInt(el.getAttribute('ax'));
                        dy=parseInt(el.getAttribute('y'))-axis.y;
                        // dy=parseInt(el.getAttribute('ay'))-axis.y;
                        // g.ay=axis.y-dy;
                        g.flip=parseInt(el.getAttribute('flip'))^2; // toggle vertical flip
                    }
                    var request=db.transaction('graphs').objectStore('graphs').get(Number(elID));
                    request.onsuccess=function(event) {
                        var graph=request.result;
                        console.log('retrieved graph '+graph.type+' combi no. '+graph.no);
                        // if(graph.type=='combi') console.log('combi no. '+graph.no);
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
    // selection=[];
    // element=elID=null;
    // id('handles').innerHTML='';
    // id('selection').innerHTML='';
    if(anchor) {
        id('blue').removeChild(id('anchor'));
        anchor=false;
    }
    showDialog('flipDialog',false);
    // mode='select';
});
id('alignButton').addEventListener('click',function() {
    if(selection.length<2) {
        prompt('OOPS!'); // can only align multiple elements
        return;
    }
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
    var val=parseInt(id('offset').value);
    console.log('double offset: '+val+'mm');
    showDialog('doubleDialog',false);
    var graph={}; // initiate new element
    graph.type=type(element);
    switch(graph.type) {
        case 'line':
            var points=element.points;
            var count=points.length-1; // eg. line with 3 points has 2 segments
            var pt=0; // point counter
            var a=null; // for line function y=ax+b
            var a0=null;
            var b=null;
            var b0=null;
            var angle=null;
            graph.points="";
            while(pt<count) {
                x=points[pt].x;
                y=points[pt].y;
                console.log('segment '+pt+' origin: '+x+','+y);
                dx=points[pt+1].x-x;
                dy=points[pt+1].y-y;
                a=0;
                if(dx==0) { // vertical - slope is infinite
                    a=b=null;
                    if(dy<0) x+=val;
                    else x-=val;
                    console.log('vertical - adjust x to '+x);
                }
                else {
                    a=dy/dx;
                    angle=Math.atan(dx/dy); // orthogonal offset
                    console.log('segment slope: '+a+' ie.'+angle+' radians');
                    if(dy>=0) {
                        x-=val*Math.cos(angle);
                        y+=val*Math.sin(angle);
                    }
                    else {
                        x+=val*Math.cos(angle);
                        y-=val*Math.sin(angle);
                    }
                    b=y-a*x;
                    console.log('new segment function: y='+a+'.x+'+b);
                }
                console.log('new segment origin: '+x+','+y);
                if(pt<1) graph.points+=Math.round(x)+' '+Math.round(y)+' '; // start of new line
                // if(count-pt<) graph.points+=Math.round(x+dx)+' '+Math.round(y+dy); // end of new line
                else { // resolve corner of new line
                    if(a && a0) { // neither segment is vertical
                        x=(b-b0)/(a0-a);
                        y=a*x+b;
                    }
                    else if(a) y=a*x0+b; // resolve from second segment...
                    else y=a0*x+b0; // ...or first segment function
                    console.log('CORNER at '+x+','+y);
                    graph.points+=Math.round(x)+' '+Math.round(y)+' ';
                }
                a0=a; // parameters for previous line segment
                b0=b;
                x0=x; // start of next line sector
                pt++;
            }
            // LAST POINT NEEDS TO OFFSET AT 90 DEGREES
            x=points[pt].x; // end point of original line
            y=points[pt].y;
            if(dx==0) {
                if(dy<0) x+=val;
                else x-=val;
            }
            else if(dy>=0) { // offset orthogonally
                x-=val*Math.cos(angle);
                y+=val*Math.sin(angle);
            }
            else {
                x+=val*Math.cos(angle);
                y-=val*Math.sin(angle);
            }
            graph.points+=Math.round(x)+' '+Math.round(y); // end of new line
            graph.spin=element.getAttribute('spin');
            break;
        case 'shape':
            var points=element.points;
            var count=points.length; // eg. 3-point shape (triangle) has 3 sides
            var pt=0; // point counter
            var a=null; // for line function y=ax+b
            var a0=null;
            var b=null;
            var b0=null;
            var angle=null;
            graph.points="";
            while(pt<=count) {
                x=points[pt%count].x; // NB: finish with start point/side - hence %
                y=points[pt%count].y;
                dx=points[(pt+1)%count].x-x;
                dy=points[(pt+1)%count].y-y;
                console.log('side '+pt+' origin: '+x+','+y);
                if(dx==0) { // vertical - slope is infinite
                    a=b=null;
                    if(dy<0) x+=val;
                    else x-=val;
                    console.log('vertical - adjust x to '+x);
                }
                else {
                    a=dy/dx;
                    angle=Math.atan(dx/dy); // orthogonal offset
                    console.log('side '+pt+' slope: '+a+' ie.'+angle+' radians');
                    if(dy>=0) {
                        x-=val*Math.cos(angle);
                        y+=val*Math.sin(angle);
                    }
                    else {
                        x+=val*Math.cos(angle);
                        y-=val*Math.sin(angle);
                    }
                    b=y-a*x;
                    console.log('new side function: y='+a+'.x+'+b);
                }
                if(a && a0) { // neither side is vertical
                    x=(b-b0)/(a0-a);
                    y=a*x+b;
                }
                else if(a) y=a*x0+b; // resolve from second segment...
                else y=a0*x+b0; // ...or first segment function
                console.log('CORNER at '+x+','+y);
                var point=Math.round(x)+' '+Math.round(y)+' ';
                if(pt>0) graph.points+=Math.round(x)+' '+Math.round(y)+' '; // append point or...
                a0=a;
                b0=b;
                pt++;
            }
            graph.spin=element.getAttribute('spin');
            break;
        case 'box':
            x=parseInt(element.getAttribute('x'));
            y=parseInt(element.getAttribute('y'));
            w=parseInt(element.getAttribute('width'));
            h=parseInt(element.getAttribute('height'));
            if((val<0)&&((w+2*val<1)||(h+2*val<1))) {
                alert('cannot fit inside');
                return;
            }
            graph.spin=element.getAttribute('spin'); // IF HAS SPIN NEED TO SPIN AROUND ORIGINAL BOX ORIGIN
            if(graph.spin!=0) { // spin around orignal box anchor
                var r=Math.sqrt(2)*val;
                var s=(45-graph.spin)*Math.PI/180; // radians
                graph.x=x-(r*Math.sin(s));
                graph.y=y-(r*Math.cos(s));
            }
            else {
                graph.x=x-val;
                graph.y=y-val;
            }
            graph.width=w+2*val;
            graph.height=h+2*val;
            var n=parseInt(element.getAttribute('rx'));
            console.log('corner radius: '+n);
            if(n!=0) n+=val;
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
            if((val<0)&&((rx+val)<1)||((ry+val)<1)) {
                alert('cannot fit inside');
                return;
            }
            graph.cx=x;
            graph.cy=y;
            graph.rx=rx+val;
            graph.ry=ry+val;
            graph.spin=element.getAttribute('spin');
            break;
        case 'arc':
            var d=element.getAttribute('d');
            getArc(d);
            var r=arc.r+val; // new arc radius
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
});
id('repeatButton').addEventListener('click',function() {
    if(type(element)=='dim') return; // cannot move dimensions
    /* SHOULDN'T BE NEEDED
    if(selection.length>1) {
        prompt('Sorry. Cannot repeat multiple selection');
        return;
    }
    */
    showDialog('textDialog',false);
    id('countH').value=id('countV').value=1;
    id('distH').value=id('distV').value=0;
    // id('countH').value=id('countV').value=id('distH').value=id('distV').value=0;
    showDialog('repeatDialog',true);
});
id('confirmRepeat').addEventListener('click',function() {
    var nH=parseInt(id('countH').value);
    var nV=parseInt(id('countV').value);
    var dH=parseInt(id('distH').value);
    var dV=parseInt(id('distV').value);
    console.log(nH+' copies across at '+dH+'mm; '+nV+' copie down at '+dV+'mm');
    element=id(elID);
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
    id('handles').innerHTML='';
    mode='select';
    showDialog('repeatDialog',false);
    showSizes(false);
});
id('filletButton').addEventListener('click',function() {
    if(type(element!='box')) return; // can only fillet box corners
    id('filletR').value=parseInt(element.getAttribute('rx'));
    showDialog('filletDialog',true);
});
id('confirmFillet').addEventListener('click',function() {
    var r=parseInt(id('filletR').value);
    element.setAttribute('rx',r);
    updateGraph(elID,['radius',r]);
    id('handles').innerHTML='';
    mode='select';
    showDialog('filletDialog',false);
    showSizes(false);
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
                /*
                for(var j=0;j<points.length;j++) {
                    points[j].x-=minX;
                    points[j].y-=minY;
                }
                */
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
    showDialog('stylesDialog',true);
});
id('lineType').addEventListener('change',function() {
    if(selection.length>1) {
        prompt('OOPS');
        return;
    }
    var type=event.target.value;
    // console.log('line type: '+type);
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
    else { // change default line type
        lineType=type;
        // console.log('line type is '+type);
    }
    id('line').style.borderStyle=type;
});
id('penSelect').addEventListener('change',function() {
    if(selection.length>1) {
        prompt('OOPS');
        return;
    }
    var val=event.target.value;
    // console.log('pen width: '+val+'mm at 1:1');
    // id('penWidth').value=val;
    // console.log((val*scale)+'mm at 1:'+scale);
    if(elID) { // change selected element
        element=id(elID);
        var lineW=val*scale;
        element.setAttribute('stroke-width',lineW);
        if(element.getAttribute('stroke-dasharray')) element.setAttribute('stroke-dasharray',lineW+' '+lineW);
        // console.log('set element '+element.id+' pen to '+val);
        updateGraph(element.id,['lineW',lineW]);
    }
    else { // change default pen width
        pen=val;
        // console.log('pen is '+pen);
    }
    id('line').style.borderWidth=(pen/scaleF)+'px';
});
id('textSize').addEventListener('change',function() {
    if(selection.length>1) {
        prompt('OOPS');
        return;
    }
    var val=event.target.value;
    if(elID) { // change selected text element
        element=id(elID);
        if(type(element)=='text') {
            element.setAttribute('font-size',val*scale);
            // console.log('set element '+element.id+' text size to '+val);
            updateGraph(element.id,['textSize',val]);
        }
    }
    else { // change default pen width
        textSize=val;
    }
});
id('textStyle').addEventListener('change',function() {
    if(selection.length>1) {
        prompt('OOPS');
        return;
    }
    var val=event.target.value;
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
    else { // change default pen width
        textStyle=val;
    }
});
id('lineShade').addEventListener('click',function() {
    if(selection.length>1) {
        prompt('OOPS');
        return;
    }
    // console.log('show shadeMenu');
    id('shadeMenu').mode='line';
    showShadeMenu(true,event.clientX-16,event.clientY-16);
});
id('fillShade').addEventListener('click',function() {
    if(selection.length>1) {
        prompt('OOPS');
        return;
    }
    console.log('show shadeMenu');
    id('shadeMenu').mode='fill';
    var shade=showShadeMenu(true,event.clientX-16,event.clientY-16);
});
id('opacity').addEventListener('change',function() {
    if(selection.length>1) {
        prompt('OOPS');
        return;
    }
    var val=event.target.value;
    // console.log('opacity: '+val);
    if(elID) { // change selected element
        element=id(elID);
        element.setAttribute('fill-opacity',val);
        updateGraph(elID,['opacity',val]);
    }
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
    if(id('shadeMenu').mode=='line') {
        if(val=='white') val='blue';
        // var val=(shade=='white')?'blue':shade;
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
                    // updateGraph(element.id,['stroke-width',0.25*scale]);
                    element.setAttribute('fill','none'); // ...and no fill
                    id('ref').appendChild(element); // move to <ref> layer
                    remove(elID,true); // remove from database keeping nodes for snap
                    cancel();
                    /*
                    elID=null;
                    selection=[];
                    id('handles').innerHTML=''; //remove element handles
                    showSizes(false);
                    showEditTools(false);
                    */
                }
            }
        }
        else { // change default line shade
            // console.log('line shade: '+val);
            if(val=='blue') val='black'; // cannot have blue <ref> choice as default
            lineShade=val;
        }
        id('line').style.borderColor=val;
        id('lineShade').style.backgroundColor=val;
    }
    else {
        if(elID) { // change selected element
            element=id(elID);
            console.log('element '+elID+' is '+type(element));
            if(type(element)=='line') return; // lines never have fill
            element.setAttribute('fill',val);
            // console.log('set element '+element.id+' fill shade to '+val);
            updateGraph(element.id,['fill',val]);
        }
        else { // change default fill shade
            // console.log('fill shade: '+val);
            fillShade=val;
        }
        // if(shade=='none') id('fillType').value=0;
        id('fill').style.background=val;
        id('fillShade').style.backgroundColor=val;
    }
});
// POINTER DOWN
id('graphic').addEventListener('pointerdown',function() {
    console.log('pointer down - mode is '+mode);
    event.preventDefault();
    if(currentDialog) showDialog(currentDialog,false); // clicking drawing removes any dialogs/menus
    id('shadeMenu').style.display='none';
    scr.x=Math.round(event.clientX);
    scr.y=Math.round(event.clientY);
    x=x0=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=y0=Math.round(scr.y*scaleF/zoom+dwg.y);
    var val=event.target.id;
    console.log('tap on '+val);
    if(val=='anchor') { // can move either anchor or selected elements
        if(selection.length<1) {
            element=id(val);
            elID=val;
            prompt('ANCHOR: drag to move')
        }
        else {
            selection.push(val); // include anchor in selection
            prompt('drag ANCHOR to MOVE selection');
        }
        mode='move';
        // return;
    }
    var holder=event.target.parentNode.id;
    // console.log('holder is '+holder);
    if((holder=='selection')&&(mode!='anchor')) { // click on a blue box to move multiple selectin
        console.log('move group selection');
        mode='move';
        prompt('drag to MOVE selection');
    }
    else if(val.startsWith('handle')) { // edit using handle
        console.log('HANDLE '+val);
        var handle=id(val);
        var bounds=getBounds(element);
        console.log('bounds: '+bounds.x+','+bounds.y+' '+bounds.width+'x'+bounds.height);
        id('blueBox').setAttribute('x',bounds.x);
        id('blueBox').setAttribute('y',bounds.y);
        id('blueBox').setAttribute('width',bounds.width);
        id('blueBox').setAttribute('height',bounds.height);
        if(handle instanceof SVGCircleElement) { // remove whole element
            if(mode=='removePoint') {
                showDialog('removeDialog',true);
                return;
            }
            mode='move';
            // id('blueBox').setAttribute('x',x);
            // id('blueBox').setAttribute('y',y);
            prompt('drag to MOVE');
            id('textDialog').style.display='none';
            switch(type(element)) {
                case 'line':
                case 'shape':
                    x0=element.points[0].x;
                    y0=element.points[0].y;
                    break;
                case 'box':
                case 'text':
                case 'combi':
                    x0=element.getAttribute('x');
                    y0=element.getAttribute('y');
                    break;
                case 'oval':
                case 'arc':
                    x0=element.getAttribute('cx');
                    y0=element.getAttribute('cy');
            }
            offset.x=bounds.x-x0;
            offset.y=bounds.y-y0;
            id('blueBox').setAttribute('x',x+offset.x);
            id('blueBox').setAttribute('y',y+offset.y);
        }
        else if(handle instanceof SVGRectElement) {
            val=val.substr(6);
            if(mode=='addPoint') {
                console.log('add point after point '+val);
                var points=element.points;
                console.log('point '+val+': '+points[val].x+','+points[val].y);
                var n=points.length-1;
                var pts='';
                if(val==n) { // append point after end-point
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
                    x=Math.round((Number(points[val].x)+Number(points[val+1].x))/2);
                    y=Math.round((Number(points[val].y)+Number(points[val+1].y))/2);
                    var i=0;
                    while(i<points.length) {
                        // if(i<val) pts+=points[i].x+','+points[i].y+' ';
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
                /*
                element=elID=null;
                id('handles').innerHTML='';
                selection=[];
                mode='select';
                */
                return;
            }
            else if(mode=='removePoint') {
                console.log('remove point '+val);
                var points=element.points;
                console.log('point '+val+': '+points[val].x+','+points[val].y);
                var pts='';
                for(var i=0;i<points.length-1;i++) {
                    if(i<val) pts+=points[i].x+','+points[i].y+' ';
                    else pts+=points[i+1].x+','+points[i+1].y+' ';
                }
                element.setAttribute('points',pts);
                updateGraph(elID,['points',pts]);
                refreshNodes(element);
                cancel();
                /*
                element=elID=null;
                id('handles').innerHTML='';
                selection=[];
                mode='select';
                */
                return;
            }
            console.log('size handle '+val);
            switch(val) {
                /*
                case 'NE':
                    mode='boxWidth';
                    x0=parseInt(element.getAttribute('x'));
                    break;
                case 'SW':
                    mode='boxHeight';
                    y0=parseInt(element.getAttribute('y'));
                    break;
                */
                case 'SE':
                    mode='boxSize';
                    x0=parseInt(element.getAttribute('x'));
                    y0=parseInt(element.getAttribute('y'));
                    break;
                case 'Size':
                    mode='ovalSize';
                    x0=parseInt(element.getAttribute('cx'));
                    y0=parseInt(element.getAttribute('cy'));
                    break;
                case 'Start':
                case 'End':
                    mode='arcSize';
                    var d=element.getAttribute('d');
                    getArc(d);
                    x0=arc.cx;
                    y0=arc.cy;
                    console.log('arc centre: '+x0+','+y0);
                    id('blueBox').setAttribute('width',0);
                    id('blueBox').setAttribute('height',0);
                    id('blueOval').setAttribute('cx',x0);
                    id('blueOval').setAttribute('cy',y0);
                    id('blueOval').setAttribute('rx',arc.radius);
                    id('blueOval').setAttribute('ry',arc.radius);
                    break;
                case 'Dim':
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
                    /*
                    if(dx==0) dim.dir='v';
                    else if(dy==0) dim.dir='h';
                    else {
                        var request=db.transaction('graphs').objectStore('graphs').get(Number(elID));
                        request.onsuccess=function(event) {
                            dim=request.result;
                            console.log('oblique dimension start node: '+dim.x1+','+dim.y1);
                        }
                    }
                    console.log('dimension direction: '+dim.dir);
                    */
                    prompt('MOVE DIMENSION (UP/DOWN)');
                    break;
                default:
                    mode='movePoint'+val;
                    var points=element.getAttribute('points');
                    id('bluePolyline').setAttribute('points',points);
                    id('blueBox').setAttribute('width',0);
                    id('blueBox').setAttribute('height',0);
            }
            console.log('mode: '+mode);
        }
        id('graphic').addEventListener('pointermove',drag);
        return;
    }
    snap=snapCheck(); //  JUST DO if(snapCheck())?
    console.log('SNAP: '+snap);
    if(snap) { // snap start/centre to snap target
        x0=x;
        y0=y;
    }
    console.log('mode: '+mode);
    switch(mode) {
        case 'pan':
            // console.log('start pan at '+x0+','+y0);
            var view=id('svg').getAttribute('viewBox');
            // console.log('view: '+view+' - dwg.x,y: '+dwg.x+','+dwg.y);
            break;
        case 'line':
            element=id('bluePolyline');
            elID='bluePolyline';
            var point=id('svg').createSVGPoint();
            point.x=x;
            point.y=y;
            // try...
            if(element.points.length>1) {
                point=element.points[element.points.length-1];
                x0=point.x;
                y0=point.y;
            }
            else if(element.points.length>0) element.points[0]=point;
            id('bluePolyline').points.appendItem(point);
            prompt('LINES: drag to next point; tap twice to end');
            break;
        case 'shape':
            element=id('bluePolyline');
            elID='bluePolyline';
            var point=id('svg').createSVGPoint();
            point.x=x;
            point.y=y;
            if(element.points.length<2) { // start polyline...
                element.points[0]=point;
            }
            else {
                point=element.points[element.points.length-1];
                x0=point.x;
                y0=point.y;
            }
            id('bluePolyline').points.appendItem(point);
            prompt('SHAPE: drag to next point; finish on start point');
            break;
        case 'box':
            id('blueBox').setAttribute('x',x0);
            id('blueBox').setAttribute('y',y0);
            prompt('BOX: drag to size');
            console.log('box started at '+x0+','+y0);
            break;
        case 'oval':
            id('blueOval').setAttribute('cx',x0);
            id('blueOval').setAttribute('cy',y0);
            // console.log('sizing oval initiated');
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
            mode='select';
            break;
        case 'select':
        case 'pointEdit':
            id('blueBox').setAttribute('x',x0);
            id('blueBox').setAttribute('y',y0);
            selectionBox.x=x0;
            selectionBox.y=y0;
            selectionBox.w=selectionBox.h=0;
            showSizes(true,'SELECT: drag selection box');
    }
    event.stopPropagation();
    console.log('exit pointer down code');
    if(mode!='combi') id('graphic').addEventListener('pointermove',drag);
});
// POINTER MOVE
function drag(event) {
    event.preventDefault();
    scr.x=Math.round(event.clientX);
    scr.y=Math.round(event.clientY);
    x=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=Math.round(scr.y*scaleF/zoom+dwg.y);
    if(mode!='arcEnd') {
        snap=snapCheck(); // snap to nearby nodes, datum,...
        console.log('SNAP: '+snap);
        if(!snap) {
            if(Math.abs(x-x0)<snapD) x=x0; // ...vertical...
            if(Math.abs(y-y0)<snapD) y=y0; // ...or horizontal
        }
    }
    if(mode.startsWith('movePoint')) {
        var n=parseInt(mode.substr(9));
        // console.log('drag polyline point '+n);
        id('bluePolyline').points[n].x=x;
        id('bluePolyline').points[n].y=y;
    }
    else switch(mode) {
        case 'move':
            if(selection.length>1) { // move multiple selection
                dx=x-x0;
                dy=y-y0;
                id('selection').setAttribute('transform','translate('+dx+','+dy+')');
            }
            else { // drag  single element
                id('blueBox').setAttribute('x',x+offset.x);
                id('blueBox').setAttribute('y',y+offset.y);
                console.log('dragged to '+x+','+y);
            }
            if(anchor) {
                id('anchor').setAttribute('cx',x);
                id('anchor').setAttribute('cy',y);
            }
            setSizes('polar',null,x0,y0,x,y);
            break;
        case 'boxSize':
            w=parseInt(element.getAttribute('width'));
            h=parseInt(element.getAttribute('height'));
            // WAS var aspect=parseInt(element.getAttribute('width'))/parseInt(element.getAttribute('height'));
            var aspect=w/h;
            // console.log('box size: '+w+'x'+h+'; aspect: '+aspect);
            dx=x-x0;
            dy=y-y0;
            if(Math.abs(dx-w)<(snapD*2)) dx=w; // snap to equal width,...
            else if(Math.abs(dy-h)<(snapD*2)) dy=h; // ...equal height,... 
            else if((dx/dy)>aspect) dy=dx/aspect; // ...or equal proportion
            else dx=dy*aspect;
            if((dx<0)||(dy<0)) prompt('OOPS!');
            id('blueBox').setAttribute('width',dx);
            id('blueBox').setAttribute('height',dy);
            w=dx;
            h=dy;
            setSizes('box',null,w,h);
            break;
        case 'ovalSize':
            dx=x-x0;
            dy=y-y0;
            if(Math.abs(dx-dy)<snapD*2) dx=dy; // snap to circle
            // console.log('radii: '+dx+','+dy);
            id('blueBox').setAttribute('x',(x0-dx));
            id('blueBox').setAttribute('y',(y0-dy));
            id('blueBox').setAttribute('width',(dx*2));
            id('blueBox').setAttribute('height',(dy*2));
            w=dx*2;
            h=dy*2;
            console.log('set size to '+w+'x'+h);
            setSizes('box',null,w,h);
            break;
        case 'arcSize':
            dx=x-x0;
            dy=y-y0;
            var r=Math.sqrt((dx*dx)+(dy*dy));
            // console.log('radius: '+r);
            id('blueOval').setAttribute('rx',r);
            id('blueOval').setAttribute('ry',r);
            id('first').value=r;
            break;
        case 'pan':
            dx=dwg.x-(x-x0);
            dy=dwg.y-(y-y0);
            // console.log('drawing x,y: '+dx+','+dy);
            id('svg').setAttribute('viewBox',dx+' '+dy+' '+(dwg.w*scale/zoom)+' '+(dwg.h*scale/zoom));
            id('ref').setAttribute('viewBox',dx+' '+dy+' '+(dwg.w*scale/zoom)+' '+(dwg.h*scale/zoom));
            break;
        case 'line':
        case 'shape':
            if(Math.abs(x-x0)<snapD) x=x0; // snap to vertical
            if(Math.abs(y-y0)<snapD) y=y0; // snap to horizontal
            var n=element.points.length;
            var point=element.points[n-1];
            point.x=x;
            point.y=y;
            element.points[n-1]=point;
            setSizes('polar',null,x0,y0,x,y);
            break;
        case 'box':
            var boxX=(x<x0)?x:x0;
            var boxY=(y<y0)?y:y0;
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            console.log('box size: '+w+'x'+h+' at '+x+','+y);
            if(Math.abs(w-h)<snapD*2) w=h; // snap to square
            id('blueBox').setAttribute('x',boxX);
            id('blueBox').setAttribute('y',boxY);
            id('blueBox').setAttribute('width',w);
            id('blueBox').setAttribute('height',h);
            setSizes('box',null,w,h);
            break;
        case 'oval':
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            if(Math.abs(w-h)<snapD*2) w=h; // snap to circle
            id('blueOval').setAttribute('rx',w);
            id('blueOval').setAttribute('ry',h);
            w=Math.abs(w*2);
            h=Math.abs(h*2);
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
            // w=x-arc.cx;
            // h=y-arc.cy;
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
            id('blueBox').setAttribute('x',boxX);
            id('blueBox').setAttribute('y',boxY);
            id('blueBox').setAttribute('width',w);
            id('blueBox').setAttribute('height',h);
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
    if(mode.startsWith('movePoint')) { // move polyline/polygon point
        id('handles').innerHTML='';
        var n=parseInt(mode.substr(9));
        console.log('move point '+n);
        element.points[n].x=x;
        element.points[n].y=y;
        updateGraph(elID,['points',element.getAttribute('points')]);
        id('bluePolyline').setAttribute('points','0,0');
        refreshNodes(element);
        cancel();
        /*
        mode='select';
        elID=null;
        selection=[];
        showSizes(false);
        showEditTools(false);
        */
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
            dx=x-x0;
            dy=y-y0;
            console.log('move '+selection.length+' elements');
            if(anchor && (selection.length>1)) { // dispose of anchor after use
                // id('anchor').remove();
                id('blue').removeChild(id('anchor'));
                anchor=false;
            }
            // console.log('selection: '+selection);
            /* TEMPORARY METHOD OF CHECKING DIMENSION LINKS
            for(i=0; i<links.length;i++) { // check for links between moved elements and dimensions
                var link=0;
                // if(selection.indexOf(String(links[i].el1))>=0) link=1;
                if(selection.includes(String(links[i].el1))) link=1;
                if(selection.includes(String(links[i].el2))) link+=2;
                console.log('link '+i+': '+links[i].dim+' '+links[i].el1+','+links[i].el2+' - '+link);
                if(link>0) adjustDim(links[i].dim,link,dx,dy); // if link applies, redraw dimension
            }
            */
            while(selection.length>0) { // move all selected elements
                elID=selection.pop();
                console.log('move element '+elID);
                element=id(elID);
                /*
                if(type(element)=='combi') { // allow for NTS combis
                var s=parseInt(element.getAttribute('scale'));
                    dx/=s;
                    dy/=s;
                }
                */
                move(element,dx,dy);
                /* USE move() FUNCTION INSTEAD OF ALL THIS...
                var val=type(element);
                console.log('element type: '+val);
                switch(val) {
                    case 'line':
                    case 'shape':
                        console.log('move all points by '+dx+','+dy);
                        for(var i=0;i<element.points.length;i++) {
                            element.points[i].x+=dx;
                            element.points[i].y+=dy;
                        }
                        // console.log(element.points.length+' points adjusted');
                        updateGraph(elID,['points',element.getAttribute('points')]);
                        break;
                    case 'box':
                    case 'text':
                    case 'combi':
                        console.log('from '+element.getAttribute('x')+','+element.getAttribute('y')+'...');
                        x=parseInt(element.getAttribute('x'))+dx;
                        y=parseInt(element.getAttribute('y'))+dy;
                        element.setAttribute('x',x);
                        element.setAttribute('y',y);
                        console.log('...to '+x+','+y);
                        updateGraph(elID,['x',x,'y',y]);
                        break;
                    case 'oval':
                        x=parseInt(element.getAttribute('cx'))+dx;
                        y=parseInt(element.getAttribute('cy'))+dy;
                        element.setAttribute('cx',x);
                        element.setAttribute('cy',y);
                        updateGraph(elID,['cx',x,'cy',y]);
                        break;
                    case 'arc':
                        // move centre, start and end points by dx,dy
                        var d=element.getAttribute('d');
                        getArc(d);
                        arc.cx+=dx;
                        arc.cy+=dy;
                        arc.x1+=dx;
                        arc.y1+=dy;
                        arc.x2+=dx;
                        arc.y2+=dy;
                        d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
                        element.setAttribute('d',d);
                        updateGraph(elID,['cx',arc.cx,'cy',arc.cy,'x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2]);
                        break;
                    case 'anchor':
                        // x=parseInt(element.getAttribute('cx'))+dx;
                        // y=parseInt(element.getAttribute('cy'))+dy;
                        element.setAttribute('cx',x);
                        element.setAttribute('cy',y);
                        break;
                }
                refreshNodes(element);
                */
            }
            id('selection').setAttribute('transform','translate(0,0)');
            cancel();
            /*
            id('selection').innerHTML='';
            mode='select';
            elID=null;
            selection=[];
            showSizes(false);
            showEditTools(false);
            */
            break;
        case 'boxSize':
            console.log('pointer up - box size: '+dx+'x'+dy);
            id('handles').innerHTML='';
            element.setAttribute('width',dx);
            updateGraph(elID,['width',dx,'height',dy]);
            element.setAttribute('height',dy);
            // updateGraph(elID,'height',dy);
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            refreshNodes(element);
            cancel();
            /*
            mode='select';
            elID=null;
            selection=[];
            showSizes(false);
            showEditTools(false);
            */
            break;
        case 'ovalSize':
            console.log('pointer up - radii: '+dx+'x'+dy);
            id('handles').innerHTML='';
            element.setAttribute('rx',dx);
            updateGraph(elID,['rx',dx,'ry',dy]);
            element.setAttribute('ry',dy);
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            refreshNodes(element);
            cancel();
            /*
            mode='select';
            elID=null;
            selection=[];
            showSizes(false);
            showEditTools(false);
            */
            break;
        case 'arcSize':
            dx=x-x0;
            dy=y-y0;
            r=Math.sqrt((dx*dx)+(dy*dy));
            console.log('pointer up - radius: '+r);
            id('handles').innerHTML='';
            // adjust arc start...
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
            var d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
            element.setAttribute('d',d);
            updateGraph(elID,['x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2,'r',arc.r]);
            refreshNodes(element);
            id('blueOval').setAttribute('rx',0);
            id('blueOval').setAttribute('ry',0);
            cancel();
            /*
            mode='select';
            elID=null;
            selection=[];
            showSizes(false);
            showEditTools(false);
            */
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
            if(snap) {  // adjust previous point to snap target
                var n=element.points.length;
                var point=element.points[n-1];
                point.x=x;
                point.y=y;
                element.points[n-1]=point;
            }
            var d=Math.sqrt((x-x0)*(x-x0)+(y-y0)*(y-y0));
            if((d<snapD)||(n>9)) { // click/tap to finish polyline - capped to 10 points
                console.log('end polyline');
                /* remove duplicate end-point
                var points='';
                for(var i=0;i<id('bluePolyline').points.length-1;i++) {
                    points+=id('bluePolyline').points[i].x+','+id('bluePolyline').points[i].y+' ';
                }
                */
                var points=id('bluePolyline').points;
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
	            /*
	            graph.x=points[0].x;
	            graph.y=points[0].y;
	            console.log('start: '+graph.x+','+graph.y);
	            graph.dx=[]; // relative coords for remaining points
	            graph.dy=[];
	            for(var i=1;i<points.length-1;i++) { // omit duplicated end point
	                console.log('points['+i+']: '+points[i].x+','+points[i].y);
	                graph.dx.push(points[i].x-graph.x);
	                graph.dy.push(points[i].y-graph.y);
	            }
	            */
	            // graph.points=points;
	            graph.spin=0;
	            graph.stroke=lineShade;
	            graph.lineW=(pen*scale);
	            graph.lineStyle=lineType;
	            graph.fill='none';
	            if(len>=scale) addGraph(graph); // avoid zero-size lines
	            id('bluePolyline').setAttribute('points','0,0');
                element=elID=null;
                showSizes(false);
                mode='select';
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
            element=elID=null;
            showSizes(false);
            mode='select';
            break;
        case 'box':
            console.log('finish box');
            var graph={}
	        graph.type='box';
	        graph.x=(x>x0)?x0:x;
	        graph.y=(y>y0)?y0:y;
	        graph.width=Math.abs(x-x0);
	        graph.height=Math.abs(y-y0);
	        graph.radius=rad;
	        graph.spin=0;
	        graph.stroke=lineShade;
	        graph.lineW=pen*scale;
	        graph.lineStyle=lineType;
	        graph.fill=fillShade;
	        graph.opacity=opacity;
	        if((graph.width>=scale)&&(graph.width>=scale)) addGraph(graph); // avoid zero-size boxes
	        /*
	        var request=db.transaction('graphs','readwrite').objectStore('graphs').add(graph);
            request.onsuccess=function(event) {
                graph.id=request.result;
			    console.log("new box element added to database - id: "+graph.id);
			    drawElement(graph);
		    };
		    request.onerror=function(event) {
		        console.log("error adding new box element");
		    };
		    */
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            element=elID=null;
            mode='select';
            break;
        case 'oval':
            var graph={};
	        graph.type='oval';
	        graph.cx=x0;
	        graph.cy=y0;
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
            element=elID=null;
            mode='select';
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
            element=elID=null;
            mode='select';
            break;
        case 'dimStart':
            if(snap) {
                console.log('SNAP - start dimension at '+x+','+y+'; element: '+snap.el+' node '+snap.n);
                dim.x1=x;
                dim.y1=y;
                dim.el1=snap.el;
                dim.n1=snap.n;
                dim.dir=null;
                mode='dimEnd';
                prompt('DIMENSION: tap end node');
            break;
            }
            else prompt('Tap on a node to start dimension')
            break;
        case 'dimEnd':
            if(snap) {
                console.log('SNAP - end dimension at '+x+','+y+'; element: '+snap.el+' node '+snap.n);
                dim.x2=x;
                dim.y2=y;
                dim.el2=snap.el;
                dim.n2=snap.n;
                if(dim.x1==dim.x2) dim.dir='v'; // vertical
                else if(dim.y1==dim.y2) dim.dir='h'; // horizontal
                if(dim.dir) {
                    id('blueDim').setAttribute('x1',dim.x1);
                    id('blueDim').setAttribute('y1',dim.y1);
                    id('blueDim').setAttribute('x2',dim.x2);
                    id('blueDim').setAttribute('y2',dim.y2);
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
                graph.el1=dim.el2;
                graph.n1=dim.n1;
                graph.el2=dim.el1;
                graph.n2=dim.n2;
            }
            else {
                graph.x1=dim.x1;
                graph.y1=dim.y1;
                graph.x2=dim.x2;
                graph.y2=dim.y2;
                graph.el1=dim.el1;
                graph.n1=dim.n1;
                graph.el2=dim.el2;
                graph.n2=dim.n2;
            }
            graph.dir=dim.dir; // direction: h/v/o (horizontal/vertical/oblique)
            graph.offset=dim.offset;
            id('blueDim').setAttribute('x1',0);
            id('blueDim').setAttribute('y1',0);
            id('blueDim').setAttribute('x2',0);
            id('blueDim').setAttribute('y2',0);
            addGraph(graph);
            element=elID=null;
            mode='select';
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
            dy=y0-y1;
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
            mode='select';
            id('handles').innerHTML='';
            element=elID=null;
            break;
        case 'anchor':
            if(snap) {
                console.log('SNAP - place anchor: '+snap);
                var html="<circle id='anchor' cx='"+x+"' cy='"+y+"' r='"+(2*scale)+"' stroke='blue' stroke-width='"+(0.25*scale)+"' fill='gray' fill-opacity='0.5'/>";
                id('blue').innerHTML+=html; // anchor is pseudo-element - put in <blue> layer
                // drawElement(el);
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
            // else cancel();
            // break;
        case 'select':
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            console.log('box size: '+selectionBox.w+'x'+selectionBox.h);
            if((selectionBox.w>20)&&(selectionBox.h>20)) { // significant selection box size
                console.log('GROUP SELECTION - box: '+selectionBox.w+'x'+selectionBox.h+' at '+selectionBox.x+','+selectionBox.y);
                var items=id('dwg').childNodes;
                console.log(items.length+' elements in dwg');
                for(var i=0;i<items.length;i++) { // collect elements entirely within selectionBox
                    console.log('item '+i+': '+items[i].id);
                    var el=id(items[i].id);
                    if(type(el)=='dim') continue; // don't include dimensions
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
                    if(selection.length<2) {
                        console.log('only one selection');
                        elID=selection[0];
                        element=id(elID);
                        setStyle(element);
                    }
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
                        if((el.id!='svg')&&(el.id!='datumSet')) hit=el.id; 
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
                        elID=hit;
                        element=id(elID);
                        setStyle(element); // set style to suit selected element
                        // add node markers, boxes and handles to single selected item
                        id('handles').innerHTML=''; // clear any handles then add handles for selected element 
                        // first draw node markers
                        for(var i=0;i<nodes.length;i++) { // draw tiny circle at each node
                            if(Math.floor(nodes[i].n/10)!=elID) continue;
                            var html="<circle cx='"+nodes[i].x+"' cy='"+nodes[i].y+"' r='"+scale+"' stroke='blue' stroke-width='"+0.25*scale+"' fill='none'/>";
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
                                var html="<circle id='handle0' cx="+points[0].x+" cy="+points[0].y+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>";
                                id('handles').innerHTML+=html; // circle handle moves whole element
                                for(var i=1;i<n;i++) {
                                    html="<rect id='handle"+i+"' x="+(points[i].x-handleR)+" y="+(points[i].y-handleR)+" width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>";
                                    id('handles').innerHTML+=html; // remaining handles move nodes
                                }
                                id('bluePolyline').setAttribute('points',el.getAttribute('points'));
                                showSizes(true,'LINE');
                                if(mode=='shape') prompt('SHAPE');
                                mode='pointEdit';
                                // showDialog('pointDialog',true); // allow point editing
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
                                // draw handles
                                var html="<circle id='handleNW' cx="+x+" cy="+y+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                                id('handles').innerHTML+=html; // top-left circle handle at top-left used to move whole box
                                html="<rect id='handleSE' x='"+(x+w-handleR)+"' y='"+(y+h-handleR)+"' width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                                id('handles').innerHTML+=html; // bottom-right handle adjusts box size keeping aspect ratio
                                setSizes('box',el.getAttribute('spin'),w,h);
                                showSizes(true,(w==h)?'SQUARE':'BOX');
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
                                // draw handles
                                var html="<circle id='handleCentre' cx="+x+" cy="+y+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                                id('handles').innerHTML+=html; // hollow circle handle at centre used to move whole box
                                html="<rect id='handleSize' x="+(x+w/2-handleR)+" y="+(y+h/2-handleR)+" width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                                id('handles').innerHTML+=html; // square handle adjusts ellipse size
                                setSizes('box',el.getAttribute('spin'),w,h);
                                showSizes(true,(w==h)?'CIRCLE':'OVAL');
                                mode='edit';
                                break;
                            case 'arc':
                                var d=el.getAttribute('d');
                                console.log('select arc - d: '+d);
                                getArc(d); // derive arc geometry from d
                                // draw handles
                                var html="<circle id='handleCentre' cx="+arc.cx+" cy="+arc.cy+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                                id('handles').innerHTML+=html; // circle handle at arc centre
                                html="<rect id='handleEnd' x="+(arc.x2-handleR)+" y="+(arc.y2-handleR)+" width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                                id('handles').innerHTML+=html; // square handle at end point
                                var a1=Math.atan((arc.y1-arc.cy)/(arc.x1-arc.cx));
                                if(arc.x1<arc.cx) a1+=Math.PI;
                                var a=Math.atan((arc.y2-arc.cy)/(arc.x2-arc.cx));
                                console.log('end angle: '+a);
                                if(arc.x2<arc.cx) a+=Math.PI;
                                x0=arc.cx; // centre
                                y0=arc.cy;
                                // var r=Math.sqrt()
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
                                // setSizes(false); // size of bounding box
                                // draw handle
                                var html="<circle id='handle' cx="+bounds.x+" cy="+(bounds.y+bounds.height)+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>";
                                id('handles').innerHTML+=html; // circle handle moves whole element
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
                                var html="<rect id='handleDim' x='"+((x1+x2)/2-handleR)+"' y='"+((y1+y2)/2-handleR)+"' width='"+(2*handleR)+"' height='"+(2*handleR)+"' ";
                                html+="transform='"+spin+"' stroke='none' fill='#0000FF88'/>";
                                console.log('handle: '+html);
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
                                s=Number(el.getAttribute('scale'));
                                // draw handle
                                var html="<circle id='handle' cx='"+x+"' cy='"+y+"' r='"+handleR+"' stroke='none' fill='#0000FF88'/>";
                                id('handles').innerHTML=html;
                                setSizes('box',el.getAttribute('spin'),w,h);
                                showSizes(true,'COMBI');
                                mode='edit';
                                break;
                            /* CANNOT SELECT ANCHOR
                            case 'anchor':
                                var html="<circle id='handle' cx='"+el.cx+"' cy='"+el.cy+"' stroke='none' fill='#0000FF88'/>";
                                id('handles').innerHTML+=html;
                                prompt('ANCHOR');
                                mode='edit';
                                break;
                            */
                        };
                    }
                    else { // multiple selection
                        console.log('add '+type(el)+' '+el.id+' to multiple selection');
                        var box=getBounds(el);
                        var html="<rect x='"+box.x+"' y='"+box.y+"' width='"+box.width+"' height='"+box.height+"' ";
                        html+="stroke='none' fill='blue' fill-opacity='0.25' el='"+hit+"'/>";
                        console.log('box html: '+html);
                        id('selection').innerHTML+=html; // blue block for this element
                        if(selection.length<3) {
                            console.log('SECOND SELECTED ITEM');
                            id('handles').innerHTML='';
                            el=id(selection[0]);
                            box=getBounds(el);
                            var html="<rect x='"+box.x+"' y='"+box.y+"' width='"+box.width+"' height='"+box.height+"' ";
                            html+="stroke='none' fill='blue' fill-opacity='0.25' el='"+hit+"'/>";
                            id('selection').innerHTML+=html; // blue block for first element
                        }
                        showSizes(false);
                        setStyle();
                        // SET STYLES TO DEFAULTS
                    }
                    setButtons();
                } // else ignore clicks on items already selected
                showEditTools(true);
            }
            else { // TRY THIS - CLICK ON BACKGROUND CLEARS SELECTION
                cancel();
                /*
                mode='select';
                elID=null;
                selection=[];
                id('handles').innerHTML=''; //remove element handles...
                id('blueBox').setAttribute('width',0); // ...and text bounds
                id('blueBox').setAttribute('height',0);
                console.log('clear selection');
                selection=[];
                selectionBox.w=selectionBox.h=0;
                id('selection').innerHTML='';
                showSizes(false);
                showEditTools(false);
                id('textDialog').style.display='none';
                setStyle(); // set styles to defaults
                */
            }
    }
    event.stopPropagation();
});
// ADJUST ELEMENT SIZES
id('first').addEventListener('change',function() {
    var val=parseInt(id('first').value);
    // console.log('element '+elID+' value changed to '+val);
    element=id(elID);
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
                // console.log('completed polyline - adjust overall width');
                var bounds=element.getBBox();
                w=bounds.width;
                var ratio=val/w;
                var points=element.points;
                for(i=1;i<points.length;i++) { // points[0] is start - not affected
                    points[i].x=points[0].x+(points[i].x-points[0].x)*ratio;
                    console.log('point '+i+' adjusted');
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
            element.setAttribute('width',val);
            updateGraph(elID,['width',val]);
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
    element=id(elID);
    // console.log('element '+element+' type: '+type(element)+' value changed to '+val);
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
                // console.log('completed polyline - adjust overall height');
                var bounds=element.getBBox();
                h=bounds.height;
                var ratio=val/h;
                var points=element.points;
                for(i=1;i<points.length;i++) { // points[0] is start - not affected
                    points[i].y=points[0].y+(points[i].y-points[0].y)*ratio;
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
            // console.log('box height is '+element.getAttribute('height'));
            // console.log('set to '+val);
            var elY=parseInt(element.getAttribute('y'));
            var elH=parseInt(element.getAttribute('height'));
            element.setAttribute('height',val);
            updateGraph(elID,['height',val]);
            refreshNodes(element);
            // console.log('lower handles.y: '+(elY+val-handleR));
            id('handles').innerHTML='';
            mode='select';
            break;
        case 'oval':
            // console.log('change oval height');
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
            /*
            id('handleEnd').setAttribute('x',(arc.x2-handleR));
            id('handleEnd').setAttribute('y',(arc.y2-handleR));
            */
    }
});
id('spin').addEventListener('change',function() {
    var val=parseInt(id('spin').value);
    console.log('set spin to '+val+' degrees');
    /* USE setTransform()
    var ox=0; // element origin
    var oy=0;
    switch(type(element)) { // elements spin around origin
        case 'line':
        case 'shape':
            ox=element.points[0].x;
            oy=element.points[0].y;
            break;
        case 'box':
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
    var t='rotate('+val+','+ox+','+oy+')';
    console.log('transform is: '+t);
    element.setAttribute('transform',t);
    */
    element.setAttribute('spin',val);
    updateGraph(elID,['spin',val]);
    setTransform(element);
    refreshNodes(element); // NEEDED?
});
// UTILITY FUNCTIONS
function id(el) {
	return document.getElementById(el);
}
function initialise() {
    // SET DRAWING ASPECT
    console.log('set up 1:'+scale+' scale '+aspect+' drawing');
    scaleF=25.4*scale/96; // 96px/inch
    // if(units=='mm') {
    // scaleF*=25.4; // ...or 25.4mm
    snapD=5*scale; // ...5mm snap distance...
    handleR=2.5*scale; // ...2.5mm radius handles...
    boxR=5*scale; // ... and 5mm roundbox corners at 1:1 scale
    if(aspect=='landscape') {
        dwg.w=297; // A4 landscape...
        dwg.h=210;
    }
    else {
        dwg.w=210; // ...or portrait
        dwg.h=297;
    }
    id('svg').setAttribute('width',dwg.w+'mm');
    id('svg').setAttribute('height',dwg.h+'mm');
    id('ref').setAttribute('width',dwg.w+'mm');
    id('ref').setAttribute('height',dwg.h+'mm');
    /* }
    else {
        snapD=0.2*scale; // ...0.2in snap distance...
        handleR=0.1*scale; // ...0.1in handle radius...
        boxR=0.25*scale; // ...and 0.25in roundbox corner radius at 1:1 scale
        if(aspect=='landscape') {
            dwg.w=11.7; // A4 landscape...
            dwg.h=8.27;
        }
        else {
            dwg.w=8.27; // ...or portrait
            dwg.h=11.7;
        }
        id('svg').setAttribute('width',dwg.w+'in');
        id('svg').setAttribute('height',dwg.h+'in');
        id('ref').setAttribute('width',dwg.w+'in');
        id('ref').setAttribute('height',dwg.h+'in');
        id('gridUnit').innerHTML='in';
        id('radiusUnit').innerHTML='in';
    }
    */
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
    w=dwg.w*scale; // viewBox is to scale
    h=dwg.h*scale;
    id('svg').setAttribute('viewBox',"0 0 "+w+" "+h);
    id('ref').setAttribute('viewBox',"0 0 "+w+" "+h);
    // draw dashed drawing outline in 'ref' layer
    var html="<rect x='0' y='0' width='"+w+"' height='"+h+"' stroke='gray' fill='none'/>";
    id('ref').innerHTML+=html;
    // scale datum
    // id('datum').setAttribute('r',3*scale);
    id('datumH').setAttribute('stroke-width',0.25*scale);
    id('datumV').setAttribute('stroke-width',0.25*scale);
    html="<rect x='0' y='0' width='"+w+"' height='"+h+"'/>"; // clip to drawing edges
    // console.log('clipPath: '+html);
    id('clipper').innerHTML=html;
    // console.log('drawing scale size: '+w+'x'+h+'mm; scaleF: '+scaleF+'; snapD: '+snapD);
    setLayout();
    id('countH').value=id('countV').value=1;
    // drawOrder();
    mode='select';
}
function setLayout() {
    console.log('set layout to '+hand+' sizes width: '+id('sizes').clientWidth);
    if(hand=='left') { // LH tools and dialogs
        id('swop').setAttribute('href','draftStyleLeft.css');
        id('prompt').style.left=parseInt(id('sizes').style.width)+54+'px';
        id('goofy').checked=false;
    }
    else { // RH tools and dialogs
        id('swop').setAttribute('href','draftStyleRight.css');
        id('prompt').style.left='6px';
        id('goofy').checked=true;
    }
}
function showDialog(dialog,visible) {
    console.log('show dialog '+dialog);
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
function cancel() { // cancel current operation and return to select mode
    mode='select';
    element=elID=null;
    selection=[];
    selectedPoints=[];
    selectionBox.w=selectionBox.h=0;
    id('selection').innerHTML='';
    id('handles').innerHTML=''; //remove element handles...
    id('blueBox').setAttribute('width',0);
    id('blueBox').setAttribute('height',0);
    id('blueOval').setAttribute('rx',0);
    id('blueOval').setAttribute('ry',0);
    id('bluePolyline').setAttribute('points','0,0');
    if(anchor) {
        // id('blue').removeChild(id('anchor'));
        id('anchor').remove();
        anchor=false;
    }
    showSizes(false);
    showEditTools(false);
    id('textDialog').style.display='none';
    setStyle(); // set styles to defaults
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
function getBounds(el) {
    var b=el.getBBox();
    /* 
    if(type(el)=='combi') { // adjust combi bounds for this instance
        console.log('combi - adjust bounds from '+b.x+','+b.y);
        var combi=id(el.getAttribute('href').substr(1));
        console.log('use combi ax:'+combi.getAttribute('ax'));
        b.x-=parseInt(combi.getAttribute('ax'));
        b.y-=parseInt(combi.getAttribute('ay'));
    }
    */
    return b;
}
function prompt(text) {
    console.log('PROMPT '+text);
    id('prompt').innerHTML=text; //display text for 3 secs
    id('prompt').style.display='block';
    setTimeout(function(){id('prompt').style.display='none'},5000);
}
function setStyle(el) {
    if(!el ||(type(el)=='combi')||(type(el)=='dim')) { // no element/combi/dimension - show default styles
        id('lineType').value=lineType;
        id('line').style.borderStyle=lineType;
        id('line').style.borderWidth=pen+'mm';
        id('lineShade').style.backgroundColor=lineShade;
        id('line').style.borderColor=lineShade;
        id('fill').style.backgroundColor=fillShade;
        id('fill').style.opacity=opacity;
        id('opacity').value=opacity;
    }
    else { // show styles for element el
        /*
        var val=el.getAttribute('stroke-dasharray');
        if(!val) {
            id('lineType').value='solid';
            id('line').style.borderStyle='solid';
        }
        else {
            if(parseInt(val)==scaleF) {
                id('lineType').value='dotted';
                id('line').style.borderStyle='dotted';
            }
            else {
                id('lineType').value='dashed';
                id('line').style.borderStyle='dashed';
            }
        }
        */
        val=getLineStyle(el);
        id('lineType').value=val;
        id('line').style.borderStyle=val;
        val=el.getAttribute('stroke-width');
        if(val) id('line').style.borderWidth=(val/scaleF)+'px';
        val=el.getAttribute('stroke');
        if(val) {
            id('lineShade').style.backgroundColor=val;
            id('line').style.borderColor=val;
        }
        val=el.getAttribute('fill');
        if(val=='none') {
            id('fill').style.background='#00000000';
            id('fillShade').style.backgroundColor='white';
            id('opacity').value=0;
        }
        else {
            if(type(element)=='text') {
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
        if(type(element)=='text') {
            val=el.getAttribute('font-size');
            id('textSize').value=val;
            id('textStyle').value='fine';
            val=el.getAttribute('font-style');
            if(val=='italic') id('textStyle').value='italic';
            val=el.getAttribute('font-weight');
            if(val=='bold') id('textStyle').value='bold';
        } 
    }
}
function getLineStyle(el) {
    var lw=parseInt(el.getAttribute('stroke-width'));
    var dash=parseInt(el.getAttribute('stroke-dasharray'));
    if(dash>lw) return 'dashed';
    else if(dash==lw) return'dotted';
    else return 'solid';
}
function setLineStyle(g) {
    if(g.lineStyle=='dashed') return (4*g.lineW)+" "+(4*g.lineW);
    else if(g.lineStyle=='dotted') return g.lineW+" "+g.lineW;
    // else return null;
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
    var set='';
    for(i=0;i<active.length;i++) set+=active[i]+' ';
    // console.log(active.length+' edit tools active: '+set);
    var n=id('editTools').childNodes.length;
    for(var i=0;i<n;i++) {
        var btn=id('editTools').childNodes[i];
        // console.log(i+' '+btn.id+': '+(active.indexOf(i)>=0));
        id('editTools').childNodes[i].disabled=(active.indexOf(i)<0);
    }
    /* old code
    id('addButton').disabled=(n>1);
    id('forwardButton').disabled=(n>1);
    id('backButton').disabled=(n>1);
    id('doubleButton').disabled=(n>1);
    id('repeatButton').disabled=(n>1);
    id('filletButton').disabled=(n>1);
    id('alignButton').disabled=(n<2);
    id('combineButton').disabled=(n<2);
    if(n<2) {
        var t=type(id(selection[0]));
        console.log('selected element is '+t);
        if((t!='line')&&(t!='shape')) id('addButton').disabled=true;
        id('filletButton').disabled=(t!='box');
    }
    */
}
function showSizes(visible,promptText) {
    id('sizes').style.display=(visible)?'block':'none';
    if(visible) prompt(promptText);
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
    if((!spin)||(spin==0)) {
        id('sizes').style.height='32px';
        id('spinPanel').style.display='none';
    }
    else { // spin
        id('spin').value=spin;
        id('sizes').style.height='72px';
        id('spinPanel').style.display='block';
        console.log('show spin');
    }
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
function drawOrder() { // saves drawing order
    var items=id('dwg').childNodes;
    var order=[];
    for(var i=0;i<items.length;i++) {
        order.push(Number(items[i].getAttribute('id'))); // element.ids in stacking order
        console.log('order item '+i+': '+order[i]);
    }
    window.localStorage.setItem('order',order);
    return order;
}
function remove(elID,keepNodes) {
    console.log('remove element '+elID);
    var el=id(elID);
    var request=db.transaction('graphs','readwrite').objectStore('graphs').delete(Number(elID));
	request.onsuccess=function(event) {
	    console.log('graph '+elID+' deleted from database');
	    if(keepNodes) return;
	    var n=nodes.length;
        for(var i=0;i<nodes.length;i++) { // remove element's snap nodes
            if(Math.nodes[i].el==elID) nodes.splice(i,1);
        }
        console.log((n-nodes.length)+' nodes deleted');
	    id('dwg').removeChild(el); // remove element from SVG
	}
	request.onerror=function(event) {
	    console.log("error deleting element "+el.id);
	};
}
function move(el,dx,dy) {
    switch(type(el)) {
        case 'line':
        case 'shape':
            console.log('move all points by '+dx+','+dy);
            for(var i=0;i<el.points.length;i++) {
                el.points[i].x+=dx;
                el.points[i].y+=dy;
            }
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
        case 'text':
            x=parseInt(el.getAttribute('x'));
            y=parseInt(el.getAttribute('y'));
            break;
        case 'oval':
        case 'arc':
            x=parseInt(el.getAttribute('cx'));
            y=parseInt(el.getAttribute('cy'));
            break;
        case 'combi':
            // s=parseInt(el.getAttribute('scale'));
            x=parseInt(el.getAttribute('x'));
            y=parseInt(el.getAttribute('y'));
            // if(combi.nts>0) s=scale; // NTS combis
            
    }
    var t='';
    if(flip) {
        var hor=flip&1;
        var ver=flip&2;
        t='translate('+(hor*x*2)+','+(ver*y)+') ';
        t+='scale('+((hor>0)? -1:1)+','+((ver>0)? -1:1)+')';
    }
    if(spin!=0) t+='rotate('+spin+','+x+','+y+')';
    // if(type(el)=='combi') el.firstChild.setAttribute('transform',t); // transform applies to <g>
    // else 
    el.setAttribute('transform',t);
    refreshNodes(el); 
}
function refreshNodes(el) {
    // recalculate node.x, node.y after change to element
    console.log('check nodes for el '+el.id);
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
            x=Number(el.getAttribute('x'));
            y=Number(el.getAttribute('y'));
            w=Number(el.getAttribute('width'));
            h=Number(el.getAttribute('height'));
            var a=Number(el.getAttribute('spin'));
            a*=Math.PI/180;
            var c=Math.cos(a);
            var s=Math.sin(a);
            console.log(' spin: '+a+' radians cos: '+c+' sine: '+s);
            elNodes[0].x=x; // top/left
            elNodes[0].y=y;
            elNodes[1].x=(x+w*c); // top/right
            elNodes[1].y=(y+h*s);
            elNodes[2].x=(x+w*c-h*s); // bottom/right
            elNodes[2].y=(y+w*s+h*c);
            elNodes[3].x=(x-h*s); // bottom/left
            elNodes[3].y=(y+h*c);
            elNodes[4].x=(x+w*c/2-h*s/2); // centre
            elNodes[4].y=(y+w*s/2+h*c/2);
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
            elNodes[1].x=(x+ry*s); // top
            elNodes[1].y=(y-ry*c);
            elNodes[2].x=(x+rx*c); // right
            elNodes[2].y=(y+rx*s);
            elNodes[3].x=(x-ry*s); // bottom
            elNodes[3].y=(y+ry*c);
            elNodes[4].x=(x-rx*c); // left
            elNodes[4].y=(y-rx*s);
            break;
        case 'arc':
            var d=el.getAttribute('d');
            console.log('arc path: '+d);
            // var arc=getArc(d); SHOULD ALREADY HAVE arc
            // APPLY SPIN?
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
function checkDims(el) {
    console.log('check linked dimensions for element '+el.id);
    for(var i=0;i<dims.length;i++) {
        if((dims[i].el1==el.id)||(dims[i].el2==el.id)) {
            refreshDim(dims[i]); // adjust and redraw linked dimension
        }
    }
}
function refreshDim(d) {
    console.log('refresh dimension '+d.dim+' from element '+d.el1+'/node '+d.n1+' to element '+d.el2+'/node '+d.n2);
    var node1=nodes.find(function(node) {
        return (node.n==Number(d.el1*10+d.n1));
        // return ((node.el==d.el1)&&(node.n==d.n1));
    });
    console.log('start node: '+node1);
    var node2=nodes.find(function(node) {
        return (node.n==Number(d.el2*10+d.n2));
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
function snapCheck() {
    var nearX=[];
    var nearY=[];
    var nearN=[];
    var snap='';
    var node=null;
    var min=0;
    for(var i=0;i<nodes.length;i++) {
        if(Math.abs(nodes[i].x-x)<snapD) nearX.push(nodes[i].n); // nodes close to x
        if(Math.abs(nodes[i].y-y)<snapD) nearY.push(nodes[i].n); // nodes close to y
    }
    for(i=0;i<nearX.length;i++) {
        if(nearY.indexOf(nearX[i].n)>=0) nearN.push(nearX[i].n); // nodes close to x,y
    }
    if(nearN.length>0) {
        min=snapD*2;
        for(i=0;i<nearN.length;i++) {
            node=nodes.find(function(node) {
                return (node.n==nearN[i]);
            });
            var d=Math.abs(node.x-x)+Math.abs(node.y-y);
            if(d<min) {
                min=d;
                snap={'x':node.x,'y':node.y,'n':node.n};
                datum.x=node.x;
                datum.y=node.y;
            }
        }
    }
    else { // if no nodes within snap distance...
        min=snapD*2;
        for(i=0;i<nearX.length;i++) { // ...set datumX to nearest node.x...
            node=nodes.find(function(node) {
                return (node.n==nearX[i]);
            });
            if(Math.abs(node.x-x)<min) {
                min=Math.abs(node.x-x);
                datum.x=node.x;
                snap='datumX';
            }
        }
        if((gridSnap>0)&&(nearX.length<1)) { // ...or snap datumX to grid
            x=Math.round(x/gridSize)*gridSize;
            snap='gridX';
        }
        for(i=0;i<nearY.length;i++) { // ...set datumY to nearest node.y...
            node=nodes.find(function(node) {
                return (node.n==nearY[i]);
            });
            if(Math.abs(node.y-y)<min) {
                min=Math.abs(node.y-y);
                datum.y=node.y;
                if(snap) snap+=' datumY';
                else snap='datumY';
            }
        }
        if((gridSnap>0)&&(nearY.length<1)) { // ...or snap datumY to grid
            y=Math.round(y/gridSize)*gridSize;
            if(snap) snap+=' gridY';
            else snap='gridY';
        }
    }
    if(snap.includes('datumX')) {
        x=datum.x;
        id('datumV').setAttribute('x1',datum.x);
        id('datumV').setAttribute('x2',datum.x);
    }
    if(snap.includes('datumY')) {
        y=datum.y;
        id('datumH').setAttribute('y1',datum.y);
        id('datumH').setAttribute('y2',datum.y);
    }
    return snap;
    /*
    var snap='';
    if(gridSnap>0) {
        x=Math.round(x/gridSize)*gridSize;
        y=Math.round(y/gridSize)*gridSize;
        // console.log('SNAP TO GRID AT '+x+','+y);
        return 'grid';
    }
    var nearNodes=[];
    for(var i=0;i<nodes.length;i++) {
        var near=false;
        if(Math.abs(nodes[i].x-x)<snapD) {
            x=datum.x=nodes[i].x;
            id('datumV').setAttribute('x1',datum.x);
            id('datumV').setAttribute('x2',datum.x);
            near=true;
            snap='datumX ';
            // console.log('set datum.x to '+datum.x);
        }
        if(Math.abs(nodes[i].y-y)<snapD) {
            y=datum.y=nodes[i].y;
            id('datumH').setAttribute('y1',datum.y);
            id('datumH').setAttribute('y2',datum.y);
            if(snap.startsWith('datumX')) snap+=',datumY';
            else snap='datumY';
            // console.log('set datum.y to '+datum.y);
            if(near) nearNodes.push(nodes[i]); // SIMPLE VERSION... return {'el':nodes[i].el,'n':nodes[i].n};
        }
    }
    if(nearNodes.length>0) {
        console.log(nearNodes.length+' near nodes to check');
        var d=0;
        var min=2*snapD;
        // var nearest=null;
        for(i=0;i<nearNodes.length;i++) {
            d=Math.abs(nearNodes[i].x-x)+Math.abs(nearNodes[i].y-y);
            console.log('d: '+d+'; min: '+min);
            if(d<min) {
                min=d;
                snap={'el':nodes[i].el,'n':nodes[i].n};
            }
        }
    }
    return snap;
    */
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
function addGraph(el) {
    console.log('add '+el.type+' element - spin: '+el.spin);
    var request=db.transaction('graphs','readwrite').objectStore('graphs').add(el);
    request.onsuccess=function(event) {
        // console.log('result: '+event.target.result);
        el.id=event.target.result;
        console.log('graph added - id: '+el.id+' - draw');
        // drawElement(el);
        id('dwg').appendChild(makeElement(el));
        drawOrder();
    }
    request.onerror=function(event) {
        console.log('add copy failed');
    }
}
/* NO LONGER USED
function drawElement(el,index) {
    console.log('draw '+el.type+' element '+el.id+' at index '+index);
    switch(el.type) {
        case 'line':
            var html="<polyline id='"+el.id+"' points='"+el.points+"' spin='"+el.spin+"' ";
            // if(el.spin!=0) html+="transform='rotate("+el.spin+","+el.points[0].x+","+el.points[0].y+")' ";
			html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
			var dash=setLineStyle(el);
            if(dash) html+=" stroke-dasharray='"+dash+"' ";
			html+="fill='none'/>";
			console.log('line html: '+html);
			if(el.stroke=='blue') id('ref').innerHTML+=html;
			else id('dwg').innerHTML+=html;
			var spin=el.spin;
			el=id(el.id); // get nodes from draw polyline
			console.log('el '+el.id+' points: '+el.points);
			for(var i=0;i<el.points.length;i++) { // IF HAS SPIN - USE refreshNodes()?
                nodes.push({'x':el.points[i].x,'y':el.points[i].y,'el':el.id,'n':i});
            }
			if(spin!=0) setTransform(el); // apply spin
            break;
        case 'shape':
            var html="<polygon id='"+el.id+"' points='"+el.points+"' spin='"+el.spin+"' ";
            // if(el.spin!=0) html+="transform='rotate("+el.spin+","+el.points[0].x+","+el.points[0].y+")' ";
            html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
            var dash=setLineStyle(el);
            if(dash) html+=" stroke-dasharray='"+dash+"' "; // +setLineStyle(el);
			html+="fill='"+el.fill;
			if(el.opacity<1) html+="' fill-opacity='"+el.opacity;
			html+="'/>";
			console.log('shape html: '+html);
			if(el.stroke=='blue') id('ref').innerHTML+=html;
			else id('dwg').innerHTML+=html;
			var spin=el.spin;
			el=id(el.id); // get nodes from element points
			console.log('el '+el.id+' points: '+el.points);
			for(var i=0;i<el.points.length;i++) { // IF HAS SPIN - USE refreshNodes()?
                nodes.push({'x':el.points[i].x,'y':el.points[i].y,'el':el.id,'n':i});
            }
			if(spin!=0) setTransform(el); // apply spin
            break;
        case 'box':
            console.log('draw box '+el.id+' at '+el.x+','+el.y);
            var html="<rect id='"+el.id+"' x='"+el.x+"' y='"+el.y+"' width='"+el.width+"' height='"+el.height+"' rx='"+el.radius+"' spin='"+el.spin+"' ";
            // if(el.spin!=0) html+="transform='rotate("+el.spin+","+el.x+","+el.y+")' ";
            html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' "
            var dash=setLineStyle(el);
            if(dash) html+=" stroke-dasharray='"+dash+"' ";
            html+="fill='"+el.fill+"'";
            if(el.opacity<1) html+=" fill-opacity='"+el.opacity+"'";
            html+="/>";
            console.log('box svg: '+html);
            if(el.stroke=='blue') id('ref').innerHTML+=html; // blue boxes go in <ref> layer
            else id('dwg').innerHTML+=html;
            // add nodes
            x=parseInt(el.x); // ALL THIS COULD BE IN refreshNodes() CALLED AFTER setTransform()?
            y=parseInt(el.y);
            w=parseInt(el.width);
            h=parseInt(el.height);
            var a=el.spin*Math.PI/180; // JUST ADD NODES FOR NOW refreshNodes() CAN ADJUST FOR SPIN
            var c=Math.cos(a);
            var s=Math.sin(a);
            console.log('top/left: '+x+','+y+' size: '+w+'x'+h+' spin: '+a+' radians cos: '+c+' sine: '+s);
            nodes.push({'x':x,'y':y,'el':el.id,'n':0}); // top/left - node 0
            nodes.push({'x':Number(x+w*c),'y':Number(y+w*s),'el':el.id,'n':1}); // top/right - node 1
            nodes.push({'x':Number(x+w*c-h*s),'y':Number(y+w*s+h*c),'el':el.id,'n':2}); // bottom/right - node 2
            nodes.push({'x':Number(x-h*s),'y':Number(y+h*c),'el':el.id,'n':3}); // bottom/left - node 3
            nodes.push({'x':Number(x+w*c/2-h*s/2),'y':Number(y+w*s/2+h*c/2),'el':el.id,'n':4}); // centre - node 4 
            if(el.spin!=0) {  // apply spin
                el=id(el.id);
                setTransform(el);
            }
            break;
        case 'oval':
            var html="<ellipse id='"+el.id+"' cx='"+el.cx+"' cy='"+el.cy+"' rx='"+el.rx+"' ry='"+el.ry+"' spin='"+el.spin+"' ";
            // if(el.spin!=0) html+="transform='rotate("+el.spin+","+el.cx+","+el.cy+")' ";
            html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
            var dash=setLineStyle(el);
            if(dash) html+=" stroke-dasharray='"+dash+"' ";
            html+=" fill='"+el.fill;
            if(el.opacity<1) html+="' fill-opacity='"+el.opacity;
            html+="'/>";
            console.log('oval svg: '+html);
            if(el.stroke=='blue') id('ref').innerHTML+=html;
            else id('dwg').innerHTML+=html;
            // add nodes
            nodes.push({'x':el.cx,'y':el.cy,'el':el.id,'n':0}); // centre (node 0) then clockwise from...
            nodes.push({'x':el.cx,'y':el.cy-el.ry,'el':el.id,'n':1}); // ...top - node 1
            nodes.push({'x':Number(el.cx)+Number(el.rx),'y':el.cy,'el':el.id,'n':2}); // right - node 2
            nodes.push({'x':el.cx,'y':Number(el.cy)+Number(el.ry),'el':el.id,'n':3}); // bottom - node 3
            nodes.push({'x':el.cx-el.rx,'y':el.cy,'el':el.id,'n':4}); // left - node 4
            // console.log('oval nodes added');
            if(el.spin!=0) { // apply spin
                el=id(el.id);
                setTransform(el);
            }
            break;
        case 'arc':
            console.log('DRAW ARC');
            var html="<path id='"+el.id+"' d='M"+el.cx+","+el.cy+" M"+el.x1+","+el.y1+" A"+el.r+","+el.r+" 0 "+el.major+","+el.sweep+" "+el.x2+","+el.y2+"' spin='"+el.spin+"' ";
            // if(el.spin!=0) html+="transform='rotate("+el.spin+","+el.cx+","+el.cy+")' ";
            html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
            var dash=setLineStyle(el);
            if(dash) html+=" stroke-dasharray='"+dash+"' ";
            html+="fill='"+el.fill+"'";
            if(el.opacity<1) html+=" fill-opacity='"+el.opacity+"'";
            html+="/>";
            console.log('arc svg: '+html);
            if(el.stroke=='blue') id('ref').innerHTML+=html; // blue boxes go in <ref> layer
            else id('dwg').innerHTML+=html;
            // create nodes for arc start, centre & end points USE refreshNodes()? AND ALLOW FOR SPIN
            nodes.push({'x':el.cx,'y':el.cy,'el':el.id,'n':0}); // centre - node 0
            nodes.push({'x':el.x1,'y':el.y1,'el':el.id,'n':1}); // start - node 1
            nodes.push({'x':el.x2,'y':el.y2,'el':el.id,'n':2}); // end - node 2
            if(el.spin!=0) { // apply spin
                el=id(el.id);
                setTransform(el);
            }
            break;
        case 'text':
            var html="<text id='"+el.id+"' x='"+el.x+"' y='"+el.y+"' spin='"+el.spin+"' flip='"+el.flip+"' ";
            html+="font-size='"+(el.textSize*scale)+"' ";
            if(el.textStyle=='bold') html+="font-weight='bold' ";
            else if(el.textStyle=='italic') html+="font-style='italic' ";
            html+="stroke='none' fill='"+el.fill+"'>"+el.text+"</text>";
            console.log('text html: '+html);
            if(el.fill=='blue') id('ref').innerHTML+=html;
            else id('dwg').innerHTML+=html;
            id('textDialog').style.display='none';
            if((el.spin!=0)||(el.flip!=0)) { // apply spin/flip
                el=id(el.id);
                setTransform(el);
            }
            break;
        case 'dim':
            dx=Math.round(el.x2-el.x1);
            dy=Math.round(el.y2-el.y1);
            var d=0; // dimension length
            var a=0; // dimension angle
            if(el.dir=='h') {
                    d=dx;
                    a=0;
                }
            else if(el.dir=='v') {
                    d=dy;
                    a=Math.PI/2;
                }
            else {
                d=Math.round(Math.sqrt(dx*dx+dy*dy));
                a=Math.atan(dy/dx); // oblique dimension - angle in radians
            }
            console.log('dimension length: '+d+'; angle: '+a+' rad; elements: '+el.el1+' '+el.el2);                var x1=el.x1; // start point/anchor of dimension line
            var y1=el.y1;
            var o=parseInt(el.offset);
            if(a==0) y1+=o;
            else if(a==Math.PI/2) x1+=o;
            else {
                x1-=o*Math.sin(a);
                y1+=o*Math.cos(a);
            }
            a*=180/Math.PI; // angle in degrees
            var html="<g id='"+el.id+"' transform='rotate("+a+","+x1+","+y1+")'>"
            // draw dimension line and text horizontally then rotate to angle a;
            html+="<line x1='"+x1+"' y1='"+y1+"' x2='"+(x1+d)+"' y2='"+y1+"' ";
            html+="marker-start='url(#startArrow)' marker-end='url(#endArrow)' ";
            html+="stroke='gray' stroke-width='"+(0.25*scale)+"' fill='none'/>"
            html+="<text x='"+(x1+d/2)+"' y='"+(y1-scale)+"' style='text-anchor: middle; font-size:"+(4*scale)+"; stroke:none; fill:gray'>"+Math.abs(d)+"</text>";
            html+="</g>";
            console.log('dimension html: '+html);
            id('dwg').innerHTML+=html;
            var dim={}; // no nodes for dimensions but add to dims array
            dim.dim=el.id;
            dim.el1=el.el1;
            dim.n1=el.n1;
            dim.el2=el.el2;
            dim.n2=el.n2;
            console.log('add link - dim. '+dim.dim+' el/nodes: '+dim.el1+'/'+dim.n1+','+dim.el2+'/'+dim.n2);
            dims.push(dim);
            console.log('links added for dimension '+el.id);
            for(var i=0;i<dims.length;i++) console.log('link '+i+': dim:'+dims[i].dim+' el/nodes: '+dims[i].el1+'/'+dims[i].n1+','+dims[i].el2+'/'+dims[i].n2);
            break;
        case 'combi':
            var html="<use id='"+el.id+"' href='#"+el.name+"' x='"+el.x+"' y='"+el.y+"' flip='"+el.flip+"' spin='"+el.spin+"'/>";
            console.log('combi html: '+html);
            id('dwg').innerHTML+=html;
            nodes.push({'x':(el.x),'y':(el.y),'el':el.id});
            el=id(el.id);
            setTransform(el);
            console.log("DONE");
            break;
        case 'anchor':
            console.log('draw anchor at '+el.cx+','+el.cy);
            var html="<circle id='"+el.id+"' cx='"+el.cx+"' cy='"+el.cy+"' r='"+(2*scale)+"' ";
            html+="stroke='blue' stroke-width='"+(0.25*scale)+"' fill='gray' fill-opacity='0.5'/>";
            console.log('anchor html: '+html);
            id('blue').innerHTML+=html; // anchor is pseudo-element - put in <blue> layer
            console.log('anchor drawn');
            break;
    }
};
*/
function saveSVG() {
    id('datumSet').style.display='none';
    var fileName=id('printName').value+'.svg';
    var svg=id('drawing').innerHTML;
    download(svg,fileName,'data:image/svg+xml');
    /*
	console.log("save as "+fileName);
	var blob=new Blob([svg], {type:"data:image/svg+xml"});
	var a =document.createElement('a');
	a.style.display='none';
	var url = window.URL.createObjectURL(blob);
	a.href= url;
	a.download=fileName;
	document.body.appendChild(a);
	a.click();
	alert(fileName+" saved to downloads folder");
	*/
	id('datumGroup').style.display='block';
}
function download(content,fileName,contentType) {
	console.log("save as "+fileName);
	// a.style.display='none';
	var a=document.createElement('a');
	var file=new Blob([content], {type:contentType});
	a.href=URL.createObjectURL(file);
	a.download=fileName;
	// document.body.appendChild(a);
	a.click();
	alert('file '+fileName+" saved to downloads folder");
}
function load() {
    var order=window.localStorage.getItem('order').split(',');
    console.log('order has '+order.length+' items');
    var elements=[];
    var request=db.transaction('graphs').objectStore('graphs').openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if(cursor) {
            var graph=cursor.value;
            console.log('load '+graph.type+' id: '+graph.id);
            var index=order.indexOf(String(graph.id));
            console.log('order index: '+index);
            var el=makeElement(graph);
            if(index<0) id('dwg').appendChild(el);
            else if(index>=0) elements[index]=el;
            else id('ref').appendChild(el);
	    	cursor.continue();  
        }
	    else {
		    console.log("No more entries - "+elements.length+' nodes');
		    for(var i=0;i<elements.length;i++) {
		        id('dwg').appendChild(elements[i]);
		    }
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
            el.setAttribute('fill','none');
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
            nodes.push({'x':g.x,'y':g.y,'n':(g.id*10)}); // top/left - node 0
            nodes.push({'x':(Number(g.x)+Number(g.width)),'y':g.y,'n':Number(g.id*10+1)}); // top/right - node 1
            nodes.push({'x':(Number(g.x)+Number(g.width)),'y':(Number(g.y)+Number(g.height)),'n':Number(g.id*10+2)}); // bottom/right - node 2
            nodes.push({'x':g.x,'y':(Number(g.y)+Number(g.height)),'n':Number(g.id*10+3)}); // bottom/left - node 3
            nodes.push({'x':(Number(g.x)+Number(g.width/2)),'y':(Number(g.y)+Number(g.height/2)),'n':Number(g.id*10+4)}); // centre - node 4
            if(g.spin!=0) {  // apply spin MAY NOT WORK!!!
                el=id(el.id);
                setTransform(el);
            }
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
            nodes.push({'x':g.cx,'y':g.cy,'n':(g.id*10)}); // centre (node 0) then clockwise from...
            nodes.push({'x':g.cx,'y':(g.cy-g.ry),'n':Number(g.id*10+1)}); // ...top - node 1
            nodes.push({'x':Number(g.cx)+Number(g.rx),'y':g.cy,'n':Number(g.id*10+2)}); // right - node 2
            nodes.push({'x':g.cx,'y':Number(g.cy)+Number(g.ry),'n':Number(g.id*10+3)}); // bottom - node 3
            nodes.push({'x':(g.cx-g.rx),'y':g.cy,'n':Number(g.id*10+4)}); // left - node 4
            // console.log('oval nodes added');
            if(g.spin!=0) { // apply spin MAY NOT WORK!!!
                el=id(el.id);
                setTransform(el);
            }
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
            if(g.spin!=0) { // apply spin MAY NOT WORK!!!
                el=id(el.id);
                setTransform(el);
            }
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
            if((g.spin!=0)||(g.flip!=0)) { // apply spin/flip MAY NOT WORK!!!
                el=id(el.id);
                setTransform(el);
            }
            break;
        case 'dim':
            dx=Math.round(g.x2-g.x1);
            dy=Math.round(g.y2-g.y1);
            var d=0; // dimension length
            var a=0; // dimension angle
            if(g.dir=='h') {
                    d=dx;
                    a=0;
                }
            else if(g.dir=='v') {
                    d=dy;
                    a=Math.PI/2;
                }
            else {
                d=Math.round(Math.sqrt(dx*dx+dy*dy));
                a=Math.atan(dy/dx); // oblique dimension - angle in radians
            }
            console.log('dimension length: '+d+'; angle: '+a+' rad; elements: '+g.el1+' '+g.el2);
            var x1=g.x1; // start point/anchor of dimension line
            var y1=g.y1;
            var o=parseInt(g.offset);
            if(a==0) y1+=o;
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
            dim.setAttribute('x2',Number(x1+d));
            dim.setAttribute('y2',y1);
            dim.setAttribute('marker-start','url(#startArrow)');
            dim.setAttribute('marker-end','url(#endArrow)');
            dim.setAttribute('stroke','gray');
            dim.setAttribute('stroke-width',(0.25*scale));
            dim.setAttribute('fill','none');
            el.appendChild(dim);
            dim=document.createElementNS(ns,'text');
            dim.setAttribute('x',(x1+d/2));
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
            dim.el1=g.el1;
            dim.n1=g.n1;
            dim.el2=g.el2;
            dim.n2=g.n2;
            console.log('add link - dim. '+dim.dim+' el/nodes: '+dim.el1+'/'+dim.n1+','+dim.el2+'/'+dim.n2);
            dims.push(dim);
            console.log('links added for dimension '+g.id);
            for(var i=0;i<dims.length;i++) console.log('link '+i+': dim:'+dims[i].dim+' el/nodes: '+dims[i].el1+'/'+dims[i].n1+','+dims[i].el2+'/'+dims[i].n2);
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
            if((g.spin!=0)||(g.flip!=0)) setTransform(el); // MAY NOT WORK
            break;
    }
    return el;
}
// START-UP CODE
var request=window.indexedDB.open("draftDB",dbVersion);
request.onsuccess=function(event) {
    db=event.target.result;
    nodes=[];
    load();
};
request.onupgradeneeded=function(event) {
    var db=event.target.result;
    // TEMPORARY TO SWITCH combis KEY FROM id TO name
    // db.deleteObjectStore('combis');
    if (!db.objectStoreNames.contains('graphs')) {
        var graphs=db.createObjectStore('graphs',{keyPath:'id',autoIncrement:true});
    }
    if (!db.objectStoreNames.contains('combis')) {
        var combis=db.createObjectStore("combis",{keyPath:'name'});
    }
	// var dbObjectStore=event.currentTarget.result.createObjectStore("elements",{ keyPath:'id',autoIncrement:true });
	// console.log("new elements ObjectStore created");
	// dbObjectStore=event.currentTarget.result.createObjectStore("combis",{ keyPath:'id',autoIncrement:true });
	// console.log("new combis ObjectStore created");
};
request.onerror=function(event) {
	alert("indexedDB error");
};
// SERVICE WORKER
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
}
else { //Register the ServiceWorker
	navigator.serviceWorker.register('draftSW.js').then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}  