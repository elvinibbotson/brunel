// GLOBAL VARIABLES
var saved=false; // flags whether drawing has been saved
var aspect=null;
var scale=1; // default scale is 1:1
var units='mm'; // default unit is mm
var scaleF=3.78; // default scale factor for mm (1:1 scale)
var handleR=2; // 2mm handle radius at 1:1 scale - increase for smaller scales (eg. 100 at 1:50)
var boxR=5; // radius for corners of round-cornered boxes
var rad=0; // ditto for current box
var snapD=5*scale; // 5mm snap distance at 1:1 scale - increase for smaller scales (eg. 250 at 1:50)
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
var datumX=0;
var datumY=0;
var arc={};
var elID=0;
var selectionBox={}; // for box select
var selection=[]; // list of elements in selectionBox
var timer=null;
var db=null; // indexed database holding SVG elements
var nodes=[]; // array of nodes each with x,y coordinates and element ID
var node=null;
var element=null; // current element
var elementID=null; // id of current element 
var combi=null; // current combi
var combiID=null; // id of current combi
// var combis=[]; // holds dimensions for combis to aid selection
var lineType='solid'; // default styles
var lineShade='black';
var pen=0.25; // 0.25mm at 1:1 scale - increase for smaller scales (eg.12.5 at 1:50 scale)
var fillShade='none';
var opacity='1';
var textSize=5; // default text size
var textStyle='fine'; // normal text
var currentDialog=null;

scr.w=screen.width;
scr.h=screen.height;
dwg.x=dwg.y=0;
console.log("screen size "+scr.w+"x"+scr.h);
aspect=window.localStorage.getItem('aspect');
scale=window.localStorage.getItem('scale');
units=window.localStorage.getItem('units');
if(!aspect) {
    aspect=(scr.w>scr.h)?'landscape':'portrait';
    id('aspect').innerHTML=aspect;
    showDialog('newDrawing',true);
}
else initialise();

// TOOLS
// file
id('fileButton').addEventListener('click',function() { // SHOULD SHOW FILE MENU BUT FOR NOW...
    showDialog('fileMenu',true);
});
id('new').addEventListener('click',function() {
    if(!saved) alert('You may want to save your work before starting a new drawing');
    report("show New Drawing dialog");
    // showDialog('fileMenu',false);
    aspect=(scr.w>scr.h)?'landscape':'portrait';
    id('aspect').innerHTML=aspect;
    showDialog('newDrawingDialog',true);
});
id('cancelNewDrawing').addEventListener('click',function() {
    showDialog('newDrawing',false);
});
id('createNewDrawing').addEventListener('click',function() {
    scale=id('scaleSelect').value;
    units=(id('mm').checked)?'mm':'in';
    console.log('create new drawing - aspect:'+aspect+' scale:'+scale+' units:'+units);
    window.localStorage.setItem('aspect',aspect);
    window.localStorage.setItem('scale',scale);
    window.localStorage.setItem('units',units);
    elID=0;
    // CLEAR DRAWING IN HTML & DATABASE
    id('dwg').innerHTML=''; // clear drawing
    id('ref').innerHTML=''; // clear reference layer
    id('handles').innerHTML=''; // clear any edit handles
    // NB any symbols will remain in <defs>
    var dbTransaction=db.transaction('elements',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('elements');
	console.log("indexedDB objectStore ready");
    var request=dbObjectStore.clear(); // clear database
	request.onsuccess=function(event) {
		console.log("database cleared");
	};
	request.onerror=function(event) {
		console.log("error clearing database");
	};
    showDialog('newDrawing',false);
    initialise();
});
id('loadCombi').addEventListener('click',function() {
    // USE FILE NAVIGATOR TO FIND JSON FILE AND IMPORT TO combis DATABASE
    showDialog('fileMenu',false);
    showDialog('loadCombiDialog',true);
});
id("combiChooser").addEventListener('change', function() {
	var file=id('combiChooser').files[0];
	console.log("file: "+file+" name: "+file.name);
	var fileReader=new FileReader();
	fileReader.addEventListener('load', function(evt) {
		console.log("file read: "+evt.target.result);
	  	var data=evt.target.result;
		var json=JSON.parse(data);
		console.log("json: "+json);
		var combis=json.combis;
		console.log(combis.length+" combis loaded");
		var dbTransaction=db.transaction('combis',"readwrite");
		var dbObjectStore=dbTransaction.objectStore('combis');
		for(var i=0;i<combis.length;i++) {
		    // combis[i].id=i;
		    var name=combis[i].name;
			console.log("add "+name);
			var request=dbObjectStore.add(combis[i]);
			request.onsuccess=function(e) {
			    var n=request.result;
				console.log("combi "+i+" added to database - id: "+id);
				var html="<option value='"+n+"'>"+name+"</option>";
				id('combiList').innerHTML+=html;
			};
			request.onerror=function(e) {console.log("error adding combis");};
		}
		// id('importDialog').style.display='none';
		showDialog('loadCombiDialog',false);
		// alert("combi(s) imported - restart");
  	});
  	fileReader.readAsText(file);
});
id('print').addEventListener('click',function() {
    showDialog('fileMenu',false);
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
id('settings').addEventListener('click',function() {
    showDialog('settingsDialog',true);
});
id('grid').addEventListener('change',function() {
    // TOGGLE SNAP GRID
});
id('gridSize').addEventListener('change',function() {
    // SET SIZE OF SNAP GRID
});
id('boxRadius').addEventListener('change',function() {
    boxR=event.target.value*scale;
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
    // reset snap distance and handle radius
    if(units=='mm') {
        snapD=5*scale;
        handleR=2.5*scale;
    }
    else { // inches
        snapD=0.2*scale;
        handleR=0.1*scale;
    }
});
id('panButton').addEventListener('click',function() {
    // console.log('pan mode');
    mode='pan';
    prompt('PAN');
});
console.log('zoom; '+zoom+' w: '+w+' h: '+h);
// DRAWING TOOLS
id('lineButton').addEventListener('click', function() {
    mode='line';
    showSizes(true,'LINE: press at start');
});
id('boxButton').addEventListener('click',function() {
    mode='box';
    rad=0;
    showSizes(true,'BOX: press at start');
});
id('squircleButton').addEventListener('click',function() {
    mode='box';
    rad=boxR;
    showSizes(true,'BOX: press at start');
});
id('ovalButton').addEventListener('click',function() { // OVAL/CIRCLE
    mode='oval';
    showSizes(true,'OVAL: press at centre');
})
id('arcButton').addEventListener('click', function() {
   mode='arc';
   showSizes(true,'ARC: press at start');
});
id('textButton').addEventListener('click',function() {
    mode='text';
    prompt('TEXT: press at start');
});
id('text').addEventListener('change',function() {
    var text=event.target.value;
    if(elementID) { // change selected text
        element=id(elementID);
        element.innerHTML=text;
        updateElement(elementID,'text',text);
    }
    else {
        console.log('add text '+text);
        var html="<text id='~"+elID+"' x='"+x0+"' y='"+y0+"' ";
        html+="font-size='"+(textSize*scale)+"' ";
        if(textStyle=='bold') html+="font-weight='bold' ";
        else if(textStyle=='italic') html+="font-style='italic' ";
        html+="stroke='none' fill='"+lineShade+"'>"+text+"</text>";
        console.log('text html: '+html);
        id('dwg').innerHTML+=html;
        id('textDialog').style.display='none';
        elementID='~'+elID;
	    element=id(elementID);
	    // console.log('element is '+elementID);
	    elID++;
        // NO NODES FOR TEXT
        // save text to database
        var dbTransaction=db.transaction('elements',"readwrite");
	    // console.log("indexedDB transaction ready");
	    var dbObjectStore=dbTransaction.objectStore('elements');
	    var el={}
	    el.id=elementID;
	    el.type='text';
	    el.text=text;
	    el.x=x0;
        el.y=y0;
        el.textSize=textSize;
        el.textStyle=textStyle;
	    el.fill=element.getAttribute('fill');
	    el.opacity=element.getAttribute('fill-opacity');
	    if(element.getAttribute('transform')) el.transform=element.getAttribute('transform');
        var request=dbObjectStore.add(el);
	    request.onsuccess=function(event) {
	        console.log("new text element added: "+el.id);
	    };
	    request.onerror=function(event) {
	        console.log("error adding new text element");
	    };
    }
    element=elementID=null;
    mode='select';
});
id('combiButton').addEventListener('click',function() {
    // PLACE CURRENT COMBI OR HOLD TO SHOW LIST OF COMBIS
    showDialog('combiDialog',true);
});
id('combiList').addEventListener('change',function() {
    console.log('choose '+event.target.value);
    combiID=parseInt(event.target.value);
    console.log('combi '+combiID+' picked');
    mode='combi';
    prompt('COMBI: touch to place');
    showDialog('combiDialog',false);
})
// EDIT TOOLS
id('deleteButton').addEventListener('click',function() {
    prompt('DELETE');
    if(selection.length>0) {
        while(selection.length>0) remove(selection.pop());
    }
    else remove(element);
    element=elementID=null;
    /*
    var elementNodes=nodes.filter(belong);
    for(var i=0;i<nodes.length;i++) { // remove element's snap nodes
        if(nodes[i].el==elementID) nodes.splice(i,1);
    }
    id('dwg').removeChild(element); // remove element from SVG
    id('handles').innerHTML=''; // remove edit handles...
    id('blueBox').setAttribute('width',0); // ...and text outline...
    id('blueBox').setAttribute('height',0);
    showDialog('textDialog',false); // ...and content (if shown)
    var dbTransaction=db.transaction('elements',"readwrite");
	// console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('elements');
	// console.log("indexedDB objectStore ready");
	var request=dbObjectStore.delete(elementID);
	request.onsuccess=function(event) {
	    console.log('element deleted from database');
	}
	request.onerror=function(event) {
	    console.log("error deleting element");
	};
	*/
	// id('dwg').removeChild(element); // remove element from SVG
    id('handles').innerHTML=''; // remove edit handles...
    id('selection').innerHTML=''; // ...selection shading,...
    id('blueBox').setAttribute('width',0); // ...and text outline...
    id('blueBox').setAttribute('height',0);
    showDialog('textDialog',false); // ...and content (if shown)
	showEditTools(false);
});
id('backButton').addEventListener('click',function() {
    if(selection.length>0) {
        prompt('OOPS');
        return;
    }
    prompt('PUSH BACK');
    // console.log('move '+elementID+' backwards');
    var previousElement=element.previousSibling;
    if(previousElement===null) alert('already at back');
    else id('dwg').insertBefore(element,previousElement);
});
id('forwardButton').addEventListener('click',function() {
    if(selection.length>0) {
        prompt('OOPS');
        return;
    }
    prompt('PULL FORWARD');
    // console.log('move '+elementID+' forwards');
    var nextElement=element.nextSibling;
    if(nextElement===null) alert('already at front');
    else id('dwg').insertBefore(nextElement,element);
});
id('moveButton').addEventListener('click',function() {
    id('moveRight').value=id('moveDown').value=id('moveDist').value=id('moveAngle').value=0;
    showDialog('moveDialog',true);
});
id('cancelMove').addEventListener('click',function() {
    showDialog('moveDialog',false);
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
    if(selection.length>0) {
        for(var i=0;i<selection.length;i++) move(election[i],moveX,moveY);
        return;
    }
    else move(element,moveX,moveY);
    showDialog('moveDialog',false);
    id('blueBox').setAttribute('width',0);
    id('blueBox').setAttribute('height',0);
    id('handles').innerHTML='';
    id('selection').innerHTML='';
    selected=[];
    mode='select';
    elementID=null;
});

// STYLES
id('line').addEventListener('click',function() {
    showDialog('stylesDialog',true);
});
id('lineType').addEventListener('change',function() {
    if(selection.length>0) {
        prompt('OOPS');
        return;
    }
    var type=event.target.value;
    // console.log('line type: '+type);
    if(elementID) { // change selected element
        element=id(elementID);
        switch(type) {
            case 'solid':
                var val=null;
                break;
            case 'dashed':
                // var val='3 3';
                val=(3*scaleF)+' '+(3*scaleF);
                break;
            case 'dotted':
                val=scaleF+' '+scaleF;
        }
        // console.log('set element '+element.id+' line style to '+type);
        element.setAttribute('stroke-dasharray',val);
        updateElement(elementID,'lineStyle',val);
    }
    else { // change default line type
        lineType=type;
        // console.log('line type is '+type);
    }
    id('line').style.borderStyle=type;
});
id('penSelect').addEventListener('change',function() {
    if(selection.length>0) {
        prompt('OOPS');
        return;
    }
    var val=event.target.value;
    // console.log('pen width: '+val+'mm at 1:1');
    // id('penWidth').value=val;
    // console.log((val*scale)+'mm at 1:'+scale);
    if(elementID) { // change selected element
        element=id(elementID);
        element.setAttribute('stroke-width',val*scale);
        // console.log('set element '+element.id+' pen to '+val);
        updateElement(element.id,'lineW',val);
    }
    else { // change default pen width
        pen=val;
        // console.log('pen is '+pen);
    }
    id('line').style.borderWidth=(pen/scaleF)+'px';
});
id('textSize').addEventListener('change',function() {
    if(selection.length>0) {
        prompt('OOPS');
        return;
    }
    var val=event.target.value;
    if(elementID) { // change selected text element
        element=id(elementID);
        if(type(element)=='text') {
            element.setAttribute('font-size',val*scale);
            // console.log('set element '+element.id+' text size to '+val);
            updateElement(element.id,'textSize',val);
        }
    }
    else { // change default pen width
        textSize=val;
    }
});
id('textStyle').addEventListener('change',function() {
    if(selection.length>0) {
        prompt('OOPS');
        return;
    }
    var val=event.target.value;
    if(elementID) { // change selected text element
        element=id(elementID);
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
            updateElement(element.id,'textStyle',val);
        }
    }
    else { // change default pen width
        textStyle=val;
    }
});
id('lineShade').addEventListener('click',function() {
    if(selection.length>0) {
        prompt('OOPS');
        return;
    }
    // console.log('show shadeMenu');
    id('shadeMenu').mode='line';
    showShadeMenu(true,event.clientX-16,event.clientY-16);
});
id('fillShade').addEventListener('click',function() {
    if(selection.length>0) {
        prompt('OOPS');
        return;
    }
    console.log('show shadeMenu');
    id('shadeMenu').mode='fill';
    var shade=showShadeMenu(true,event.clientX-16,event.clientY-16);
});
id('opacity').addEventListener('change',function() {
    if(selection.length>0) {
        prompt('OOPS');
        return;
    }
    var val=event.target.value;
    // console.log('opacity: '+val);
    if(elementID) { // change selected element
        element=id(elementID);
        element.setAttribute('fill-opacity',val);
        updateElement(elementID,'opacity',val);
    }
    else opacity=val; // change default opacity
    id('fill').style.opacity=val;
});
id('shadeMenu').addEventListener('click',function() {
    // console.log('shadeMenu at '+id('shadeMenu').style.left);
    var x=event.clientX-parseInt(id('shadeMenu').style.left);
    console.log('x: '+x);
    x=Math.floor(x/24);
    var shades=['none','silver','gray','black'];
    var shade=shades[x];
    showShadeMenu(false);
    // console.log('set '+id('shadeMenu').mode+' shade to '+shade);
    if(id('shadeMenu').mode=='line') {
        var val=(shade=='none')?'blue':shade;
        if(elementID) { // change selected element
            element=id(elementID);
            if(type(element)=='text') { // text is filled not stroked
            console.log('change text colour to '+val);
                element.setAttribute('fill',val);
                updateElement(element.id,'fill',val);
            }
            else {
                element.setAttribute('stroke',val);
                updateElement(element.id,'stroke',val);
                if(val='blue') { // move element into <ref> layer...
                    element.setAttribute('stroke-width',0.25*scale); // ...with thin lines...
                    updateElement(element.id,'stroke-width',0.25*scale);
                    element.setAttribute('fill','none'); // ...and no fill
                }
            }
            if(val=='blue') { // <ref> layer
                id('ref').appendChild(element); // move to <ref> layer
                // console.log('element moved to <ref> layer');
                mode='select'; // deselect element
                elementID=null;
                selection=[];
                id('handles').innerHTML=''; //remove element handles
                showSizes(false);
                showEditTools(false);
            }
        }
        else { // change default line shade
            // console.log('line shade: '+val);
            if(val=='blue') val='black'; // cannot have blue <ref> choice as default
            lineShade=shade;
        }
        id('line').style.borderColor=val;
        id('lineShade').style.backgroundColor=val;
    }
    else {
        if(elementID) { // change selected element
            element=id(elementID);
            element.setAttribute('fill',shade);
            // console.log('set element '+element.id+' fill shade to '+shade);
            updateElement(element.id,'fill',shade);
        }
        else { // change default fill shade
            // console.log('fill shade: '+shade);
            fillShade=shade;
        }
        // if(shade=='none') id('fillType').value=0;
        id('fill').style.background=shade;
        id('fillShade').style.backgroundColor=shade;
    }
});
// TOUCH - START
id('graphic').addEventListener('touchstart',function() {
    event.preventDefault();
    // console.log('dialog: '+currentDialog);
    if(currentDialog) showDialog(currentDialog,false); // clicking drawing removes any dialogs/menus
    id('shadeMenu').style.display='none';
    // console.log('touch at '+event.touches[0].clientX+','+event.touches[0].clientY+' mode: '+mode);
    scr.x=Math.round(event.touches[0].clientX);
    scr.y=Math.round(event.touches[0].clientY);
    x=x0=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=y0=Math.round(scr.y*scaleF/zoom+dwg.y);
    // TEST FOR TOUCHING EDIT HANDLES
    var val=event.target.id;
    console.log('touch on '+val);
    if(val.startsWith('handle')) {
        console.log('HANDLE '+val);
        var handle=id(val);
        var bounds=element.getBBox();
        if(type(element)=='combi') { // correct bounds for combis
            bounds.x=element.getAttribute('x');
            bounds.y=element.getAttribute('y');
        }
        console.log('bounds: '+bounds.x+','+bounds.y+' '+bounds.width+'x'+bounds.height);
        id('blueBox').setAttribute('x',bounds.x);
        id('blueBox').setAttribute('y',bounds.y);
        id('blueBox').setAttribute('width',bounds.width);
        id('blueBox').setAttribute('height',bounds.height);
        if(handle instanceof SVGCircleElement) {
            mode='move';
            dx=bounds.x-x0; // offsets to top-left corner
            dy=bounds.y-y0;
            console.log('offsets: '+dx+','+dy);
            prompt('drag to MOVE');
            id('textDialog').style.display='none';
        }
        else if(handle instanceof SVGRectElement) {
            val=val.substr(6);
            console.log('size handle '+val);
            switch(val) {
                case 'NE':
                    mode='boxWidth';
                    x0=parseInt(element.getAttribute('x'));
                    break;
                case 'SW':
                    mode='boxHeight';
                    y0=parseInt(element.getAttribute('y'));
                    break;
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
                    x0=arc.centreX;
                    y0=arc.centreY;
                    console.log('arc centre: '+x0+','+y0);
                    id('blueBox').setAttribute('width',0);
                    id('blueBox').setAttribute('height',0);
                    id('blueOval').setAttribute('cx',x0);
                    id('blueOval').setAttribute('cy',y0);
                    id('blueOval').setAttribute('rx',arc.radius);
                    id('blueOval').setAttribute('ry',arc.radius);
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
        return;
    }
    else if(val=='datum') {
        console.log('move datum');
        mode='datum';
        prompt('DATUM: drag to move');
        return;
    }
    snap=snapCheck();
    if(snap) { // snap start/centre to snap target
        x0=x;
        y0=y;
    }
    switch(mode) {
        case 'pan':
            // console.log('start pan at '+x0+','+y0);
            var view=id('svg').getAttribute('viewBox');
            // console.log('view: '+view+' - dwg.x,y: '+dwg.x+','+dwg.y);
            break;
        case 'line':
            element=id('bluePolyline');
            elementID='bluePolyline';
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
            id('bluePolyline').points.appendItem(point); // ...create first (zero-length) segment
            // console.log(id('bluePolyline').points.length+' points');
            prompt('LINES: drag to next point; tap twice to end'); // JUST PROMPT?
            break;
        case 'box':
            // console.log('box starts at '+x0+','+y0);
            id('blueBox').setAttribute('x',x0);
            id('blueBox').setAttribute('y',y0);
            // console.log('sizing box initiated');
            prompt('BOX: drag to size'); // JUST PROMPT?
            break;
        case 'oval':
            // console.log('oval centre at '+x0+','+y0);
            id('blueOval').setAttribute('cx',x0);
            id('blueOval').setAttribute('cy',y0);
            // console.log('sizing oval initiated');
            prompt('OVAL: drag to size'); // JUST PROMPT?
            break;
        case 'arc':
            // console.log('arc starts at '+x0+','+y0);
            arc.startX=x0;
            arc.startY=y0;
            prompt('ARC: drag to centre');
            id('blueLine').setAttribute('x1',arc.startX);
            id('blueLine').setAttribute('y1',arc.startY);
            id('blueLine').setAttribute('x2',arc.startX);
            id('blueLine').setAttribute('y2',arc.startY);
            break;
        case 'arcEnd':
            id('blueLine').setAttribute('x1',arc.centreX);  // hide circle and line
            id('blueLine').setAttribute('y1',arc.centreY);
            id('blueOval').setAttribute('rx',0);
            id('blueOval').setAttribute('ry',0);
            arc.major=0; // always starts with minor arc
            x0=arc.centreX;
            y0=arc.centreY;
            // set direction of arc - clockwise (spin=1) or anticlockwise (spin=0)
            if(arc.centreY>arc.startY) arc.spin=(x>arc.startX)?1:0;
            else if(arc.centreY<arc.startY) arc.spin=(x<arc.startX)?1:0;
            else if(arc.startX>arc.centreX) arc.spin=(y>arc.startY)?1:0;
            else arc.spin=(y>arc.startY)?0:1;
            // console.log('MAJOR: '+arc.major+'; SPIN: '+arc.spin);
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
            db.transaction('combis').objectStore('combis').get(combiID).onsuccess=function(event) {
                combi=event.target.result;
                console.log('combi '+combiID+' is '+combi.name);
                var s=(combi.nts>0)?scale:1;
                var elementID='~'+elID;
                x0-=combi.ax*s;
                y0-=combi.ay*s;
                var html="<svg id='"+elementID+"' x='"+x0+"' y='"+y0+"'>";
                html+="<g transform='scale("+s+")'>"+combi.svg+"</g></svg>";
                console.log('combi html: '+html);
                id('dwg').innerHTML+=html;
                // combis.push({'el':elementID,'x':x0,'y':y0,'w':(combi.width*s),'h':(combi.height*s),'ax':(combi.ax*s),'ay':(combi.ay*s)});
                elID++;
                console.log("DONE");
                nodes.push({'x':x0,'y':y0,'el':elementID});
                // save box to database
                var dbTransaction=db.transaction('elements',"readwrite");
	            // console.log("indexedDB transaction ready");
	            var dbObjectStore=dbTransaction.objectStore('elements');
	            var el={};
	            el.id=elementID
	            el.type='combi';
	            el.no=combiID;
	            el.x=x0;
	            el.y=y0;
    		    var request=dbObjectStore.add(el);
		        request.onsuccess=function(event) {
			        console.log("new combi element added: "+request.result);
		        };
		        request.onerror=function(event) {
		            console.log("error adding new combi element");
		        };
                mode='select';
            }
            break;
        case 'select':
            id('blueBox').setAttribute('x',x0);
            id('blueBox').setAttribute('y',y0);
            selectionBox.x=x0;
            selectionBox.y=y0;
            selectionBox.w=selectionBox.h=0;
            prompt('SELECT: drag selection box');
    }
    event.stopPropagation();
})
// TOUCH - MOVE
id('graphic').addEventListener('touchmove',function() {
    // console.log('DRAG - offsets: '+dx+','+dy);
    event.preventDefault();
    scr.x=Math.round(event.touches[0].clientX);
    scr.y=Math.round(event.touches[0].clientY);
    x=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=Math.round(scr.y*scaleF/zoom+dwg.y);
    if(mode.startsWith('movePoint')) {
        var n=parseInt(mode.substr(9));
        console.log('drag polyline point '+n);
        id('bluePolyline').points[n].x=x;
        id('bluePolyline').points[n].y=y;
    }
    else switch(mode) {
        case 'datum':
            snap=snapCheck();
            id('datum').setAttribute('cx',x);
            id('datum').setAttribute('cy',y);
            id('datumH').setAttribute('y1',y);
            id('datumH').setAttribute('y2',y);
            id('datumV').setAttribute('x1',x);
            id('datumV').setAttribute('x2',x);
            // nodes[0].x=x;
            // nodes[0].y=y;
            datumX=x;
            datumY=y;
            break;
        case 'move':
            console.log('move element '+elementID+' to '+x+','+y);
            id('blueBox').setAttribute('x',(x+dx));
            id('blueBox').setAttribute('y',(y+dy));
            break;
        case 'boxSize':
            w=parseInt(element.getAttribute('width'));
            h=parseInt(element.getAttribute('height'));
            // WAS var aspect=parseInt(element.getAttribute('width'))/parseInt(element.getAttribute('height'));
            var aspect=w/h;
            console.log('box size: '+w+'x'+h+'; aspect: '+aspect);
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
            setSizes();
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
            setSizes();
            break;
        case 'arcSize':
            dx=x-x0;
            dy=y-y0;
            var r=Math.sqrt((dx*dx)+(dy*dy));
            console.log('radius: '+r);
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
            if(Math.abs(x-x0)<snapD) x=x0; // snap to vertical
            if(Math.abs(y-y0)<snapD) y=y0; // snap to horizontal
            var n=element.points.length;
            var point=element.points[n-1];
            point.x=x;
            point.y=y;
            element.points[n-1]=point;
            setSizes(true);
            break;
        case 'box':
            var boxX=(x<x0)?x:x0;
            var boxY=(y<y0)?y:y0;
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            if(Math.abs(w-h)<snapD*2) w=h; // snap to square
            id('blueBox').setAttribute('x',boxX);
            id('blueBox').setAttribute('y',boxY);
            id('blueBox').setAttribute('width',w);
            id('blueBox').setAttribute('height',h);
            setSizes(false);
            break;
        case 'oval':
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            if(Math.abs(w-h)<snapD*2) w=h; // snap to circle
            id('blueOval').setAttribute('rx',w);
            id('blueOval').setAttribute('ry',h);
            w=Math.abs(w*2);
            h=Math.abs(h*2);
            setSizes(false);
            break;
        case 'arc':
            if(Math.abs(x-x0)<snapD) x=x0; // snap to vertical
            if(Math.abs(y-y0)<snapD) y=y0; // snap to horizontal
            w=x-x0;
            h=y-y0;
            arc.centreX=x;
            arc.centreY=y;
            arc.radius=Math.round(Math.sqrt(w*w+h*h));
            id('blueLine').setAttribute('x2',arc.centreX);
            id('blueLine').setAttribute('y2',arc.centreY);
            id('blueOval').setAttribute('cx',x);
            id('blueOval').setAttribute('cy',y);
            id('blueOval').setAttribute('rx',arc.radius);
            id('blueOval').setAttribute('ry',arc.radius);
            setSizes(true);
            break;
        case 'arcEnd':
            if(Math.abs(x-x0)<snapD) x=x0; // snap to vertical
            if(Math.abs(y-y0)<snapD) y=y0; // snap to horizontal
            w=x-arc.centreX;
            h=y-arc.centreY;
            // console.log('arc end - '+w+','+h);
            var a=Math.atan(h/w); // -PI/2 to +PI/2 radians
            if(w<0) a+=Math.PI; // -PI/2 to +3PI/2 radians
            arc.endX=Math.round(arc.centreX+arc.radius*Math.cos(a));
            arc.endY=Math.round(arc.centreY+arc.radius*Math.sin(a));
            x=arc.endX;
            y=arc.endY;
            setSizes(true);
            a*=(180/Math.PI); // -90 to +270 degrees
            a+=90; // compass bearing 0-360 degrees
            // console.log('end angle: '+a+' spin: '+arc.spin+' major: '+arc.major);
            a-=arc.startAngle; // angle of arc
            if(a<0) a+=360; // keep in range 0-360 degrees
            if(arc.spin>0) arc.major=(a>180)?1:0; // clockwise arc
            else arc.major=(a<180)?1:0; // anticlockwise arc
            // console.log('a: '+a+'; spin: '+arc.spin+'; major: '+arc.major);
            // console.log('angle: '+(a*180/Math.PI));
            id('blueLine').setAttribute('x2',x);
            id('blueLine').setAttribute('y2',y);
            blueArc();
            break;
        case 'select':
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
    }
    event.stopPropagation();
})
// TOUCH - END
id('graphic').addEventListener('touchend',function() {
    // console.log('touch-end at '+x+','+y);
    snap=snapCheck();
    if(mode.startsWith('movePoint')) { // move polyline point
        id('handles').innerHTML='';
        var n=parseInt(mode.substr(9));
        console.log('move polyline point '+n);
        element.points[n].x=x;
        element.points[n].y=y;
        id('bluePolyline').setAttribute('points','0,0');
        updateElement(elementID,'points',element.getAttribute('points'));
        var polylineNodes=nodes.filter(belong);
        for(var i=0; i<polylineNodes.length;i++) {
            polylineNodes[i].x=element.points[i].x;
            polylineNodes[i].y=element.points[i].y;
        }
        mode='select';
            elementID=null;
            selection=[];
            showSizes(false);
            showEditTools(false);
    }
    else switch(mode) {
        case 'move':
            // console.log('move element '+elementID+' ends at '+x+','+y);
            id('handles').innerHTML='';
            dx=x-x0;
            dy=y-y0;
            console.log('moved by '+dx+','+dy);
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            var val=type(element);
            console.log('element type: '+val);
            switch(val) {
                case 'polyline':
                    console.log('move all points by '+dx+','+dy);
                    for(var i=0;i<element.points.length;i++) {
                        element.points[i].x+=dx;
                        element.points[i].y+=dy;
                    }
                    // console.log(element.points.length+' points adjusted');
                    updateElement(elementID,'points',element.getAttribute('points'));
                    break;
                case 'box':
                case 'text':
                case 'combi':
                    element.setAttribute('x',x);
                    element.setAttribute('y',y);
                    console.log('set element '+elementID+' position to '+x+','+y);
                    updateElement(elementID,'x',x);
                    updateElement(elementID,'y',y);
                    break;
                case 'oval':
                    element.setAttribute('cx',x);
                    element.setAttribute('cy',y);
                    updateElement(elementID,'cx',x);
                    updateElement(elementID,'cy',y);
                    break;
                case 'arc':
                    // move centre, start and end points by dx,dy
                    var d=element.getAttribute('d');
                    getArc(d);
                    arc.centreX+=dx;
                    arc.centreY+=dy;
                    arc.startX+=dx;
                    arc.startY+=dy;
                    arc.endX+=dx;
                    arc.endY+=dy;
                    d=setArc();
                    element.setAttribute('d',d);
                    updateElement(elementID,'centreX',arc.centreX);
                    updateElement(elementID,'centreY',arc.centreY);
                    updateElement(elementID,'startX',arc.startX);
                    updateElement(elementID,'startY',arc.startY);
                    updateElement(elementID,'endX',arc.endX);
                    updateElement(elementID,'endY',arc.endY);
                    break;
                /*
                case 'text':
                    element.setAttribute('x',x);
                    element.setAttribute('y',y);
                    updateElement(elementID,'x',x);
                    updateElement(elementID,'y',y);
                    break;
                case 'combi':
                */    
            }
            var elementNodes=nodes.filter(belong);
            for(var i=0; i<elementNodes.length;i++) {
                elementNodes[i].x+=dx;
                elementNodes[i].y+=dy;
            }
            mode='select';
            elementID=null;
            selection=[];
            showSizes(false);
            showEditTools(false);
            break;
        case 'boxSize':
            console.log('touchEnd - box size: '+dx+'x'+dy);
            id('handles').innerHTML='';
            element.setAttribute('width',dx);
            updateElement(elementID,'width',dx);
            element.setAttribute('height',dy);
            updateElement(elementID,'height',dy);
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            var elementNodes=nodes.filter(belong);
            for(var i=0; i<elementNodes.length;i++) {
                elementNodes[i].x=x0+dx;
                elementNodes[i].y=y0+dy;
            }
            mode='select';
            elementID=null;
            selection=[];
            showSizes(false);
            showEditTools(false);
            break;
        case 'ovalSize':
            console.log('touchEnd - radii: '+dx+'x'+dy);
            id('handles').innerHTML='';
            element.setAttribute('rx',dx);
            updateElement(elementID,'rx',dx);
            element.setAttribute('ry',dy);
            updateElement(elementID,'ry',dy);
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            var elementNodes=nodes.filter(belong);
            for(var i=0; i<elementNodes.length;i++) {
                elementNodes[i].x=x0+dx;
                elementNodes[i].y=y0+dy;
            }
            mode='select';
            elementID=null;
            selection=[];
            showSizes(false);
            showEditTools(false);
            break;
        case 'arcSize':
            dx=x-x0;
            dy=y-y0;
            var r=Math.sqrt((dx*dx)+(dy*dy));
            console.log('touch end - radius: '+r);
            id('handles').innerHTML='';
            // adjust arc start...
            dx=arc.startX-arc.centreX;
            dy=arc.startY-arc.centreY;
            dx*=r/arc.radius;
            dy*=r/arc.radius;
            arc.startX=arc.centreX+dx;
            arc.startY=arc.centreY+dy;
            // ...and end points...
            dx=arc.endX-arc.centreX;
            dy=arc.endY-arc.centreY;
            dx*=r/arc.radius;
            dy*=r/arc.radius;
            arc.endX=arc.centreX+dx;
            arc.endY=arc.centreY+dy;
            // ...and radius 
            arc.radius=r;
            var d=setArc();
            element.setAttribute('d',d);
            updateElement(elementID,'startX',arc.startX);
            updateElement(elementID,'startY',arc.startY);
            updateElement(elementID,'endX',arc.endX);
            updateElement(elementID,'endY',arc.endY);
            updateElement(elementID,'radius',r);
            var arcNodes=nodes.filter(belong);
            console.log(arcNodes.length+' arc nodes');
            arcNodes[0].x=arc.centreX;
            arcNodes[0].y=arc.centreY;
            arcNodes[1].x=arc.startX;
            arcNodes[1].y=arc.startY;
            arcNodes[2].x=arc.endX;
            arcNodes[2].y=arc.endY;
            id('blueOval').setAttribute('rx',0);
            id('blueOval').setAttribute('ry',0);
            mode='select';
            elementID=null;
            selection=[];
            showSizes(false);
            showEditTools(false);
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
            if(d<snapD) { // click/tap to finish polyline
                console.log('end polyline');
                var html="<polyline id='~"+elID+"' points='";
                var points=id('bluePolyline').getAttribute('points');
                html+=points+"' stroke='"+lineShade+"' stroke-width='"+(pen*scale)+"' ";
                if(lineType=='dashed') html+="stroke-dasharray='"+(3*scaleF)+" "+(3*scaleF)+"' ";
                else if(lineType=='dotted') html+="stroke-dasharray='"+scale+" "+scale+"' ";
                html+="fill='none'/>";
                id('dwg').innerHTML+=html;
                // console.log('poly/line added: '+html);
                elementID='~'+elID;
	            element=id(elementID);
                id('bluePolyline').setAttribute('points','0,0');
	            // console.log('element is '+elementID);
                elID++;
                for(var i=0;i<element.points.length;i++) {
                    nodes.push({'x':element.points[i].x,'y':element.points[i].y,'el':elementID});
                    console.log('node added at '+element.points[i].x+','+element.points[i].y);
                }
                // save poly/line to database
                var dbTransaction=db.transaction('elements',"readwrite");
	            var dbObjectStore=dbTransaction.objectStore('elements');
	            var el={}
	            el.id=elementID;
	            el.type='polyline';
	            el.points=element.getAttribute('points');
	            el.stroke=element.getAttribute('stroke');
	            el.lineW=element.getAttribute('stroke-width');
	            if(element.getAttribute('stroke-dasharray')) el.lineStyle=val;
	            el.fill=element.getAttribute('fill');
	            if(element.getAttribute('transform')) el.transform=element.getAttribute('transform');
                console.log('element data object id: '+el.id+'; type: '+el.type+'; '+el.points.length+' points');
    		    var request=dbObjectStore.add(el);
		        request.onsuccess=function(event) {
			        console.log("new poly/line element added: "+el.id);
		        };
		        request.onerror=function(event) {
		            console.log("error adding new poly/line element");
		        };
                element=elementID=null;
                showSizes(false);
                mode='select';
            }
            break;
        case 'box':
            var html="<rect id='~"+elID+"' x='"+((x<x0)?x:x0)+"' y='"+((y<y0)?y:y0)+"' width='"+w+"' height='"+h+"' rx='"+rad+"' stroke=";
            switch(lineType) {
                case 'solid':
                    html+=lineShade;
                    break;
                case 'dashed':
                    html+=lineShade+" stroke-dasharray='"+(3*scaleF)+" "+(3*scaleF)+"'";
                    break;
                case 'dotted':
                    html+=lineShade+" stroke-dasharray='"+scale+" "+scale+"'";
            }
            html+=" stroke-width='"+(pen*scale)+"' fill='";
            // console.log('fillShade: '+fillShade);
            html+=fillShade;
            html+="' fill-opacity='"+opacity+"'>";
            console.log('box svg: '+html);
            id('dwg').innerHTML+=html;
	        // console.log("box svg drawn: "+x0+','+y0+' to '+(x0+w)+','+(y0+h));
	        elementID='~'+elID;
	        element=id(elementID);
	        // console.log('element is '+elementID);
	        elID++;
	        id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            // add nodes to nodes[] array
            x=parseInt(element.getAttribute('x'));
            y=parseInt(element.getAttribute('y'));
            w=parseInt(element.getAttribute('width'));
            h=parseInt(element.getAttribute('height'));
            // console.log('x:'+x+' y:'+y+' w:'+w+' h:'+h);
            nodes.push({'x':x,'y':y,'el':elementID});
            nodes.push({'x':x+w,'y':y,'el':elementID});
            nodes.push({'x':x,'y':y+h,'el':elementID});
            nodes.push({'x':x+w,'y':y+h,'el':elementID});
            // save box to database
            var dbTransaction=db.transaction('elements',"readwrite");
	        // console.log("indexedDB transaction ready");
	        var dbObjectStore=dbTransaction.objectStore('elements');
	        // console.log("indexedDB objectStore ready");
	        // console.log("save element "+elementID);
	        // console.log('create object from '+html);
	        var el={}
	        el.id=elementID;
	        el.type='rect';
	        el.x=x;
	        el.y=y;
	        el.width=w;
	        el.height=h;
	        el.radius=rad;
	        el.stroke=element.getAttribute('stroke');
	        el.lineW=element.getAttribute('stroke-width');
	        if(element.getAttribute('stroke-dasharray')) el.lineStyle=val;
	        el.fill=element.getAttribute('fill');
	        // if(element.getAttribute('stroke-opacity')) el.opacity=element.getAttribute('stroke-opacity');
	        if(element.getAttribute('transform')) el.transform=element.getAttribute('transform');
	        // console.log('element data object id: '+el.id+'; type: '+el.type+'; size: '+el.width+'x'+el.height);
    		var request=dbObjectStore.add(el);
		    request.onsuccess=function(event) {
			    console.log("new box element added: "+el.id);
		    };
		    request.onerror=function(event) {
		        console.log("error adding new box element");
		    };
            element=elementID=null;
            mode='select';
            break;
        case 'oval':
            var html="<ellipse id='~"+elID+"' cx='"+x0+"' cy='"+y0+"' rx='"+(w/2)+"' ry='"+(h/2)+"' stroke=";
            switch(lineType) {
                case 'solid':
                    html+=lineShade;
                    break;
                case 'dashed':
                    html+=lineShade+" stroke-dasharray='"+(3*scaleF)+" "+(3*scaleF)+"'";
                    break;
                case 'dotted':
                    html+=lineShade+" stroke-dasharray='"+scale+" "+scale+"'";
            }
            html+=" stroke-width="+(pen*scale)+" fill='";
            // console.log('fillShade: '+fillShade);
            html+=fillShade;
            html+="' fill-opacity='"+opacity+"'>";
            // console.log('oval svg: '+html);
            id('dwg').innerHTML+=html;
            // console.log("oval svg drawn: "+w+" x "+h+" at "+x0+","+y0);
            elementID='~'+elID;
	        element=id(elementID);
	        // console.log('element is '+elementID);
            elID++;
            id('blueOval').setAttribute('rx',0);
            id('blueOval').setAttribute('ry',0);
            // add nodes to nodes[] array
            x=parseInt(element.getAttribute('cx'));
            y=parseInt(element.getAttribute('cy'));
            w=parseInt(element.getAttribute('rx'));
            h=parseInt(element.getAttribute('ry'));
            // console.log('x:'+x+' y:'+y+' w:'+w+' h:'+h);
            nodes.push({'x':x,'y':y,'el':elementID});
            nodes.push({'x':(x-w),'y':y,'el':elementID});
            nodes.push({'x':(x+w),'y':y,'el':elementID});
            nodes.push({'x':x,'y':(y-h),'el':elementID});
            nodes.push({'x':x,'y':(y+h),'el':elementID});
            // console.log('oval nodes added');
            // save oval to database
            var dbTransaction=db.transaction('elements',"readwrite");
	        // console.log("indexedDB transaction ready");
	        var dbObjectStore=dbTransaction.objectStore('elements');
	        // console.log("indexedDB objectStore ready");
	        // console.log("save element "+elementID);
	        // console.log('create object from '+html);
	        var el={}
	        el.id=elementID;
	        el.type='ellipse';
	        el.cx=x;
	        el.cy=y;
	        el.rx=w;
	        el.ry=h;
	        el.stroke=element.getAttribute('stroke');
	        el.lineW=element.getAttribute('stroke-width');
	        if(element.getAttribute('stroke-dasharray')) el.lineStyle=val;
	        el.fill=element.getAttribute('fill');
	        // if(element.getAttribute('stroke-opacity')) el.opacity=element.getAttribute('stroke-opacity');
	        if(element.getAttribute('transform')) el.transform=element.getAttribute('transform');
	        // console.log('element data object id: '+el.id+'; type: '+el.type+'; radii: '+el.rx+'x'+el.ry);
    		var request=dbObjectStore.add(el);
		    request.onsuccess=function(event) {
			    console.log("new oval element added: "+el.id);
		    };
		    request.onerror=function(event) {
		        console.log("error adding new oval element");
		    };
            element=elementID=null;
            mode='select';
            break;
        case 'arc':
            arc.centreX=x;
            arc.centreY=y;
            // console.log('arcCentre: '+arc.centreX+','+arc.centreY);
            w=arc.startX-arc.centreX;
            h=arc.startY-arc.centreY;
            arc.startAngle=Math.atan(h/w); // radians
            arc.startAngle*=(180/Math.PI); // -90 to +90 degrees
            arc.startAngle+=90; // compass bearing 0-180 degrees
            if(w<0) arc.startAngle+=180; // 0-360 range
            // console.log('arc start angle: '+arc.startAngle);
            mode='arcEnd';
            break;
        case 'arcEnd':
            var html="<path id='~"+elID+"' d='"+setArc()+"' stroke="; // set arc path html from arc properties
            /* "<path id='~"+elID+"' d='M"+arc.centreX+","+arc.centreY+" M"+arc.startX+","+arc.startY+" A"+arc.radius+","+arc.radius+" 0 "+arc.major+","+arc.spin+" "+arc.endX+","+arc.endY+"' stroke=";*/
            switch(lineType) {
                case 'solid':
                    html+=lineShade;
                    break;
                case 'dashed':
                    html+=lineShade+" stroke-dasharray='"+(3*scaleF)+" "+(3*scaleF)+"' ";
                    break;
                case 'dotted':
                    html+=lineShade+" stroke-dasharray='"+scale+" "+scale+"'";
            }
            html+=" stroke-width="+(pen*scale)+" fill='none'"; // no fill
            html+="' fill-opacity='"+opacity+"'>";
            // console.log('arc svg: '+html);
            id('dwg').innerHTML+=html;
            // console.log("arc svg drawn");
            elementID='~'+elID;
	        element=id(elementID);
            elID++;
            id('blueArc').setAttribute('d','M0,0 M0,0 A0,0 0 0,0 0,0');
            id('blueLine').setAttribute('x1',0);
            id('blueLine').setAttribute('y1',0);
            id('blueLine').setAttribute('x2',0);
            id('blueLine').setAttribute('y2',0);
            // create nodes for arc start, centre & end points
            nodes.push({'x':arc.centreX,'y':arc.centreY,'el':elementID});
            nodes.push({'x':arc.startX,'y':arc.startY,'el':elementID});
            nodes.push({'x':arc.endX,'y':arc.endY,'el':elementID});
            // add arc to database
            var dbTransaction=db.transaction('elements',"readwrite");
	        // console.log("indexedDB transaction ready");
	        var dbObjectStore=dbTransaction.objectStore('elements');
	        // console.log("indexedDB objectStore ready");
	        // console.log("save element "+elementID);
	        // console.log('create object from '+html);
	        var el={}
	        el.id=elementID;
	        // console.log('element is '+elementID+' ie: '+element);
	        el.type='path';
	        el.startX=arc.startX;
	        el.startY=arc.startY;
	        el.radius=arc.radius;
	        el.centreX=arc.centreX;
	        el.centreY=arc.centreY;
	        el.major=arc.major;
	        el.spin=arc.spin;
	        el.endX=arc.endX;
	        el.endY=arc.endY;
	        el.stroke=element.getAttribute('stroke');
	        el.lineW=element.getAttribute('stroke-width');
	        if(element.getAttribute('stroke-dasharray')) el.lineStyle=val;
	        el.fill=element.getAttribute('fill');
	        // if(element.getAttribute('stroke-opacity')) el.opacity=element.getAttribute('stroke-opacity');
	        if(element.getAttribute('transform')) el.transform=element.getAttribute('transform');
	        var request=dbObjectStore.add(el);
		    request.onsuccess=function(event) {
			    console.log("new arc element added: "+el.id);
		    };
		    request.onerror=function(event) {
		        console.log("error adding new arc element");
		    };
            element=elementID=null;
            mode='select';
            break;
        case 'select':
            id('blueBox').setAttribute('width',0);
            selection=[];
            console.log('box size: '+selectionBox.w+'x'+selectionBox.h);
            if((selectionBox.w>20)&&(selectionBox.h>20)) { // significant selection box size
                console.log('GROUP SELECTION - box: '+selectionBox.w+'x'+selectionBox.h+' at '+selectionBox.x+','+selectionBox.y);
                var items=id('dwg').childNodes;
                console.log(items.length+' nodes in dwg');
                for(var i=0;i<items.length;i++) { // collect elements entirely within selectionBox
                    console.log('item '+i+': '+items[i].id);
                    var box=items[i].getBBox();
                    if(type(items[i])=='combi') {
                        console.log('COMBI!'); // FOR COMBIS GET BOUNDS FROM combiBoxes
                        box.x=parseInt(items[i].getAttribute('x'));
                        box.y=parseInt(items[i].getAttribute('y'));
                        /*
                        for(var j=0;j<combis.length;j++) {
                            if(combis[j].el==items[i].id) {
                                box.x=combis[j].x;
                                box.y=combis[j].y;
                                // box.width=combis[j].w;
                                // box.height=combis[j].h;
                                console.log('combi '+combis[j].el+': '+box.width+'x'+box.height+' at '+box.x+','+box.y);
                            }
                        }
                        */
                    }
                    console.log('bounds for '+items[i].id+": "+box.x+','+box.y);
                    console.log('item '+items[i].id+' box: '+box.width+'x'+box.height+' at '+box.x+','+box.y);
                    if(box.x<selectionBox.x) continue;
                    if(box.y<selectionBox.y) continue;
                    if((box.x+box.width)>(selectionBox.x+selectionBox.w)) continue;
                    if((box.y+box.height)>(selectionBox.y+selectionBox.h)) continue;
                    selection.push(items[i]); // add to selection if passes tests
                    console.log('select '+items[i].id);
                    var html="<rect x='"+box.x+"' y='"+box.y+"' width='"+box.width+"' height='"+box.height+"' ";
                    html+="stroke='none' fill='blue' fill-opacity='0.25'/>";
                    id('selection').innerHTML+=html;
                }
                if(selection.length>0) { // highlight selected elements
                    mode='edit';
                    showEditTools(true);
                }
                return;
            }
        case 'edit':
            var el=event.target;
            var hit=null;
            if(el.parentNode.id=='drawing') { // drawing background - check 10x10px zone
                console.log('noting here - search locality');
                var e=-5;
                var n=-5;
                while(e<6 && !hit) {
                    n=-5;
                    while(n<6 && !hit) {
                        // console.log('check at '+e+','+n+' '+(scr.x+e)+','+(scr.y+n));
                        el=document.elementFromPoint(scr.x+e,scr.y+n);
                        if(el.id!='svg') hit=el.id; 
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
            if(hit && selection.length<1) {
                // IF BOX-SELECT ADD TO (OR REMOVE FROM) 'selection' ARRAY - LIST OF ELEMENT IDs
                // OTHERWISE (CLICK-SELECT) JUST SELECT AN ELEMENT IN snap RANGE
                element=el;
                elementID=hit;
                console.log('sort style then add handles');
                if(type(el)!='combi') { // combis have no style
                    var val=el.getAttribute('stroke-dasharray');
                    // console.log('element lineType (dasharray): '+val);
                    if(!val) {
                        // console.log('set lineType to solid');
                        id('lineType').value='solid';
                        id('line').style.borderStyle='solid';
                    }
                    else {
                        // console.log('dasharray value: '+parseInt(val));
                        if(parseInt(val)==scaleF) {
                            // console.log('set lineType to dotted');
                            id('lineType').value='dotted';
                            id('line').style.borderStyle='dotted';
                        }
                        else {
                            // console.log('set lineType to dashed');
                            id('lineType').value='dashed';
                            id('line').style.borderStyle='dashed';
                        }
                    }
                    val=el.getAttribute('stroke-width');
                    // console.log('element line width: '+val);
                    if(val) id('line').style.borderWidth=(val/scaleF)+'px';
                    val=el.getAttribute('stroke');
                    // console.log('set lineShade to '+val);
                    if(val) {
                        id('lineShade').style.backgroundColor=val;
                        id('line').style.borderColor=val;
                    }
                    val=el.getAttribute('fill');
                    // console.log('element fill: '+val);
                    if(val=='none') {
                        // id('fillType').value=0;
                        id('fill').style.background='#00000000';
                        id('fillShade').style.backgroundColor='white';
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
                id('handles').innerHTML=''; // clear any handles then add handles for selected element 
                console.log('add handles');
                switch(type(el)) {
                    case 'polyline':
                        var bounds=el.getBBox();
                        w=bounds.width;
                        h=bounds.height;
                        var points=el.points;
                        var n=points.length;
                        // console.log('bounds: '+w+'x'+h+'mm; '+n+' points');
                        setSizes(false); // size of bounding box
                        var html="<circle id='handle0' cx="+points[0].x+" cy="+points[0].y+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>";
                        id('handles').innerHTML+=html; // circle handle moves whole element
                        for(var i=1;i<n;i++) {
                            html="<rect id='handle"+i+"' x="+(points[i].x-handleR)+" y="+(points[i].y-handleR)+" width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>";
                            id('handles').innerHTML+=html; // remaining handles move nodes
                        }
                        showSizes(true,'LINE');
                        elementID=el.id;
                        mode='edit';
                        break;
                    case 'box':
                        // console.log('box '+el.id+': '+el.getAttribute('x')+','+el.getAttribute('y')+' '+el.getAttribute('width')+'x'+el.getAttribute('height'));
                        x=parseFloat(el.getAttribute('x'));
                        y=parseFloat(el.getAttribute('y'));
                        w=parseFloat(el.getAttribute('width'));
                        h=parseFloat(el.getAttribute('height'));
                        elementID=el.id;
                        var html="<circle id='handleNW' cx="+x+" cy="+y+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // top-left circle handle at top-left used to move whole box
                        // DO ALL BOX RESIZING USING SE HANDLE
                        // html="<rect id='handleNE' x='"+(x+w-handleR)+"' y='"+(y-handleR)+"' width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        // id('handles').innerHTML+=html; // top-right square handle adjusts box width
                        html="<rect id='handleSE' x='"+(x+w-handleR)+"' y='"+(y+h-handleR)+"' width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // bottom-right handle adjusts box size keeping aspect ratio
                        // html="<rect id='handleSW' x='"+(x-handleR)+"' y='"+(y+h-handleR)+"' width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        // id('handles').innerHTML+=html; // bottom-left handle adjusts box height
                        setSizes(false);
                        showSizes(true,(w==h)?'SQUARE':'BOX');
                        mode='edit';
                        break;
                    case 'oval':
                        // console.log('oval '+el.id);
                        x=parseFloat(el.getAttribute('cx'));
                        y=parseFloat(el.getAttribute('cy'));
                        w=parseFloat(el.getAttribute('rx'))*2;
                        h=parseFloat(el.getAttribute('ry'))*2;
                        elementID=el.id;
                        var html="<circle id='handleCentre' cx="+x+" cy="+y+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // hollow circle handle at centre used to move whole box
                        html="<rect id='handleSize' x="+(x+w/2-handleR)+" y="+(y+h/2-handleR)+" width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // square handle adjusts ellipse size
                        setSizes(false);
                        showSizes(true,(w==h)?'CIRCLE':'OVAL');
                        mode='edit';
                        break;
                    case 'arc':
                        // console.log('arc '+el.id);
                        var d=el.getAttribute('d');
                        console.log('select arc - d: '+d);
                        getArc(d); // derive arc geometry from d
                        elementID=el.id;
                        var html="<circle id='handleCentre' cx="+arc.centreX+" cy="+arc.centreY+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML=html; // circle handle at arc centre
                        // DO ARC SIZING USING END HANDLE
                        // html="<rect id='handleStart' x="+(arc.startX-handleR)+" y="+(arc.startY-handleR)+" width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        // id('handles').innerHTML+=html; // square handle at arc start...
                        html="<rect id='handleEnd' x="+(arc.endX-handleR)+" y="+(arc.endY-handleR)+" width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // square handle at end point
                        // set up x0 & x for arc radius and included angle
                        var startAngle=Math.atan((arc.startY-arc.centreY)/(arc.startX-arc.centreX));
                        if(arc.startX<arc.centreX) startAngle+=Math.PI;
                        // console.log('startAngle: '+startAngle);
                        var angle=Math.atan((arc.endY-arc.centreY)/(arc.endX-arc.centreX));
                        // console.log('angle: '+angle);
                        if(arc.endX<arc.centreX) angle+=Math.PI;
                        angle=Math.abs(angle-startAngle);
                        // console.log('arc angle: '+Math.round(angle*180/Math.PI));
                        x0=arc.centreX;
                        y0=arc.centreY;
                        x=x0+arc.radius*Math.cos(angle);
                        y=y0+arc.radius*Math.sin(angle);
                        setSizes(true,true);
                        showSizes(true,'ARC');
                        mode='edit';
                        break;
                    case 'text':
                        var bounds=el.getBBox();
                        w=Math.round(bounds.width);
                        h=Math.round(bounds.height);
                        // console.log('bounds: '+w+'x'+h+'mm; '+n+' points');
                        setSizes(false); // size of bounding box
                        var html="<circle id='handle' cx="+bounds.x+" cy="+(bounds.y+bounds.height)+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>";
                        id('handles').innerHTML+=html; // circle handle moves whole element
                        /*
                        id('blueBox').setAttribute('x',bounds.x);
                        id('blueBox').setAttribute('y',bounds.y);
                        id('blueBox').setAttribute('width',w);
                        id('blueBox').setAttribute('height',h);
                        */
                        showSizes(true,'TEXT');
                        console.log('display text content: '+element.innerHTML);
                        console.log('show text dialog');
                        id('textDialog').style.left=scr.x+'px';
                        id('textDialog').style.top=scr.y+'px';
                        id('text').value=element.innerHTML;
                        id('textDialog').style.display='block';
                        elementID=el.id;
                        mode='edit';
                        break;
                    case 'combi':
                        console.log('combi handle at anchor point');
                        var bounds=el.getBBox();
                        bounds.x=parseInt(el.getAttribute('x'));
                        bounds.y=parseInt(el.getAttribute('y'));
                        console.log('element '+el.id+' at '+el.getAttribute('x')+','+el.getAttribute('y'));
                        console.log('combi bounds: '+bounds.width+'x'+bounds.height+' at '+bounds.x+','+bounds.y);
                        /*
                        x=-1;
                        y=-1;
                        var i=0;
                        combi=null;
                        while(i<combis.length && !combi) {
                            console.log('combi '+i);
                            if(combis[i].el==elementID) {
                                combi=combis[i];
                            }
                            i++;
                        }
                        x=combi.x+combi.ax;
                        y=combi.y+combi.ay;
                        w=combi.w;
                        h=combi.h;
                        */
                        id('blueBox').setAttribute('x',bounds.x);
                        id('blueBox').setAttribute('y',bounds.y);
                        id('blueBox').setAttribute('width',bounds.width);
                        id('blueBox').setAttribute('height',bounds.height);
                        var html="<circle id='handle' cx='"+bounds.x+"' cy='"+bounds.y+"' r='"+handleR+"' stroke='none' fill='#0000FF88'/>";
                        id('handles').innerHTML=html;
                        setSizes();
                        showSizes(true,'COMBI '+combi.name);
                        mode='edit';
                        break;
                }
                showEditTools(true);
            }
            else { // no selection
                mode='select';
                elementID=null;
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
                // console.log('set lineType to current default: '+lineType);
                id('lineType').value=lineType;
                // console.log('set border to '+lineType+' pen: '+pen+' shade: '+lineShade);
                id('line').style.borderStyle=lineType;
                id('line').style.borderWidth=pen+'mm';
                // console.log('set lineShade to current default: '+lineShade);
                id('lineShade').style.backgroundColor=lineShade;
                id('line').style.borderColor=lineShade;
                id('fill').style.opacity=opacity;
                id('opacity').value=opacity;
            }
            event.stopPropagation();
    }
    event.stopPropagation();
})
// ADJUST ELEMENT SIZES
id('first').addEventListener('change',function() {
    var val=parseInt(id('first').value);
    // console.log('element '+elementID+' value changed to '+val);
    element=id(elementID);
    switch(type(element)) {
        case 'polyline':
            // console.log('element: '+element.id);
            if(elementID.startsWith('~')) { // width of completed (poly)line
                // console.log('completed polyline - adjust overall width');
                var bounds=element.getBBox();
                w=bounds.width;
                var ratio=val/w;
                var points=element.points;
                var i=0;
                var n=-1;
                while(n<0 && i<nodes.length) {
                    if(nodes[i].el==elementID) n=i;
                }
                // console.log('start node is '+n);
                // console.log('adjust all polyline points, nodes and handles x-values by ratio '+ratio);
                for(i=1;i<points.length;i++) { // points[0] is start - not affected
                    x=points[0].x+(points[i].x-points[0].x)*ratio;
                    points[i].x=x; // adjust element,... 
                    nodes[n+i].x=x; // ...nodes...
                    id('handle'+i).setAttribute('x',x-handleR); // ...and edit handles
                }
                var pts=[];
	            for(var i=0;i<points.length;i++) {
	                pts.push(points[i].x);
	                pts.push(points[i].y);
	            }
                updateElement(elementID,'points',pts); // UPDATE DB
                break;
            } // otherwise adjust length of latest line segment
            var n=element.points.length;
            // console.log(n+' points');
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
            break;
        case 'box':
            // console.log('change width of element '+elementID);
            element.setAttribute('width',val);
            updateElement(elementID,'width',val);
            var elX=parseInt(element.getAttribute('x'));
            // console.log('move nodes and handles');
            var boxNodes=nodes.filter(belong);
            for(var i=0;i<boxNodes.length;i++) { // adjust two RH nodes...
                if(boxNodes[i].x!=elX) {
                    // console.log('node '+i+' x changed to '+(elX+val));
                    boxNodes[i].x=elX+val;
                }
            } // ...then move RH edit handles
            id('handleNE').setAttribute('x',(elX+val-handleR));
            id('handleSE').setAttribute('x',(elX+val-handleR));
            break;
        case 'oval':
            element.setAttribute('rx',val/2);
            updateElement(elementID,'rx',val/2);
            var elX=parseInt(element.getAttribute('cx'));
            var ovalNodes=nodes.filter(belong);
            for(var i=0;i<ovalNodes.length;i++) { // adjust two RH nodes...
                if(ovalNodes[i].x!=elX) {
                    if(ovalNodes[i].x<elX) ovalNodes[i].x=elX-val/2;
                    else ovalNodes[i].x=elX+val/2;
                }
            }
            id('handleSize').setAttribute('x',(elX+val/2-handleR));
            break;
        case 'arc':
            console.log('adjust arc radius to '+val);
            d=element.getAttribute('d');
            getArc(d);
            dx=arc.startX-arc.centreX;
            dy=arc.startY-arc.centreY;
            dx*=val/arc.radius;
            dy*=val/arc.radius;
            arc.startX=arc.centreX+dx;
            arc.startY=arc.centreY+dy;
            // ...and end points...
            dx=arc.endX-arc.centreX;
            dy=arc.endY-arc.centreY;
            dx*=val/arc.radius;
            dy*=val/arc.radius;
            arc.endX=arc.centreX+dx;
            arc.endY=arc.centreY+dy;
            // ...and radius
            console.log('diameter: '+(val*2));
            arc.radius=val;
            console.log('arc radius:'+arc.radius+' centre:'+arc.centreX+','+arc.centreY+' start:'+arc.startX+','+arc.startY+' end:'+arc.endX+','+arc.endY);
            var d=setArc();
            element.setAttribute('d',d);
            updateElement(elementID,'startX',arc.startX);
            updateElement(elementID,'startY',arc.startY);
            updateElement(elementID,'endX',arc.endX);
            updateElement(elementID,'endY',arc.endY);
            updateElement(elementID,'radius',r);
            id('handleStart').setAttribute('x',arc.startX-handleR);
            id('handleStart').setAttribute('y',arc.startY-handleR);
            id('handleEnd').setAttribute('x',arc.endX-handleR);
            id('handleEnd').setAttribute('y',arc.endY-handleR);
            arcNodes=nodes.filter(belong);
            console.log(arcNodes.length+' arc nodes');
            arcNodes[0].x=arc.centreX;
            arcNodes[0].y=arc.centreY;
            arcNodes[1].x=arc.startX;
            arcNodes[1].y=arc.startY;
            arcNodes[2].x=arc.endX;
            arcNodes[2].y=arc.endY;
            break;
    }
})
id('second').addEventListener('change',function() {
    var val=parseInt(id('second').value);
    element=id(elementID);
    // console.log('element '+element+' type: '+type(element)+' value changed to '+val);
    switch(type(element)) {
        case 'polyline':
            // console.log('element: '+element.id);
            if(elementID.startsWith('~')) { // height of completed (poly)line
                // console.log('completed polyline - adjust overall height');
                var bounds=element.getBBox();
                h=bounds.height;
                var ratio=val/h;
                var points=element.points;
                var i=0;
                var n=-1;
                while(n<0 && i<nodes.length) {
                    if(nodes[i].el==elementID) n=i;
                }
                // console.log('start node is '+n);
                // console.log('adjust all polyline points, nodes and handles x-values by ratio '+ratio);
                for(i=1;i<points.length;i++) { // points[0] is start - not affected
                    y=points[0].y+(points[i].y-points[0].y)*ratio;
                    points[i].y=y; // adjust element,... 
                    nodes[n+i].y=y; // ...nodes...
                    id('handle'+i).setAttribute('y',y-handleR); // ...and edit handles
                }
                var pts=[];
	            for(var i=0;i<points.length;i++) {
	                pts.push(points[i].x);
	                pts.push(points[i].y);
	            }
                updateElement(elementID,'points',pts);
                break;
            } // otherwise adjust angle of latest line segment
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
            break;
        case 'box':
            // console.log('box height is '+element.getAttribute('height'));
            // console.log('set to '+val);
            element.setAttribute('height',val);
            updateElement(elementID,'height',val);
            var elY=parseInt(element.getAttribute('y'));
            // console.log('move nodes and handles');
            var boxNodes=nodes.filter(belong);
            for(var i=0;i<boxNodes.length;i++) { // adjust two lower nodes...
                if(boxNodes[i].y!=elY) {
                    boxNodes[i].y=elY+val;
                }
            } // ...then move lower edit handles
            // console.log('lower handles.y: '+(elY+val-handleR));
            id('handleSW').setAttribute('y',(elY+val-handleR));
            id('handleSE').setAttribute('y',(elY+val-handleR));
            break;
        case 'oval':
            // console.log('change oval height');
            element.setAttribute('ry',val/2);
            updateElement(elementID,'ry',val/2);
            var elY=parseInt(element.getAttribute('cy'));
            var ovalNodes=nodes.filter(belong);
            for(var i=0;i<ovalNodes.length;i++) { // adjust top & bottom nodes...
                if(ovalNodes[i].y!=elY) {
                    if(ovalNodes[i].y<elY) ovalNodes[i].y=elY-val/2;
                    else ovalNodes[i].y=elY+val/2;
                }
            }
            id('handleSize').setAttribute('y',(elY+val/2-handleR));
    }
})
// UTILITY FUNCTIONS
function id(el) {
	return document.getElementById(el);
}
function initialise() {
    // SET DRAWING ASPECT
    console.log('set up 1:'+scale+' scale '+aspect+' drawing using '+units);
    scaleF=scale/96; // 96px = 1in...
    if(units=='mm') {
        scaleF*=25.4; // ...or 25.4mm
        snapD=5*scale; // ...5mm snap distance...
        handleR=2.5*scale; // ...2.5mm radius handles...
        boxR=5*scale; // ... and 5mm roundbox corners at 1:1 scale
        // id('point').setAttribute('transform','scale('+scale+')');
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
    }
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
    id('datum').setAttribute('r',3*scale);
    id('datumH').setAttribute('stroke-width',0.25*scale);
    id('datumV').setAttribute('stroke-width',0.25*scale);
    // nodes[0]={x:0,y:0,el:'datum'};
    // console.log('clip to '+w+'x'+h);
    html="<rect x='0' y='0' width='"+w+"' height='"+h+"'/>"; // clip to drawing edges
    // console.log('clipPath: '+html);
    id('clipper').innerHTML=html;
    // console.log('drawing scale size: '+w+'x'+h+units+'; scaleF: '+scaleF+'; snapD: '+snapD);
    mode='select';
}
function showDialog(dialog,visible) {
    if(currentDialog) id(currentDialog).style.display='none'; // hide any currentDialog
    id('shadeMenu').style.display='none';
    id(dialog).style.display=(visible)?'block':'none'; // show/hide dialog
    currentDialog=(visible)?dialog:null; // update currentDialog
    // console.log('current dialog: '+currentDialog);
}
function showShadeMenu(visible,x,y) {
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
function type(el) {
    if(el instanceof SVGPolylineElement) {
        return 'polyline';
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
    else if(el instanceof SVGSVGElement) {
        return 'combi';
    }
}
function prompt(text) {
    id('prompt').innerHTML=text; //display text for 3 secs
    id('prompt').style.display='block';
    setTimeout(function(){id('prompt').style.display='none'},3000);
}
function showSizes(visible,promptText) {
    id('sizes').style.display=(visible)?'block':'none';
    if(visible) prompt(promptText);
}
function setSizes(polar,arc) {
    if(polar) {
        w=Math.abs(x-x0);
        h=Math.abs(y-y0);
        var r=Math.round(Math.sqrt(w*w+h*h));
        id('first').value=r;
        id('between').innerHTML=units;
        r=Math.atan((y-y0)/(x-x0)); // radians
        r=Math.round(r*180/Math.PI); // degrees...
        if(!arc) r+=90; // ...as compass bearings
        if(x<x0) r+=180; 
        id('second').value=r;
        id('after').innerHTML='&deg;';
    }
    else {
        id('first').value=w;
        id('between').innerHTML='x';
        id('second').value=h;
        id('after').innerHTML=units;
    }
    // PUT ELEMENT SPIN INTO 'spin' BOX
}
function getArc(d) {
    console.log('get arc from: '+d);
    var from=1;
    var to=d.indexOf(',');
    arc.centreX=parseInt(d.substr(from,to));
    from=to+1;
    to=d.indexOf(' ',from);
    arc.centreY=parseInt(d.substr(from,to));
    from=d.indexOf('M',to)+1;
    to=d.indexOf(',',from);
    arc.startX=parseInt(d.substr(from,to));
    from=to+1;
    to=d.indexOf(' ',from);
    arc.startY=parseInt(d.substr(from,to));
    from=d.indexOf('A')+1;
    to=d.indexOf(',',from);
    arc.radius=parseInt(d.substr(from,to));
    from=to+1;
    to=d.indexOf(',',from);
    arc.major=parseInt(d.charAt(to-1));
    arc.spin=parseInt(d.charAt(to+1));
    from=d.indexOf(' ',to);
    to=d.indexOf(',',from);
    arc.endX=parseInt(d.substr(from,to));
    from=to+1;
    arc.endY=parseInt(d.substr(from));
    console.log('arc centre: '+arc.centreX+','+arc.centreY+' start: '+arc.startX+','+arc.startY+'; radius: '+arc.radius+'; major: '+arc.major+'; spin: '+arc.spin+'; end: '+arc.endX+','+arc.endY);
}
function setArc() {
    console.log('create arc path html from arc properties');
    var d="M"+arc.centreX+","+arc.centreY+" M"+arc.startX+","+arc.startY;
    d+=" A"+arc.radius+","+arc.radius+" 0 "+arc.major+","+arc.spin+" ";
    d+=arc.endX+","+arc.endY;
    console.log('set arc d to: '+d);
    return d;
}
function blueArc() {
    id('blueArc').setAttribute('d','M'+arc.centreX+','+arc.centreY+' M'+arc.startX+','+arc.startY+' A'+arc.radius+','+arc.radius+' 0 '+arc.major+','+arc.spin+' '+arc.endX+','+arc.endY);
}
function remove(el) {
    elementID=el.id
    // var elementNodes=nodes.filter(belong);
    var n=nodes.length;
    for(var i=0;i<nodes.length;i++) { // remove element's snap nodes
        if(nodes[i].el==elementID) nodes.splice(i,1);
    }
    console.log((n-nodes.length)+' nodes deleted');
    id('dwg').removeChild(el); // remove element from SVG
    var dbTransaction=db.transaction('elements',"readwrite");
	// console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('elements');
	// console.log("indexedDB objectStore ready");
	var request=dbObjectStore.delete(elementID);
	request.onsuccess=function(event) {
	    console.log('element deleted from database');
	}
	request.onerror=function(event) {
	    console.log("error deleting element");
	};
}
function move(el,dx,dy) {
    switch(type(el)) {
        case 'polyline':
            console.log('move all points by '+dx+','+dy);
            for(var i=0;i<el.points.length;i++) {
                el.points[i].x+=dx;
                el.points[i].y+=dy;
            }
            // console.log(element.points.length+' points adjusted');
            updateElement(el.id,'points',el.getAttribute('points'));
            break;
        case 'box':
        case 'text':
        case 'combi':
            console.log('move by '+dx+','+dy);
            var val=parseInt(el.getAttribute('x'));
            val+=dx;
            el.setAttribute('x',val);
            updateElement(el.id,'x',val);
            val=parseInt(el.getAttribute('y'));
            val+=dy;
            el.setAttribute('y',val);
            updateElement(el.id,'y',val);
            break;
        case 'oval':
            var val=parseInt(el.getAttribute('cx'));
            val+=dx;
            el.setAttribute('cx',val);
            updateElement(el.id,'cx',val);
            val=parseInt(el.getAttribute('cy'));
            val+=dy;
            el.setAttribute('cy',val);
            updateElement(el.id,'cy',val);
            break;
        case 'arc':
            // move centre, start and end points by moveX, moveY
            var d=el.getAttribute('d');
            getArc(d);
            arc.centreX+=dx;
            arc.centreY+=dy;
            arc.startX+=dx;
            arc.startY+=dy;
            arc.endX+=dx;
            arc.endY+=dy;
            d=setArc();
            el.setAttribute('d',d);
            updateElement(el.id,'centreX',arc.centreX);
            updateElement(el.id,'centreY',arc.centreY);
            updateElement(el.id,'startX',arc.startX);
            updateElement(el.id,'startY',arc.startY);
            updateElement(el.id,'endX',arc.endX);
            updateElement(el.id,'endY',arc.endY);
            break;
    }
    for(var i=0;i<nodes.length;i++) {
        if(nodes[i].el==el.id) { // move nodes
            nodes[i].x+=dx;
            nodes[i].y+=dy;
        }
    }
}
function belong(node) {
    return node.el==elementID;
}
function snapCheck() {
    // console.log('check for snap-to-node');
    var nearNodes=nodes.filter(nearby);
    // console.log('snap potential: '+nearNodes.length);
    if(nearNodes.length>0) {
        var dMin=2*snapD;
        var d=0;
        for (var i=0;i<nearNodes.length;i++) {
            // console.log('element '+nearNodes[i].el+' at '+nearNodes[i].x+','+nearNodes[i].y);
            d=Math.abs(nearNodes[i].x-x)+Math.abs(nearNodes[i].y-y);
            if(d<dMin) {
                dMin=d;
                x=nearNodes[i].x;
                y=nearNodes[i].y;
                // console.log('snap to '+x+','+y);
                prompt('snap');
            }
        }
        return true;
    }
    // console.log('no snap-to-node');
    else if(Math.abs(x-datumX)<snapD) {
        x=datumX;
        return true;
    }
    else if(Math.abs(y-datumY)<snapD) {
        y=datumY;
        return true;
    }
    else return false;
}
function nearby(node) {
    return (node.x>x-snapD)&&(node.x<x+snapD)&&(node.y>y-snapD)&&(node.y<y+snapD);
}
function updateElement(id,attribute,val) {
    var dbTransaction=db.transaction('elements',"readwrite");
	// console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('elements');
	// console.log("indexedDB objectStore ready");
	var request=dbObjectStore.get(id);
	request.onsuccess=function(event) {
	    var el=request.result;
	    switch(attribute) {
	        case 'x':
	            el.x=val;
	            break;
	        case 'y':
	            el.y=val;
	            break;
	        case 'width':
	            el.width=val;
	            break;
	        case 'height':
	            el.height=val;
	            break;
	        case 'points':
	            el.points=val;
	            break;
	        case 'cx':
	            el.cx=val;
	            break;
	        case 'cy':
	            el.cy=val;
	            break;
	        case 'rx':
	            el.rx=val;
	            break;
	        case 'ry':
	            el.ry=val;
	            break;
	        case 'centreX':
	            el.centreX=val;
	            break;
	        case 'centreY':
	            el.centreY=val;
	            break;
	        case 'startX':
	            el.startX=val;
	            break;
	        case 'startY':
	            el.startY=val;
	            break;
	        case 'endX':
	            el.endX=val;
	            break;
	        case 'endY':
	            el.endY=val;
	            break;
	        case 'stroke':
	            el.stroke=val;
	            break;
	        case 'lineW':
	            el.lineW=val;
	            break;
	        case 'lineStyle':
	            el.lineStyle=val;
	            break;
	        case 'fill':
	            el.fill=val;
	            break;
	        case 'opacity':
	            el.opacity=val;
	            break;
	        case 'textSize':
	            el.textSize=val;
	            break;
	        case 'textStyle':
	            el.textStyle=val;
	            break;
	        // ALSO TEXT SIZE AND TRANSFORM
	    }
	    // console.log('element '+id+' '+attribute+' changed to '+val);
	    request=dbObjectStore.put(el);
	    request.onsuccess=function(event) {
			console.log('element '+id+' updated');
		};
		request.onerror=function(event) {
		    console.log("PUT error updating element "+id);
		};
	}
	request.onerror=function(event) {
	    console.log("GET error updating element");
	};
}
// SAVE DRAWING AS SVG FILE _ PRINT AS PDF AT 100% SCALE
function saveSVG() {
    id('datumGroup').style.display='none';
    var fileName=id('printName').value+'.svg';
    var svg=id('drawing').innerHTML;
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
	id('datumGroup').style.display='block';
}
function report(text) {
	console.log(text);
}
// START-UP CODE
var request=window.indexedDB.open("ddDB");
request.onsuccess=function(event) {
    db=event.target.result;
    // console.log("ddDB open");
    var dbTransaction=db.transaction('elements',"readwrite");
    var dbObjectStore=dbTransaction.objectStore('elements');
    nodes=[];
    var request=dbObjectStore.openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if (cursor) {
            var el=cursor.value;
            var html="<"+el.type+" id='"+el.id+"' ";
            console.log('load '+el.type+' element '+el.id);
            switch(el.type) {
                case 'polyline':
                    html+="points='"+el.points+"' ";
                    html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
                    if(el.lineStyle) html+="stroke-dasharray='"+el.lineStyle+"' ";
                    // html+="stroke-opacity='"+el.opacity+"' ";
                    html+="fill='"+el.fill+"' ";
                    html+="fill-opacity='"+el.opacity+"' ";
                    if(el.transform) html+="transform='"+el.transform+"'";
                    html+="></polyline>";
                    // console.log('add element svg: '+html);
                    for(var i=0;i<el.points.length;i++) {
                        nodes.push({'x':el.points[i].x,'y':el.points[i].y,'el':el.id});
                    }
                    break;
                case 'rect':
                    html+="x='"+el.x+"' y='"+el.y+"' width='"+el.width+"' height='"+el.height+"' rx='"+el.radius+"' ";
                    html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
                    if(el.lineStyle) html+="stroke-dasharray='"+el.lineStyle+"' ";
                    // html+="stroke-opacity='"+el.opacity+"' ";
                    html+="fill='"+el.fill+"' ";
                    html+="fill-opacity='"+el.opacity+"' ";
                    if(el.transform) html+="transform='"+el.transform+"'";
                    html+="></rect>";
                    // console.log('add element svg: '+html);
                    nodes.push({'x':el.x,'y':el.y,'el':el.id});
                    nodes.push({'x':el.x,'y':el.y+el.height,'el':el.id});
                    nodes.push({'x':el.x+el.width,'y':el.y,'el':el.id});
                    nodes.push({'x':el.x+el.width,'y':el.y+el.height,'el':el.id});
                    break;
                case 'ellipse':
                    html+="cx='"+el.cx+"' cy='"+el.cy+"' rx='"+el.rx+"' ry='"+el.ry+"' ";
                    html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
                    if(el.lineStyle) html+="stroke-dasharray='"+el.lineStyle+"' ";
                    // html+="stroke-opacity='"+el.opacity+"' ";
                    html+="fill='"+el.fill+"' ";
                    html+="fill-opacity='"+el.opacity+"' ";
                    if(el.transform) html+="transform='"+el.transform+"'";
                    html+="></ellipse>";
                    // console.log('add element svg: '+html);
                    nodes.push({'x':el.cx,'y':el.cy,'el':el.id});
                    nodes.push({'x':el.cx-el.rx,'y':el.cy,'el':el.id});
                    nodes.push({'x':el.cx+el.rx,'y':el.cy,'el':el.id});
                    nodes.push({'x':el.cx,'y':el.cy-el.ry,'el':el.id});
                    nodes.push({'x':el.cx,'y':el.cy+el.ry,'el':el.id});
                    break;
                case 'path':
                    html+=" d='M"+el.centreX+","+el.centreY+" M"+el.startX+","+el.startY+" A"+el.radius+","+el.radius+" 0 "+el.major+","+el.spin+" "+el.endX+","+el.endY+"' ";
                    html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
                    if(el.lineStyle) html+="stroke-dasharray='"+el.lineStyle+"' ";
                    // html+="stroke-opacity='"+el.opacity+"' ";
                    html+="fill='"+el.fill+"' ";
                    html+="fill-opacity='"+el.opacity+"' ";
                    if(el.transform) html+="transform='"+el.transform+"'";
                    html+="></path>";
                    // console.log('add element svg: '+html);
                    nodes.push({'x':el.centreX,'y':el.centreY,'el':el.id});
                    nodes.push({'x':el.startX,'y':el.startY,'el':el.id});
                    nodes.push({'x':el.endX,'y':el.endY,'el':el.id});
                    break;
                case 'text':
                    console.log('load text element');
                    html+=" x='"+el.x+"' y='"+el.y+"' ";
                    html+="font-size='"+(el.textSize*scale)+"' ";
                    if(el.textStyle=='bold') html+="font-weight='bold' ";
                    else if(el.textStyle=='italic') html+="font-style='italic' ";
                    html+="stroke='none' fill='"+el.fill+"' ";
                    if(el.transform) html+="transform='"+el.transform+"'";
                    html+=">"+el.text+"</text>";
                    console.log('html: '+html);
                    break;
                case 'combi':
                    console.log('load combi no. '+el.no);
                    var val=el.id;
                    console.log('id: '+val);
                    // retrieve combi from combis database
                    db.transaction('combis').objectStore('combis').get(el.no).onsuccess=function(event) {
                        combi=event.target.result;
                        console.log('combi '+combi.id+' is '+combi.name);
                        var s=(combi.nts>0)?scale:1;
                        var elementID='~'+elID;
                        var html="<svg id='"+val+"' x='"+el.x+"' y='"+el.y+"' ax='"+(combi.ax*s)+"' ay='"+(combi.ay*s)+"'>";
                        html+="<g transform='scale("+s+")'>"+combi.svg+"</g></svg>";
                        console.log('combi html: '+html);
                        id('dwg').innerHTML+=html;
                        /* NO NEED FOR combis ARRAY?
                        combis.push({'el':val,'x':el.x,'y':el.y,'w':(combi.width*s),'h':(combi.height*s),'ax':(combi.ax*s),'ay':(combi.ay*s)});
                        */
                        elID++;
                        nodes.push({'x':el.x,'y':el.y,'el':elementID});
                    }
            }
            var len=nodes.length;
            console.log(len+ ' nodes');
            // for(var i=len-4;i<len;i++) console.log('node: '+nodes[i].x+','+nodes[i].y+' el:'+nodes[i].el);
            if(el.stroke=='blue') id('ref').innerHTML+=html; // blue lines go into <ref> layer
            else id('dwg').innerHTML+=html;
            elID=parseInt(el.id.substr(1))+1;
	    	cursor.continue();  
        }
	    else {
		    console.log("No more entries. elID: "+elID);
	    }
    };
    console.log('all elements loaded');
    var dbTransaction=db.transaction('combis',"readwrite");
    console.log("indexedDB transaction ready");
    var dbObjectStore=dbTransaction.objectStore('combis');
    var request=dbObjectStore.openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if(cursor) {
            var combi=cursor.value;
            // GET COMBI NAME AND ADD TO combiList AS AN OPTION
            var name=combi.name;
            console.log('add combi '+name);
            var html="<option value="+combi.id+">"+name+"</option>";
            id('combiList').innerHTML+=html;
            console.log('added');
	    	cursor.continue();  
        }
	    else {
		    console.log("No more combis");
	    }
    };
};
request.onupgradeneeded=function(event) {
	var dbObjectStore=event.currentTarget.result.createObjectStore("elements",{ keyPath:'id',autoIncrement:false });
	console.log("new elements ObjectStore created");
	dbObjectStore=event.currentTarget.result.createObjectStore("combis",{ keyPath:'id',autoIncrement:true });
	console.log("new combis ObjectStore created");
};
request.onerror=function(event) {
	alert("indexedDB error");
};

// implement service worker if browser is PWA friendly
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
}
else { //Register the ServiceWorker
	navigator.serviceWorker.register('ddSW.js').then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}