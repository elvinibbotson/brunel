// GLOBAL VARIABLES
var dbVersion=2;
var saved=false; // flags whether drawing has been saved
var aspect=null;
var scale=1; // default scale is 1:1
var hand='left';
var grid=300; // default grid size is 300mm
var gridSnap=false; // grid snap off by default
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
var datum={'x':0,'y':0};
var offset={'x':0,'y':0};
var arc={};
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
hand=window.localStorage.getItem('hand');
if(!hand) hand='left';
grid=window.localStorage.getItem('grid');
if(!grid) grid=300;
id('gridSize').value=grid;
gridSnap=window.localStorage.getItem('gridSnap');
if(!gridSnap) gridSnap=false;
id('grid').checked=gridSnap;
// units=window.localStorage.getItem('units');
if(!aspect) {
    aspect=(scr.w>scr.h)?'landscape':'portrait';
    id('aspect').innerHTML=aspect;
    showDialog('newDrawing',true);
}
else initialise();
// disable annoying pop-up menu
document.addEventListener('contextmenu', event => event.preventDefault());
// TOOLS
id('docButton').addEventListener('click',function() { // SHOULD SHOW FILE MENU BUT FOR NOW...
    showDialog('fileMenu',true);
});
id('new').addEventListener('click',function() {
    if(!saved) alert('You may want to save your work before starting a new drawing');
    console.log("show newDrawingDialog");
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
    // units=(id('mm').checked)?'mm':'in';
    console.log('create new drawing - aspect:'+aspect+' scale:'+scale);
    window.localStorage.setItem('aspect',aspect);
    window.localStorage.setItem('scale',scale);
    // window.localStorage.setItem('units',units);
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
    showDialog('newDrawingDialog',false);
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
id('cancelSettings').addEventListener('click',function() {
    showDialog('settingsDialog',false);
});
id('confirmSettings').addEventListener('click',function() {
    grid=id('gridSize').value;
    gridSnap=id('grid').checked;
    window.localStorage.setItem('grid',grid);
    window.localStorage.setItem('gridSnap',gridSnap);
    console.log('grid size: '+grid+' grid snap is '+gridSnap);
    boxR=id('boxRadius').value*scale;
    if(id('leftLayout').checked) {
        hand='left';
        window.localStorage.setItem('hand','left');
        setLayout();
    }
    else {
        hand='right';
        window.localStorage.setItem('hand','right');
        setLayout();
    }
    showDialog('settingsDialog',false);
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
    // if(units=='mm') {
    snapD=5*scale;
    handleR=2.5*scale;
    /*
    }
    else { // inches
        snapD=0.2*scale;
        handleR=0.1*scale;
    }
    */
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
        updateGraph(elementID,['text',text]);
    }
    else {
        console.log('add text '+text);
        var graph={}
	    graph.type='text';
	    graph.text=text;
	    graph.x=x0;
        graph.y=y0;
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
    id('combiList').value=null; // clear selection for next time
    showDialog('combiDialog',false);
})
// EDIT TOOLS
id('deleteButton').addEventListener('click',function() {
    prompt('DELETE');
    for(var i=0;i<selection.length;i++) console.log('delete '+selection[i]);
    console.log('element is '+elementID);
    if(selection.length>0) {
        while(selection.length>0) remove(selection.pop());
    }
    else remove(elementID);
    element=elementID=null;
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
    showDialog('textDialog',false);
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
    if(selection.length<1) selection.push(elementID);
    while(selection.length>0) {
        element=id(selection.pop());
        move(element,moveX,moveY);
    }
    /*
    if(selection.length>0) {
        for(var i=0;i<selection.length;i++) move(selection[i],moveX,moveY);
        return;
    }
    else move(element,moveX,moveY);
    */
    showDialog('moveDialog',false);
    id('blueBox').setAttribute('width',0);
    id('blueBox').setAttribute('height',0);
    id('handles').innerHTML='';
    id('selection').innerHTML='';
    selected=[];
    mode='select';
    showSizes(false);
    elementID=null;
});
id('flipButton').addEventListener('click',function() {
    if(selection.length>0) {
        prompt('Sorry. Cannot flip multiple selection');
        return;
    }
    console.log('show flip dialog');
    showDialog('flipDialog',true);
});
id('flipOptions').addEventListener('click',function() {
    var opt=Math.floor((event.clientX-parseInt(id('flipDialog').offsetLeft)+5)/32);
    console.log('click on '+opt);
    var static=id('static').checked; // flip in place?
    element=id(elementID);
    if(static) { // flip in place - horizontally or vertically, using transform
        var transform=element.getAttribute('transform');
        console.log('current transform: '+transform);
        if(!transform) transform='';
        var anchor=0;
        if(opt<2) {
            switch(type(element)) {
                case 'line':
                    anchor=element.points[0].x;
                    break;
                case 'box':
                case 'text':
                case 'combi':
                    anchor=parseInt(element.getAttribute('x'));
                    break;
                case 'oval':
                case 'arc':
                    anchor=parseInt(element.getAttribute('cx'));
            }
            transform+='translate('+(2*anchor)+',0) scale(-1,1)';
        }
        else {
            switch(type(element)) {
                case 'line':
                    anchor=element.points[0].y;
                    break;
                case 'box':
                case 'text':
                case 'combi':
                    anchor=parseInt(element.getAttribute('y'));
                    break;
                case 'oval':
                case 'arc':
                    anchor=parseInt(element.getAttribute('cy'));
            }
            transform+='translate(0,'+(2*anchor)+') scale(1,-1)';
        }
        element.setAttribute('transform',transform);
    }
    else { // flipped copy
        
    }
    mode='select';
    element=elementID=null;
    id('handles').innerHTML='';
    showDialog('flipDialog',false);
})
id('repeatButton').addEventListener('click',function() {
    if(selection.length>0) {
        prompt('Sorry. Cannot repeat multiple selection');
        return;
    }
    showDialog('textDialog',false);
    // id('countH').value=id('countV').value=id('distH').value=id('distV').value=0;
    showDialog('repeatDialog',true);
});
id('cancelRepeat').addEventListener('click',function() {
    showDialog('repeatDialog',false);
});
id('confirmRepeat').addEventListener('click',function() {
    var nH=id('countH').value;
    var nV=id('countV').value;
    var dH=id('distH').value;
    var dV=id('distV').value;
    element=id(elementID);
    var request=db.transaction('graphs').objectStore('graphs').get(Number(elementID));
    request.onsuccess=function(event) {
        var graph=request.result;
        // console.log('retrieved graph '+graph.type);
        for(var i=0;i<nH;i++) {
            for(var j=0;j<nV;j++) {
                if(i<1 && j<1) continue; // skip in-place duplicate
                var g={};
                g.type=graph.type;
                if(g.type!='combi') {
                    g.stroke=graph.stroke;
                    g.lineW=graph.lineW;
                    g.lineStyle=graph.lineStyle;
                    g.fill=graph.fill;
                    g.opacity=graph.opacity;
                }
                switch(g.type) {
                    case 'line':
                        var points=graph.points;
                        for(var p=0;p<points.length;p++) {
                            points.x+=i*dH;
                            points.y+=j*dV;
                        }
                        g.setAttribute('points',points);
                        addGraph(g);
                        break;
                    case 'box':
                        g.x=graph.x+i*dH;
                        g.y=graph.y+j*dV;
                        g.width=graph.width;
                        g.height=graph.height;
                        g.radius=graph.radius;
                        // console.log('copy['+i+','+j+'] '+g.type+' at '+g.x+','+g.y);
                        addGraph(g);
                        break;
                    case 'text':
                        g.x=graph.x+i*dH;
                        g.y=graph.y+j*dV;
                        g.text=graph.text;
                        g.textSize=graph.textSize;
                        g.textStyle=graph.textStyle;
                        addGraph(g);
                        break;
                    case 'combi':
                        g.x=graph.x+i*dH;
                        g.y=graph.y+j*dV;
                        g.width=graph.width;
                        g.height=graph.height;
                        addGraph(g);
                        break;
                    case 'oval':
                        g.cx=graph.cx+i*dH;
                        g.cy=graph.cy+j*dV;
                        g.rx=graph.rx;
                        g.ry=graph.ry;
                        // console.log('copy '+g.type+' at '+g.cx+','+g.cy);
                        addGraph(g);
                        break;
                    case 'arc':
                        g.cx=graph.cx+i*dH;
                        g.cy=graph.cy+j*dV;
                        g.x1=graph.x1+i*dH;
                        g.y1=graph.y1+j*dV;
                        g.x2=graph.y2+i*dH;
                        g.y2=graph.y2+j*dV;
                        g.r=graph.r;
                        g.major=graph.major;
                        g.sweep=graph.sweep;
                        console.log('copy['+i+','+j+'] of '+g.type+' at '+g.cx+','+g.cy);
                        addGraph(g);
                        break;
                    }
            }
        }
    }
    id('handles').innerHTML='';
    mode='select';
    showDialog('repeatDialog',false);
    showSizes(false);
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
        updateGraph(elementID,['lineStyle',val]);
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
        updateGraph(element.id,['lineW',val]);
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
            updateGraph(element.id,['textSize',val]);
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
            updateGraph(element.id,['textStyle',val]);
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
        updateGraph(elementID,['opacity',val]);
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
        if(elementID) { // change selected element
            element=id(elementID);
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
                    remove(elementID,true); // remove from database keeping nodes for snap
                    elementID=null;
                    selection=[];
                    id('handles').innerHTML=''; //remove element handles
                    showSizes(false);
                    showEditTools(false);
                }
            }
            /* NOW ABOVE
            if(val=='blue') { // <ref> layer
                id('ref').appendChild(element); // move to <ref> layer
                // console.log('element moved to <ref> layer');
                mode='select'; // deselect element
                remove(elementID,true); // remove from database keeping nodes for snap
                elementID=null;
                selection=[];
                id('handles').innerHTML=''; //remove element handles
                showSizes(false);
                showEditTools(false);
            }
            */
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
        if(elementID) { // change selected element
            element=id(elementID);
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
    event.preventDefault();
    if(currentDialog) showDialog(currentDialog,false); // clicking drawing removes any dialogs/menus
    id('shadeMenu').style.display='none';
    scr.x=Math.round(event.clientX);
    scr.y=Math.round(event.clientY);
    x=x0=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=y0=Math.round(scr.y*scaleF/zoom+dwg.y);
    // TEST FOR TOUCHING EDIT HANDLES
    var val=event.target.id;
    console.log('touch on '+val);
    var holder=event.target.parentNode.id;
    console.log('holder is '+holder);
    if(holder=='selection') { // click on a blue box to move multiple selectin
        console.log('move group selection');
        mode='move';
        prompt('drag to MOVE selection');
    }
    else if(val.startsWith('handle')) { // edit using handle
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
            offset.x=bounds.x-x0; // offsets to top-left corner
            offset.y=bounds.y-y0;
            console.log('offsets: '+dx+','+dy);
            // x0=bounds.x; // adjust to top-left
            // y0=bounds.y;
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
    /*
    else if(val=='datum') {
        console.log('move datum');
        mode='datum';
        prompt('DATUM: drag to move');
        return;
    }
    */
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
            arc.x1=x0;
            arc.y1=y0;
            prompt('ARC: drag to centre');
            id('blueLine').setAttribute('x1',arc.x1);
            id('blueLine').setAttribute('y1',arc.y1);
            id('blueLine').setAttribute('x2',arc.x1);
            id('blueLine').setAttribute('y2',arc.y1);
            break;
        case 'arcEnd': // no action until move pointer
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
	        graph.no=combiID;
	        db.transaction('combis').objectStore('combis').get(combiID).onsuccess=function(event) {
                combi=event.target.result;
                console.log('combi '+combiID+' is '+combi.name);
                var s=(combi.nts>0)?scale:1;
	            graph.x=x0-combi.ax*s;
	            graph.y=y0-combi.ax*s;
	            addGraph(graph);
                /*
	            var request=db.transaction('graphs','readwrite').objectStore('graphs').add(graph);
	            request.onsuccess=function(event) {
	                graph.id=request.result;
	                console.log('new combi graph added - id: '+graph.id);
	                drawElement(graph);
                };
	            request.onerror=function(event) {
	                console.log('error adding new combi element');
	            };
	            */
            }
            mode='select';
            break;
        case 'select':
            id('blueBox').setAttribute('x',x0);
            id('blueBox').setAttribute('y',y0);
            selectionBox.x=x0;
            selectionBox.y=y0;
            selectionBox.w=selectionBox.h=0;
            showSizes(true,'SELECT: drag selection box');
            // prompt('SELECT: drag selection box');
    }
    event.stopPropagation();
})
// POINTER MOVE
id('graphic').addEventListener('pointermove',function() {
    // console.log('DRAG - offsets: '+dx+','+dy);
    event.preventDefault();
    scr.x=Math.round(event.clientX);
    scr.y=Math.round(event.clientY);
    x=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=Math.round(scr.y*scaleF/zoom+dwg.y);
    
    // TRY THIS...
    if(mode!='arcEnd') {
        snap=snapCheck(); // snap to nearby nodes, datum,...
        if(snap) { // shift datum to snap point to allow easy horizontal/vertical alignment
            // id('datum').setAttribute('cx',x);
            // id('datum').setAttribute('cy',y);
            id('datumH').setAttribute('y1',y);
            id('datumH').setAttribute('y2',y);
            id('datumV').setAttribute('x1',x);
            id('datumV').setAttribute('x2',x);
        }
        if(Math.abs(x-x0)<snapD) x=x0; // ...vertical...
        if(Math.abs(y-y0)<snapD) y=y0; // ...or horizontal
    }

    if(mode.startsWith('movePoint')) {
        var n=parseInt(mode.substr(9));
        console.log('drag polyline point '+n);
        id('bluePolyline').points[n].x=x;
        id('bluePolyline').points[n].y=y;
    }
    else switch(mode) {
        /*
        case 'datum':
            snap=snapCheck();
            id('datum').setAttribute('cx',x);
            id('datum').setAttribute('cy',y);
            id('datumH').setAttribute('y1',y);
            id('datumH').setAttribute('y2',y);
            id('datumV').setAttribute('x1',x);
            id('datumV').setAttribute('x2',x);
            datumX=x;
            datumY=y;
            break;
        */
        case 'move':
            if(selection.length>0) { // move multiple selection
                dx=x-x0;
                dy=y-y0;
                id('selection').setAttribute('transform','translate('+dx+','+dy+')');
            }
            else { // drag single element
                // console.log('move element '+elementID+' to '+x+','+y);
                id('blueBox').setAttribute('x',(x+offset.x));
                id('blueBox').setAttribute('y',(y+offset.y));
            }
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
            setSizes(true);
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
            setSizes(true);
            id('blueRadius').setAttribute('x2',arc.x2);
            id('blueRadius').setAttribute('y2',arc.y2);
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
            setSizes();
    }
    event.stopPropagation();
})
// POINTER UP
id('graphic').addEventListener('pointerup',function() {
    // console.log('touch-end at '+x+','+y);
    snap=snapCheck();
    if(mode.startsWith('movePoint')) { // move polyline point
        id('handles').innerHTML='';
        var n=parseInt(mode.substr(9));
        console.log('move polyline point '+n);
        element.points[n].x=x;
        element.points[n].y=y;
        id('bluePolyline').setAttribute('points','0,0');
        updateGraph(elementID,['points',element.getAttribute('points')]);
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
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            // var counter=selection.length; // move single or multiple selected elements
            if(selection.length>0) {
                dx=x-x0;
                dy=y-y0;
                console.log('selection moved by '+dx+','+dy);
            }
            else selection.push(elementID); // move single element
            dx=x-x0;
            dy=y-y0;
            console.log('move '+selection.length+' elements');
            while(selection.length>0) {
                elementID=selection.pop();
                console.log('move element '+elementID);
                element=id(elementID);
                var val=type(element);
                console.log('element type: '+val);
                switch(val) {
                    case 'line':
                        console.log('move all points by '+dx+','+dy);
                        for(var i=0;i<element.points.length;i++) {
                            element.points[i].x+=dx;
                            element.points[i].y+=dy;
                        }
                        // console.log(element.points.length+' points adjusted');
                        updateGraph(elementID,['points',element.getAttribute('points')]);
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
                        updateGraph(elementID,['x',x,'y',y]);
                        /*
                        updateGraph(elementID,'x',x);
                        updateGraph(elementID,'y',y);
                        */
                        break;
                    case 'oval':
                        x=parseInt(element.getAttribute('cx'))+dx;
                        y=parseInt(element.getAttribute('cy'))+dy;
                        element.setAttribute('cx',x);
                        element.setAttribute('cy',y);
                        updateGraph(elementID,['cx',x,'cy',y]);
                        /*
                        updateGraph(elementID,'cx',x);
                        updateGraph(elementID,'cy',y);
                        */
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
                        updateGraph(elementID,['cx',arc.cx,'cy',arc.cy,'x1',arc.x1,'x2',arc.x2,'y2',arc.y2]);
                        /*
                        updateGraph(elementID,'cx',arc.cx);
                        updateGraph(elementID,'cy',arc.cy);
                        updateGraph(elementID,'x1',arc.x1);
                        updateGraph(elementID,'y1',arc.y1);
                        updateGraph(elementID,'x2',arc.x2);
                        updateGraph(elementID,'y2',arc.y2);
                        */
                        break;
                }
                var elementNodes=nodes.filter(belong);
                for(var i=0; i<elementNodes.length;i++) {
                    elementNodes[i].x+=dx;
                    elementNodes[i].y+=dy;
                }
            }
            id('selection').setAttribute('transform','translate(0,0)');
            id('selection').innerHTML='';
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
            updateGraph(elementID,['width',dx,'height',dy]);
            element.setAttribute('height',dy);
            // updateGraph(elementID,'height',dy);
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            var elNodes=nodes.filter(belong);
            elNodes[0].x=elNodes[2].x=elNodes[5].x=element.getAttribute('x'); // left edge
            elNodes[0].y=elNodes[1].y=elNodes[4].y=element.getAttribute('y'); // top edge
            elNodes[1].x=elNodes[3].x=elNodes[6].x=element.getAttribute('x')+element.getAttribute('width'); //right edge
            elNodes[2].y=elNodes[3].y=elNodes[7].y=element.getAttribute('y')+element.getAttribute('height'); // bottom edge
            elNodes[4].x=elNodes[7].x=elNodes[8].x=element.getAttribute('x')+element.getAttribute('width')/2; // mid-width
            elNodes[5].y=elNodes[6].y=elNodes[8].y=element.getAttribute('y')+element.getAttribute('height')/2; // mid-height
            elNodes[0].el=elNodes[1].el=elNodes[2].el=elNodes[3].el=elNodes[4].el=elNodes[5].el=elNodes[6].el=elNodes[7].el=elNodes[8].el=elementID;
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
            updateGraph(elementID,['rx',dx,'ry',dy]);
            element.setAttribute('ry',dy);
            // updateGraph(elementID,'ry',dy);
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
            r=Math.sqrt((dx*dx)+(dy*dy));
            console.log('touch end - radius: '+r);
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
            updateGraph(elementID,['x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2,'r',arc.r]);
            /*
            updateGraph(elementID,'x1',arc.x1);
            updateGraph(elementID,'y1',arc.y1);
            updateGraph(elementID,'x2',arc.x2);
            updateGraph(elementID,'y2',arc.y2);
            updateGraph(elementID,'a1',r);
            */
            var arcNodes=nodes.filter(belong);
            console.log(arcNodes.length+' arc nodes');
            arcNodes[0].x=arc.cx;
            arcNodes[0].y=arc.cy;
            arcNodes[1].x=arc.x1;
            arcNodes[1].y=arc.y1;
            arcNodes[2].x=arc.x2;
            arcNodes[2].y=arc.y2;
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
                // remove duplicate end-point
                var points='';
                for(var i=0;i<id('bluePolyline').points.length-1;i++) {
                    points+=id('bluePolyline').points[i].x+','+id('bluePolyline').points[i].y+' ';
                }
                console.log('points: '+points);
                // create polyline element
                var graph={};
	            graph.type='line';
	            graph.points=points;
	            graph.stroke=lineShade;
	            graph.lineW=(pen*scale);
	            graph.lineStyle=lineType;
	            graph.fill='none';
	            addGraph(graph);
	            id('bluePolyline').setAttribute('points','0,0');
                /*
	            var request=db.transaction('graphs','readwrite').objectStore('graphs').add(graph);
		        request.onsuccess=function(event) {
		            graph.id=request.result;
			        console.log("new polyline element added - id: "+graph.id);
			        drawElement(graph);
			        id('bluePolyline').setAttribute('points','0,0');
		        };
		        request.onerror=function(event) {
		            console.log("error adding new poly/line element");
		        };
	            element.points.length;i++) {
                    nodes.push({'x':element.points[i].x,'y':element.points[i].y,'el':elementID});
                    console.log('node added at '+element.points[i].x+','+element.points[i].y);
                    if(i>0) { // add nodes at middle of each segment
                        x=(element.points[i-1].x+element.points[i].x)/2;
                        y=(element.points[i-1].y+element.points[i].y)/2;
                        nodes.push({'x':x,'y':y,'el':elementID});
                        console.log('intermediate node at '+x+','+y);
                    }
                }
                */
                element=elementID=null;
                showSizes(false);
                mode='select';
            }
            break;
        case 'box':
            var graph={}
	        graph.type='box';
	        graph.x=(x>x0)?x0:x;
	        graph.y=(y>y0)?y0:y;
	        graph.width=Math.abs(x-x0);
	        graph.height=Math.abs(y-y0);
	        graph.radius=rad;
	        graph.stroke=lineShade;
	        graph.lineW=pen*scale;
	        graph.lineStyle=lineType;
	        graph.fill=fillShade;
	        graph.opacity=opacity;
	        var request=db.transaction('graphs','readwrite').objectStore('graphs').add(graph);
            request.onsuccess=function(event) {
                graph.id=request.result;
			    console.log("new box element added to database - id: "+graph.id);
			    drawElement(graph);
		    };
		    request.onerror=function(event) {
		        console.log("error adding new box element");
		    };
            id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            element=elementID=null;
            mode='select';
            break;
        case 'oval':
            var graph={};
	        graph.type='oval';
	        graph.cx=x0;
	        graph.cy=y0;
	        graph.rx=w/2;
	        graph.ry=h/2;
	        graph.stroke=lineShade
	        graph.lineStyle=lineType;
	        graph.lineW=pen*scale;
	        graph.fill=fillShade;
	        graph.opacity=opacity;
	        addGraph(graph);
	        /*
	        var request=db.transaction('graphs','readwrite').objectStore('graphs').add(graph);
	        request.onsuccess=function(event) {
	            graph.id=request.result;
			    console.log("new oval graph added: "+graph.id);
			    drawElement(graph);
		    };
		    request.onerror=function(event) {
		        console.log("error adding new oval element");
		    };
		    */
		    id('blueOval').setAttribute('rx',0);
            id('blueOval').setAttribute('ry',0);
            element=elementID=null;
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
	        graph.stroke=lineShade
	        graph.lineStyle=lineType;
	        graph.lineW=pen*scale;
	        graph.fill=fillShade;
	        graph.opacity=opacity;
	        addGraph(graph);
	        /*
	        var request=db.transaction('graphs','readwrite').objectStore('graphs').add(graph);
		    request.onsuccess=function(event) {
		        graph.id=request.result;
			    console.log("new arc element added: "+graph.id);
			    drawElement(graph);
		    };
		    request.onerror=function(event) {
		        console.log("error adding new arc element");
		    };
		    */
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
            element=elementID=null;
            mode='select';
            break;
        case 'select':
            id('blueBox').setAttribute('width',0);
            // selection=[];
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
                    }
                    console.log('bounds for '+items[i].id+": "+box.x+','+box.y);
                    console.log('item '+items[i].id+' box: '+box.width+'x'+box.height+' at '+box.x+','+box.y);
                    if(box.x<selectionBox.x) continue;
                    if(box.y<selectionBox.y) continue;
                    if((box.x+box.width)>(selectionBox.x+selectionBox.w)) continue;
                    if((box.y+box.height)>(selectionBox.y+selectionBox.h)) continue;
                    selection.push(items[i].id); // add to selection if passes tests
                    console.log('select '+items[i].id);
                    var html="<rect x='"+box.x+"' y='"+box.y+"' width='"+box.width+"' height='"+box.height+"' ";
                    html+="stroke='none' fill='blue' fill-opacity='0.25' el='"+items[i].id+"'/>";
                    id('selection').innerHTML+=html;
                }
                if(selection.length>0) { // highlight selected elements
                    mode='edit';
                    showEditTools(true);
                }
                // return; THIS DIDN'T ALLOW ADDING TO/REMOVING FROM SELECTION
            }
            showSizes(false);
        case 'edit':
            var el=event.target;
            var hit=null;
            if(el.parentNode.id=='drawing') { // drawing background - check 10x10px zone
                console.log('nothing here - search locality');
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
            if(hit) { // ALLOW ADDING TO/REMOVING FROM SELECTION
            // if(hit && selection.length<1) {
                // IF BOX-SELECT ADD TO (OR REMOVE FROM) 'selection' ARRAY - LIST OF ELEMENT IDs
                // OTHERWISE (CLICK-SELECT) JUST SELECT AN ELEMENT IN snap RANGE
                element=el;
                elementID=hit;
                console.log('sort style then add handles');
                // if(type(el)!='combi')
                if((selection.length<1)&&(type(el)!='combi')) { // combis have no style
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
                if(selection.length<1) { // show handles for individual selection...
                    id('handles').innerHTML=''; // clear any handles then add handles for selected element 
                    console.log('add handles and node markers');
                    switch(type(el)) {
                    case 'line':
                        var bounds=el.getBBox();
                        w=bounds.width;
                        h=bounds.height;
                        var points=el.points;
                        var n=points.length;
                        console.log('bounds: '+w+'x'+h+'mm; '+n+' points');
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
                        html="<rect id='handleSE' x='"+(x+w-handleR)+"' y='"+(y+h-handleR)+"' width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // bottom-right handle adjusts box size keeping aspect ratio
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
                        var html="<circle id='handleCentre' cx="+arc.cx+" cy="+arc.cy+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML=html; // circle handle at arc centre
                        // DO ARC SIZING USING END HANDLE
                        // html="<rect id='handleStart' x="+(arc.startX-handleR)+" y="+(arc.startY-handleR)+" width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        // id('handles').innerHTML+=html; // square handle at arc start...
                        html="<rect id='handleEnd' x="+(arc.x2-handleR)+" y="+(arc.y2-handleR)+" width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // square handle at end point
                        // set up x0 & x for arc radius and included angle
                        var a1=Math.atan((arc.y1-arc.cy)/(arc.x1-arc.cx));
                        if(arc.x1<arc.cx) a1+=Math.PI;
                        // console.log('a1: '+startAngle);
                        var a=Math.atan((arc.y2-arc.cy)/(arc.x2-arc.cx));
                        console.log('end angle: '+a);
                        if(arc.x2<arc.cx) a+=Math.PI;
                        x0=arc.cx; // centre
                        y0=arc.cy;
                        var r=Math.sqrt()
                        x=x0+arc.r*Math.cos(a); // end point
                        y=y0+arc.r*Math.sin(a);
                        a=Math.abs(a-a1); // swept angle - radians
                        console.log('swept angle: '+a+' radians');
                        a*=180/Math.PI; // degrees
                        a=Math.round(a);
                        if(arc.major>0) a=360-a;
                        // a=Math.round(a*180/Math.PI); // nearest degree
                        console.log('x:'+x+' y:'+y+' x0:'+x0+' y0:'+y0+'; arc angle: '+a);
                        setSizes(true,a);
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
                    };
                    // elementID=el.id;
                    // element=id(elementID);
                    // console.log('selected '+type(element)+' '+elementID);
                    for(var i=0;i<nodes.length;i++) {
                        if(nodes[i].el!=elementID) continue;
                        // console.log('node '+i+': '+nodes[i].x+','+nodes[i].y);
                        var html="<circle cx='"+nodes[i].x+"' cy='"+nodes[i].y+"' r='"+scale+"' stroke='blue' stroke-width='"+0.25*scale+"' fill='none'/>";
                        id('handles').innerHTML+=html;
                    }
                }
                else { // ADD TO SELECTION
                    if(selection.indexOf(hit)<0) { // add to selection
                        selection.push(hit);
                        element=id(hit);
                        var box=element.getBBox();
                        if(type(element)=='combi') {
                            console.log('COMBI!'); // FOR COMBIS GET BOUNDS FROM combiBoxes
                            box.x=parseInt(element.getAttribute('x'));
                            box.y=parseInt(element.getAttribute('y'));
                        }
                        var html="<rect x='"+box.x+"' y='"+box.y+"' width='"+box.width+"' height='"+box.height+"' ";
                        html+="stroke='none' fill='blue' fill-opacity='0.25' el='"+hit+"'/>";
                        id('selection').innerHTML+=html;
                    }
                    /* REMOVING FROM SELECTION WAS UNRELIABLE
                    else {
                        console.log('REMOVE FROM SELECTION');
                        var n=selection.indexOf(hit);
                        selection.splice(n,1); // remove from selection
                        var blues=id('selection').childNodes;
                        console.log('selection has '+blues.length+' children');
                        for(n=0;n<blues.length;n++) {
                            if(blues[n].getAttribute('el')==hit) blues[n].remove();
                        }
                    }
                    */
                }
                showEditTools(true);
                // CHECK NODES
                id('selection').innerHTML='';
                /* MOVE TO HANDLES CODE ABOVE
                for(var i=0;i<nodes.length;i++) {
                    if(nodes[i].el!=elementID) continue;
                    // console.log('node '+i+': '+nodes[i].x+','+nodes[i].y);
                    var html="<circle cx='"+nodes[i].x+"' cy='"+nodes[i].y+"' r='"+scale+"' stroke='blue' stroke-width='"+0.25*scale+"' fill='none'/>";
                    id('selection').innerHTML+=html;
                }
                */
            }
            else if(selection.length<1) {
            // else { // no selection
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
        case 'line':
            // console.log('element: '+element.id);
            if(elementID=='bluePolyline') { // adjust length of latest line segment
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
                var elNodes=nodes.filter(belong);
                for(i=0;i<elNodes.length;i++) {
                    elNodes[i].x=points[0].x+(elNodes[i].x-points[0].x)*ratio;
                }
                for(i=1;i<points.length;i++) { // points[0] is start - not affected
                    points[i].x=points[0].x+(points[i].x-points[0].x)*ratio;
                }
                var pts=[];
                var elNodes=nodes.filter(belong);
	            for(var i=0;i<points.length;i++) {
	                pts.push(points[i].x);
	                pts.push(points[i].y);
	            }
                updateGraph(elementID,['points',pts]); // UPDATE DB
                id('handles').innerHTML='';
                mode='select';
            }
            break;
        case 'box':
            console.log('change width of element '+elementID);
            var elX=parseInt(element.getAttribute('x'));
            var elW=parseInt(element.getAttribute('width'));
            element.setAttribute('width',val);
            updateGraph(elementID,['width',val]);
            // console.log('move nodes and handles');
            var elNodes=nodes.filter(belong);
            for(var i=0;i<elNodes.length;i++) { // adjust x-values of nodes...
                if(elNodes[i].x==elX) continue;
                else if(elNodes[i].x==(elX+elW)) elNodes[i].x=elX+val; // RH edge
                else elNodes[i].x=elX+val/2; // mid-width nodes
            }
            id('handles').innerHTML='';
            mode='select';
            /* ...then move RH edit handles
            id('handleNE').setAttribute('x',(elX+val-handleR));
            id('handleSE').setAttribute('x',(elX+val-handleR));
            */
            break;
        case 'oval':
            element.setAttribute('rx',val/2);
            updateGraph(elementID,['rx',val/2]);
            var elX=parseInt(element.getAttribute('cx'));
            var ovalNodes=nodes.filter(belong);
            for(var i=0;i<ovalNodes.length;i++) { // adjust two RH nodes...
                if(ovalNodes[i].x!=elX) {
                    if(ovalNodes[i].x<elX) ovalNodes[i].x=elX-val/2;
                    else ovalNodes[i].x=elX+val/2;
                }
            }
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
            updateGraph(elementID,['x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2,'r',arc.r]);
            /*
            updateGraph(elementID,'x1',arc.x1);
            updateGraph(elementID,'y1',arc.y1);
            updateGraph(elementID,'x2',arc.x2);
            updateGraph(elementID,'y2',arc.y2);
            updateGraph(elementID,'r',r);
            */
            id('handles').innerHTML='';
            mode='select';
            /*
            id('handleStart').setAttribute('x',arc.x1-handleR);
            id('handleStart').setAttribute('y',arc.y1-handleR);
            id('handleEnd').setAttribute('x',arc.x2-handleR);
            id('handleEnd').setAttribute('y',arc.y2-handleR);
            */
            var elNodes=nodes.filter(belong);
            console.log(elNodes.length+' arc nodes');
            elNodes[0].x=arc.cx;
            elNodes[0].y=arc.cy;
            elNodes[1].x=arc.x1;
            elNodes[1].y=arc.y1;
            elNodes[2].x=arc.x2;
            elNodes[2].y=arc.y2;
            break;
    }
})
id('second').addEventListener('change',function() {
    var val=parseInt(id('second').value);
    element=id(elementID);
    // console.log('element '+element+' type: '+type(element)+' value changed to '+val);
    switch(type(element)) {
        case 'line':
            // console.log('element: '+element.id);
            if(elementID=='bluePolyline') { // adjust angle of latest line segment
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
                var elNodes=nodes.filter(belong);
                for(i=0;i<elNodes.length;i++) {
                    elNodes[i].y=points[0].y+(elNodes[i].y-points[0].y)*ratio;
                }
                var elNodes=nodes.filter(belong);
                for(i=1;i<points.length;i++) { // points[0] is start - not affected
                    points[i].y=points[0].y+(points[i].y-points[0].y)*ratio;
                }
                var pts=[];
	            for(var i=0;i<points.length;i++) {
	                pts.push(points[i].x);
	                pts.push(points[i].y);
	            }
                updateGraph(elementID,['points',pts]);
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
            updateGraph(elementID,['height',val]);
            // console.log('move nodes and handles');
            var elNodes=nodes.filter(belong);
            for(var i=0;i<elNodes.length;i++) { // adjust y-value of nodes...
                if(elNodes[i].y==elY) continue;
                else if(elNodes[i].y==(elY+elH)) elNodes[i].y=elY+val; // bottom edge
                else elNodes[i].y=elY+val/2; // mid-height
            } // ...then move lower edit handles
            // console.log('lower handles.y: '+(elY+val-handleR));
            id('handles').innerHTML='';
            mode='select';
            // id('handleSW').setAttribute('y',(elY+val-handleR));
            // id('handleSE').setAttribute('y',(elY+val-handleR));
            break;
        case 'oval':
            // console.log('change oval height');
            element.setAttribute('ry',val/2);
            updateGraph(elementID,['ry',val/2]);
            var elY=parseInt(element.getAttribute('cy'));
            var ovalNodes=nodes.filter(belong);
            for(var i=0;i<ovalNodes.length;i++) { // adjust top & bottom nodes...
                if(ovalNodes[i].y!=elY) {
                    if(ovalNodes[i].y<elY) ovalNodes[i].y=elY-val/2;
                    else ovalNodes[i].y=elY+val/2;
                }
            }
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
            updateGraph(elementID,['d',d,'x2',x,'y2',y,'sweep',arc.sweep]);
            var arcNodes=nodes.filter(belong);
            for(var i=0;i<arcNodes.length;i++) { // end node
                var node=arcNodes[i];
                if((node.x!=arc.x1)&&(node.x!=arc.cx)&&(node.y!=arc.y1)&&(node.y!=arc.cy))
                {
                    node.x=arc.x2;
                    node.y=arc.y2;
                }
            }
            id('handles').innerHTML='';
            mode='select';
            /*
            id('handleEnd').setAttribute('x',(arc.x2-handleR));
            id('handleEnd').setAttribute('y',(arc.y2-handleR));
            */
    }
})
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
    // nodes[0]={x:0,y:0,el:'datum'};
    // console.log('clip to '+w+'x'+h);
    html="<rect x='0' y='0' width='"+w+"' height='"+h+"'/>"; // clip to drawing edges
    // console.log('clipPath: '+html);
    id('clipper').innerHTML=html;
    // console.log('drawing scale size: '+w+'x'+h+'mm; scaleF: '+scaleF+'; snapD: '+snapD);
    setLayout();
    id('countH').value=id('countV').value=1;
    mode='select';
}
function setLayout() {
    console.log('set layout to '+hand+' sizes width: '+id('sizes').clientWidth);
    if(hand=='left') { // LH tools and dialogs
        id('swop').setAttribute('href','ddStyleLeft.css');
        id('prompt').style.left=parseInt(id('sizes').style.width)+54+'px';
        id('leftLayout').checked=true;
    }
    else { // RH tools and dialogs
        id('swop').setAttribute('href','ddStyleRight.css');
        id('prompt').style.left='6px';
        id('rightLayout').checked=true;
    }
}
function showDialog(dialog,visible) {
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
function type(el) {
    if(el instanceof SVGPolylineElement) {
        return 'line';
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
    setTimeout(function(){id('prompt').style.display='none'},5000);
}
function showSizes(visible,promptText) {
    id('sizes').style.display=(visible)?'block':'none';
    if(visible) prompt(promptText);
}
function setSizes(polar,angle) {
    if(polar) {
        w=x-x0;
        h=y-y0;
        var r=Math.round(Math.sqrt(w*w+h*h));
        id('first').value=r;
        id('between').innerHTML='mm';
        if(angle) r=angle;
        else {
            r=Math.atan(h/w); // radians
            r=Math.round(r*180/Math.PI); // degrees...
            r+=90; // ...as compass bearings
            if(x<x0) r+=180;
        }
        // console.log('r: '+r);
        id('second').value=r;
        id('after').innerHTML='&deg;';
    }
    else {
        id('first').value=w;
        id('between').innerHTML='x';
        id('second').value=h;
        id('after').innerHTML='mm';
    }
    // PUT ELEMENT SPIN INTO 'spin' BOX
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
function remove(elID,keepNodes) {
    console.log('remove element '+elID);
    var el=id(elID);
    var request=db.transaction('graphs','readwrite').objectStore('graphs').delete(Number(elID));
	request.onsuccess=function(event) {
	    console.log('graph '+elID+' deleted from database');
	    if(keepNodes) return;
	    var n=nodes.length;
        for(var i=0;i<nodes.length;i++) { // remove element's snap nodes
            if(nodes[i].el==elID) nodes.splice(i,1);
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
        case 'polyline':
            console.log('move all points by '+dx+','+dy);
            for(var i=0;i<el.points.length;i++) {
                el.points[i].x+=dx;
                el.points[i].y+=dy;
            }
            // console.log(element.points.length+' points adjusted');
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
            el.setAttribute(['d',d,'cx',arc.cx,'cy',arc.cy,'x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2]);
            /*
            updateGraph(el.id,'cx',arc.cx);
            updateGraph(el.id,'cy',arc.cy);
            updateGraph(el.id,'x1',arc.x1);
            updateGraph(el.id,'y1',arc.y1);
            updateGraph(el.id,'x2',arc.x2);
            updateGraph(el.id,'y2',arc.y2);
            */
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
    // LOOK AT MOVING DATUM TO SNAP X,Y
    else if(Math.abs(x-datum.x)<snapD) {
        x=datum.x;
        return true;
    }
    else if(Math.abs(y-datum.y)<snapD) {
        y=datum.y;
        return true;
    }
    else return false;
}
function nearby(node) {
    return (node.x>x-snapD)&&(node.x<x+snapD)&&(node.y>y-snapD)&&(node.y<y+snapD);
}
// function updateGraph(id,attribute,val) {
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
	        eval('graph.'+attribute+'="'+val+'"');
	    }
	    
	    
	    /* MUCH SIMPLER THAN ALL THIS...
	    switch(attribute) {
	        case 'x':
	            graph.x=val; // box, text or combi position
	            break;
	        case 'y':
	            graph.y=val;
	            break;
	        case 'width': // box size
	            graph.width=val;
	            console.log('width is now '+graph.width);
	            break;
	        case 'height':
	            graph.height=val;
	            break;
	        case 'points': // line points
	            graph.points=val;
	            break;
	        case 'd': // arc definition
	            graph.d=val;
	            break;
	        case 'cx': // oval or arc centre
	            graph.cx=val;
	            break;
	        case 'cy':
	            graph.cy=val;
	            break;
	        case 'rx': // oval radii
	            graph.rx=val;
	            break;
	        case 'ry':
	            graph.ry=val;
	            break;
	        case 'x1': // arc start point
	            graph.x1=val;
	            break;
	        case 'y1':
	            graph.y1=val;
	            break;
	        case 'x2': // arc end point
	            graph.x2=val;
	            break;
	        case 'y2':
	            graph.y2=val;
	            break;
	        case 'r':
	            graph.r=val; // arc radius
	            break;
	        case 'textSize':
	            graph.textSize=val; // text settings
	            break;
	        case 'textStyle':
	            graph.textStyle=val;
	            break;
	        case 'stroke':
	            graph.stroke=val; // universal style settings
	            break;
	        case 'lineW':
	            graph.lineW=val;
	            break;
	        case 'lineStyle':
	            graph.lineStyle=val;
	            break;
	        case 'fill':
	            graph.fill=val;
	            break;
	        case 'opacity':
	            graph.opacity=val;
	            break;
	        // ALSO TRANSFORMS AND DIMENSION SETTINGS
	    }
	    */
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
    // console.log('add element at '+el.x+','+el.y);
    var request=db.transaction('graphs','readwrite').objectStore('graphs').add(el);
    request.onsuccess=function(event) {
        // console.log('result: '+event.target.result);
        el.id=event.target.result;
        // console.log('copy added - id: '+el.id+' - draw at '+el.x+','+el.y);
        drawElement(el);
    }
    request.onerror=function(event) {
        console.log('add copy failed');
    }
}
function drawElement(el) {
    console.log('draw '+el.type+' element '+el.id);
    switch(el.type) {
        case 'line':
            var html="<polyline id='"+el.id+"' points='"+el.points+"' ";
			html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
			if(el.lineStyle=='dashed') html+="stroke-dasharray='"+(3*scaleF)+" "+(3*scaleF)+"' ";
            else if(el.lineStyle=='dotted') html+="stroke-dasharray='"+scale+" "+scale+"' ";
			html+="fill='"+el.fill+"'/>";
			console.log('polyline html: '+html);
			if(el.stroke=='blue') id('ref').innerHTML+=html;
			else id('dwg').innerHTML+=html;
			el=id(el.id); // get nodes from draw polyline
			for(i=0;i<el.points.length;i++) {
                nodes.push({'x':el.points[i].x,'y':el.points[i].y,'el':el.id});
                // console.log('node added at '+element.points[i].x+','+element.points[i].y);
                if(i>0) { // add nodes at middle of each segment
                    x=(el.points[i-1].x+el.points[i].x)/2;
                    y=(el.points[i-1].y+el.points[i].y)/2;
                    nodes.push({'x':x,'y':y,'el':el.id});
                    // console.log('intermediate node at '+x+','+y);
                }
            }
            break;
        case 'box':
            console.log('draw box '+el.id+' at '+el.x+','+el.y);
            var html="<rect id='"+el.id+"' x='"+el.x+"' y='"+el.y+"' width='"+el.width+"' height='"+el.height+"' rx='"+el.radius+"' stroke=";
            switch(el.lineStyle) {
                    case 'solid':
                        html+=el.stroke;
                        break;
                    case 'dashed':
                        html+=el.stroke+" stroke-dasharray='"+(3*scaleF)+" "+(3*scaleF)+"'";
                        break;
                    case 'dotted':
                        html+=el.stroke+" stroke-dasharray='"+scale+" "+scale+"'";
                }
                html+=" stroke-width='"+el.lineW+"' fill='"+el.fill+"' fill-opacity='"+el.opacity+"'>";
                console.log('box svg: '+html);
                if(el.stroke=='blue') id('ref').innerHTML+=html; // blue boxes go in <ref> layer
                else id('dwg').innerHTML+=html;
                // element=id(el.id);
                // add nodes at corners...
                nodes.push({'x':el.x,'y':el.y,'el':el.id});
                nodes.push({'x':el.x+el.width,'y':el.y,'el':el.id});
                nodes.push({'x':el.x,'y':el.y+el.height,'el':el.id});
                nodes.push({'x':el.x+el.width,'y':el.y+el.height,'el':el.id});
                // ...and centre and middle of each edges
                nodes.push({'x':el.x+el.width/2,'y':el.y+el.height/2,'el':el.id});
                nodes.push({'x':el.x+el.width/2,'y':el.y,'el':el.id});
                nodes.push({'x':el.x+el.width/2,'y':el.y+el.height,'el':el.id});
                nodes.push({'x':el.x,'y':el.y+el.height/2,'el':el.id});
                nodes.push({'x':el.x+el.width,'y':el.y+el.height/2,'el':el.id});
                break;
            case 'oval':
                var html="<ellipse id='"+el.id+"' cx='"+el.cx+"' cy='"+el.cy+"' rx='"+el.rx+"' ry='"+el.ry+"' stroke=";
                switch(el.lineStyle) {
                    case 'solid':
                        html+=el.stroke;
                        break;
                    case 'dashed':
                        html+=el.stroke+" stroke-dasharray='"+(3*scaleF)+" "+(3*scaleF)+"'";
                        break;
                    case 'dotted':
                        html+=el.stroke+" stroke-dasharray='"+scale+" "+scale+"'";
                }
                html+=" stroke-width="+el.lineW+" fill='";
                html+=el.fill;
                html+="' fill-opacity='"+el.opacity+"'>";
                console.log('oval svg: '+html);
                if(el.stroke=='blue') id('ref').innerHTML+=html;
                else id('dwg').innerHTML+=html;
                nodes.push({'x':el.cx,'y':el.cy,'el':el.id});
                nodes.push({'x':el.cx-el.rx,'y':el.cy,'el':el.id});
                nodes.push({'x':el.cx+el.rx,'y':el.cy,'el':el.id});
                nodes.push({'x':el.cx,'y':el.cy-el.ry,'el':el.id});
                nodes.push({'x':el.cx,'y':el.cy+el.ry,'el':el.id});
                // console.log('oval nodes added');
                break;
            case 'arc':
                console.log('DRAW ARC');
                var html="<path id='"+el.id+"' d='M"+el.cx+","+el.cy+" M"+el.x1+","+el.y1+" A"+el.r+","+el.r+" 0 "+el.major+","+el.sweep+" "+el.x2+","+el.y2+"' stroke="; // set arc path html from arc properties
                switch(el.lineStyle) {
                    case 'solid':
                        html+=el.stroke;
                        break;
                    case 'dashed':
                        html+=el.stroke+" stroke-dasharray='"+(3*scaleF)+" "+(3*scaleF)+"'";
                        break;
                    case 'dotted':
                        html+=el.stroke+" stroke-dasharray='"+scale+" "+scale+"'";
                }
                html+=" stroke-width='"+el.lineW+"' fill='"+el.fill+"' fill-opacity='"+el.opacity+"'>";
                // console.log('arc svg: '+html);
                if(el.stroke=='blue') id('ref').innerHTML+=html; // blue boxes go in <ref> layer
                else id('dwg').innerHTML+=html;
                // create nodes for arc start, centre & end points
                nodes.push({'x':el.cx,'y':el.cy,'el':el.id});
                nodes.push({'x':el.x1,'y':el.y1,'el':el.id});
                nodes.push({'x':el.x2,'y':el.y2,'el':el.id});
                break;
            case 'text':
                var html="<text id='"+el.id+"' x='"+el.x+"' y='"+el.y+"' ";
                html+="font-size='"+(el.textSize*scale)+"' ";
                if(el.textStyle=='bold') html+="font-weight='bold' ";
                else if(el.textStyle=='italic') html+="font-style='italic' ";
                html+="stroke='none' fill='"+el.fill+"'>"+el.text+"</text>";
                console.log('text html: '+html);
                if(el.fill=='blue') id('ref').innerHTML+=html;
                else id('dwg').innerHTML+=html;
                id('textDialog').style.display='none';
                break;
            case 'combi':
                var s=(combi.nts>0)?scale:1;
                var html="<svg id='"+el.id+"' x='"+el.x+"' y='"+el.y+"'>";
                html+="<g transform='scale("+s+")'>"+combi.svg+"</g></svg>";
                console.log('combi html: '+html);
                id('dwg').innerHTML+=html;
                nodes.push({'x':el.x,'y':el.y,'el':elementID});
                console.log("DONE");
                break;
    }
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
// START-UP CODE
var request=window.indexedDB.open("ddDB",dbVersion);
request.onsuccess=function(event) {
    db=event.target.result;
    // console.log("ddDB open");
    // var dbTransaction=db.transaction('elements',"readwrite");
    // var dbObjectStore=dbTransaction.objectStore('elements');
    nodes=[];
    // var request=dbObjectStore.openCursor();
    var request=db.transaction('graphs').objectStore('graphs').openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if (cursor) {
            var graph=cursor.value;
            console.log('load '+graph.type+' id: '+graph.id);
            if(graph.type=='combi') { // load combi from 'combis' database
                db.transaction('combis').objectStore('combis').get(graph.no).onsuccess=function(event) {
                    combi=event.target.result;
                    console.log('combi '+combi.id+' is '+combi.name);
                    drawElement(graph);
                }
            }
            else drawElement(graph);
	    	cursor.continue();  
        }
	    else {
		    console.log("No more entries");
	    }
    };
    console.log('all graphs loaded');
    /*
    var dbTransaction=db.transaction('combis',"readwrite");
    console.log("indexedDB transaction ready");
    var dbObjectStore=dbTransaction.objectStore('combis');
    var request=dbObjectStore.openCursor();
    */
    var request=db.transaction('combis').objectStore('combis').openCursor();
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
    var db=event.target.result;
    // TEMPORARY TO SWITCH FROM elements TO graphs
    // db.deleteObjectStore('elements');
    if (!db.objectStoreNames.contains('graphs')) {
        var graphs=db.createObjectStore('graphs',{keyPath:'id',autoIncrement:true});
    }
    if (!db.objectStoreNames.contains('combis')) {
        var combis=db.createObjectStore("combis",{keyPath:'id',autoIncrement:true});
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
	navigator.serviceWorker.register('ddSW.js').then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
} 