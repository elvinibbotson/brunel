// GLOBAL VARIABLES
var saved=false; // flags whether drawing has been saved
var aspect=null;
var scale=1; // default scale is 1:1
var units='mm'; // default unit is mm
var scaleF=3.78; // default scale factor for mm (1:1 scale)
var handleR=2; // 2mm handle radius at 1:1 scale - increase for smaller scales (eg. 100 at 1:50)
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
var w=0;
var h=0;
var elID=0;
var selection=[];
var timer=null;
var db=null; // indexed database holding SVG elements
var nodes=[]; // array of nodes each with x,y coordinates and element ID
var node=null;
var element=null; // current element
var elementID=null; // id of current element 
var lineType='solid'; // default styles
var lineShade='black';
var pen=0.25; // 0.25mm at 1:1 scale - increase for smaller scales (eg.12.5 at 1:50 scale)
var fillType=0;
var fillShade='gray';
var opacity='1';
var textSize=3.5; // default text size 10pt
var currentDialog=null;

scr.w=screen.width;
scr.h=screen.height;
dwg.x=dwg.y=0;
console.log("screen size "+scr.w+"x"+scr.h);
aspect=window.localStorage.getItem('aspect');
scale=window.localStorage.getItem('scale');
units=window.localStorage.getItem('units');
console.log('1:'+scale+' '+aspect+' drawing using '+units);
if(!aspect) showDialog('newDrawing',true);
else initialise();

// TOOLS
// file
id('fileButton').addEventListener('click',function() { // SHOULD SHOW FILE MENU BUT FOR NOW...
    showDialog('fileMenu',true);
});
id('new').addEventListener('click',function() {
    if(!saved) alert('You may want to save your work before starting a new drawing');
    report("show New Drawing dialog");
    showDialog('fileMenu',false);
    showDialog('newDrawing',true);
});
id('save').addEventListener('click',function() {
    saveSVG();
    showDialog('fileMenu',false);
});
id('cancelNewDrawing').addEventListener('click',function() {
    showDialog('newDrawing',false);
});
id('createNewDrawing').addEventListener('click',function() {
    aspect=(id('landscape').checked)?'landscape':'portrait';
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
id('zoomInButton').addEventListener('click',function() {
    action('ZOOM IN');
    zoom*=2;
    console.log('zoom in to '+zoom);
    w=Math.round(dwg.w*scale/zoom);
    h=Math.round(dwg.h*scale/zoom);
    console.log('new viewBox: '+dwg.x+','+dwg.y+' '+w+'x'+h);
    id('svg').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+w+' '+h);
    snapD/=2; // avoid making snap too easy
    handleR/=2; // avoid oversizing edit handles
});
id('zoomOutButton').addEventListener('click',function() {
    action('ZOOM OUT');
    if(zoom<2) return;
    zoom/=2;
    console.log('zoom out to '+zoom);
    w=Math.round(dwg.w*scale/zoom);
    h=Math.round(dwg.h*scale/zoom);
    console.log('new viewBox: '+dwg.x+','+dwg.y+' '+w+'x'+h);
    id('svg').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+w+' '+h);
    snapD*=2;
    handleR*=2;
});
id('extentsButton').addEventListener('click',function() {
    action('ZOOM ALL');
    console.log('zoom out to full drawing');
    zoom=1;
    dwg.x=0;
    dwg.y=0;
    console.log('new viewBox: '+dwg.x+','+dwg.y+' '+dwg.w+'x'+dwg.h);
    id('svg').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+(dwg.w*scale)+' '+(dwg.h*scale));
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
    console.log('pan mode');
    mode='pan';
    action('PAN');
});
/* NEED TO REVISIT THIS...
console.log('set zoom'); // ACCORDING TO CHOICE IN DIALOG
zoom=1;
while((sw<(w*zoom))||(sh<(h*zoom))) {
    zoom/=2;
}
if(zoom<0.5) {
    alert("Try turning device");
    // EXIT APP
}
*/
console.log('zoom; '+zoom+' w: '+w+' h: '+h);
// DRAWING TOOLS
id('lineButton').addEventListener('click', function() { // (POLY)LINE: JUST CLICK - NO HOLD OR DRAG
    mode='line';
    showInfo(true,'LINE: press at start');
    action('LINE');
});
id('boxButton').addEventListener('click',function() { // BOX(& SQUARE): JUST CLICK - NO HOLD OR DRAG
    mode='box';
    showInfo(true,'BOX: press at start');
    action('BOX');
});
id('ovalButton').addEventListener('click',function() { // OVAL/CIRCLE
    mode='oval';
    showInfo(true,'OVAL: press at centre');
    action('OVAL');
})
// EDIT TOOLS
id('deleteButton').addEventListener('click',function() {
    action('DELETE');
    console.log('delete element '+elementID);
    for(var i=0;i<nodes.length;i++) { // remove element's snap nodes
        if(nodes[i].el==elementID) nodes.splice(i,1);
    }
    id('dwg').removeChild(element); // remove element from SVG
    id('handles').innerHTML=''; // remove edit handles 
    var dbTransaction=db.transaction('elements',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('elements');
	console.log("indexedDB objectStore ready");
	var request=dbObjectStore.delete(elementID);
	request.onsuccess=function(event) {
	    console.log('element deleted from database');
	}
	request.onerror=function(event) {
	    console.log("error deleting element");
	};
});
id('backButton').addEventListener('click',function() {
    action('PUSH BACK');
    console.log('move '+elementID+' backwards');
    var previousElement=element.previousSibling;
    if(previousElement===null) alert('already at back');
    else id('dwg').insertBefore(element,previousElement);
});
id('forwardButton').addEventListener('click',function() {
    action('PULL FORWARD');
    console.log('move '+elementID+' forwards');
    var nextElement=element.nextSibling;
    if(nextElement===null) alert('already at front');
    else id('dwg').insertBefore(nextElement,element);
});
// STYLES
id('styles').addEventListener('click',function() {
    showDialog('stylesDialog',true);
    // SET STYLES TO CURRENT DEFAULTS OR SELECTED element
})
id('lineType').addEventListener('change',function() {
    var type=event.target.value;
    console.log('line type: '+type);
    // ADJUST SELECTED ELEMENT(S) OR DEFAULT
    if(elementID) { // change selected element
        element=id(elementID);
        switch(type) {
            case 'solid':
                var val=null;
                // element.setAttribute('stroke-dasharray',null);
                break;
            case 'dashed':
                var val='3 3';
                // element.setAttribute('stroke-dasharray','3 3');
                break;
            case 'dotted':
                var val='1 1';
                // element.setAttribute('stroke-dasharray','1 1');
        }
        console.log('set element '+element.id+' line style to '+type);
        element.setAttribute('stroke-dasharray',val);
        updateElement(elementID,'lineStyle',val);
    }
    else { // change default line type
        lineType=type;
        console.log('line type is '+type);
        // id('styles').style.borderStyle=type;
    }
    id('styles').style.borderStyle=type;
})
id('penSelect').addEventListener('change',function() {
    var val=event.target.value;
    console.log('pen width: '+val+'mm at 1:1');
    id('penWidth').value=val;
    console.log((val*scale)+'mm at 1:'+scale);
    if(elementID) { // change selected element
        element=id(elementID);
        element.setAttribute('stroke-width',val*scale);
        console.log('set element '+element.id+' pen to '+val);
        updateElement(element.id,'lineW',val);
    }
    else { // change default pen width
        pen=val;
        console.log('pen is '+pen);
        // id('styles').style.borderWidth=pen+'mm 0 0 '+pen+'mm';
    }
    id('styles').style.borderWidth=pen+'mm 0 0 '+pen+'mm';
})
id('lineShade').addEventListener('change',function() {
    var shade=event.target.value;
    if(elementID) { // change selected element
        element=id(elementID);
        element.setAttribute('stroke',shade);
        console.log('set element '+element.id+' line shade to '+shade);
        updateElement(element.id,'stroke',shade);
    }
    else { // change default line shade
        console.log('line shade: '+shade);
        lineShade=shade;
        // id('styles').style.borderColor=shade;
    }
    id('styles').style.borderColor=shade;
})
id('fillType').addEventListener('change',function() {
    var fill=event.target.value;
    console.log('fill type: '+fill);
    if(elementID) { // change selected element
        element=id(elementID);
        if(fill<0) { // PATTERN!!!
        // display fill pattern grid to choose a fill pattern (from patterns in <defs>)
        }
        else if(fill>0) { // solid fill
            var val=fillShade; // element.getAttribute('fill');
            console.log('set element fill to '+val);
            id('fillShade').value=fillShade;
            // element.setAttribute('fill',val);
            // val=element.getAttribute('fill-opacity');
            // id('styles').style.opacity=val;
        }
        else {  // no fill
            // element.setAttribute('fill','none');
            val='none';
            id('fillShade').value='none';
            // id('styles').style.opacity=0;
        }
        element.setAttribute('fill',val);
        updateElement(element.id,'fill',val);
    }
    else { // change default fill pattern
        fillType=fill;
        console.log('fillType set to '+fill);
        if(fill==0) {
            console.log('set fill to none');
            id('fillShade').value=fillShade;
            // id('styles').style.opacity=0;
        }
        else {
            console.log('set fill to '+fillShade);
            id('fillShade').value=fillShade;
            // id('styles').style.opacity=opacity;
        }
    }
    id('styles').style.fill=(fill>0)?fillShade:'none';
})
id('fillShade').addEventListener('change',function() {
    var val=event.target.value;
    console.log('fill shade: '+val);
    if(elementID) { // change selected element
        element=id(elementID);
        element.setAttribute('fill',val);
        console.log('set element '+element.id+' fill shade to '+val);
        // id('styles').style.background=val;
        updateElement(element.id,'fill',val);
    }
    else { // change default fill shade
        console.log('fill shade: '+val);
        fillShade=val;
        // if(fillType>0) id('styles').style.background=val;
    }
    if(val=='none') id('fillType').value=0;
    id('styles').style.background=(fillType>0)?val:'none';
})
id('opacity').addEventListener('change',function() {
    var val=event.target.value;
    console.log('opacity: '+val);
    if(elementID) { // change selected element
        element=id(elementID);
        element.setAttribute('stroke-opacity',val);
        element.setAttribute('fill-opacity',val);
        updateElement(elementID,'opacity',val);
    }
    else opacity=val; // change default opacity
    id('styles').style.opacity=val;
})
// TOUCH - START
id('graphic').addEventListener('touchstart',function() {
    event.preventDefault();
    console.log('dialog: '+currentDialog);
    if(currentDialog) showDialog(currentDialog,false);
    console.log('touch at '+event.touches[0].clientX+','+event.touches[0].clientY);
    scr.x=Math.round(event.touches[0].clientX);
    scr.y=Math.round(event.touches[0].clientY);
    // x=x0=Math.round(scr.x*scaleF/zoom-dwg.x);
    // y=y0=Math.round(scr.y*scaleF/zoom-dwg.y);
    x=x0=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=y0=Math.round(scr.y*scaleF/zoom+dwg.y);
    /* previous code
    x=x0=Math.round(event.touches[0].clientX/scaleF)*scale;
    y=y0=Math.round(event.touches[0].clientY/scaleF)*scale;
    */
    // TEST FOR TOUCHING EDIT HANDLES
    var val=event.target.id;
    console.log('touch on '+val);
    snap=snapCheck();
    if(snap) { // snap start/centre to snap target
        x0=x;
        y0=y;
    }
    switch(mode) {
        case 'pan':
            console.log('start pan at '+x0+','+y0);
            var view=id('svg').getAttribute('viewBox');
            console.log('view: '+view+' - dwg.x,y: '+dwg.x+','+dwg.y);
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
            console.log(id('bluePolyline').points.length+' points');
            showInfo(true,'LINES: drag to next point; tap twice to end');
            break;
        case 'box':
            console.log('box starts at '+x0+','+y0);
            id('blueBox').setAttribute('x',x0);
            id('blueBox').setAttribute('y',y0);
            console.log('sizing box initiated');
            showInfo(true,'BOX: drag to size');
            break;
        case 'oval':
            console.log('oval centre at '+x0+','+y0);
            id('blueOval').setAttribute('cx',x0);
            id('blueOval').setAttribute('cy',y0);
            console.log('sizing oval initiated');
            showInfo('true','OVAL: drag to size');
            break;
        case 'select':
            // IS THIS JUST TO LOOK FOR EDIT HANDLES?
            // IF SO event.target SHOULD FIND THEM - NO NEED FOR THIS
            /*
            var el=event.target.id;
            console.log('select '+el+' at '+x0+','+y0);
            if(el=='svg') {
                var hit=null;
                var e=-5;
                var n=-5;
                while(e<6 && !hit) {
                    n=-5;
                    while(n<6 && !hit) {
                        // console.log('check at '+e+','+n+': '+scr.x+e+','+scr.y+n);
                        el=document.elementFromPoint(scr.x+e,scr.y+n);
                        if(el) el=el.id;
                        if(el!='svg') hit=el; // hits.push(el); 
                        n++; // 
                    }
                    e++;
                }
                if(hit) console.log('touch: '+el.id);
            }
            break;
            */
    }
    event.stopPropagation();
})
// TOUCH - MOVE
id('graphic').addEventListener('touchmove',function() {
    event.preventDefault();
    scr.x=Math.round(event.touches[0].clientX);
    scr.y=Math.round(event.touches[0].clientY);
    // x=Math.round(scr.x*scaleF/zoom-dwg.x);
    // y=Math.round(scr.y*scaleF/zoom-dwg.y);
    x=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=Math.round(scr.y*scaleF/zoom+dwg.y);
    switch(mode) {
        case 'pan':
            var dx=dwg.x-(x-x0);
            var dy=dwg.y-(y-y0);
            // console.log('drawing x,y: '+dx+','+dy);
            id('svg').setAttribute('viewBox',dx+' '+dy+' '+(dwg.w*scale/zoom)+' '+(dwg.h*scale/zoom));
            // id('svg').setAttribute('viewBox',(dx*scale/zoom)+' '+(dy*scale/zoom)+' '+(dwg.w*scale/zoom)+' '+(dwg.h*scale/zoom));
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
        case 'edit':
            // IF ON AN EDIT HANDLE, MOVE OR RE-SIZE ELEMENT
    }
    event.stopPropagation();
})
// TOUCH - END
id('graphic').addEventListener('touchend',function() {
    console.log('touch-end at '+x+','+y);
    snap=snapCheck();
    switch(mode) {
        case 'pan':
            console.log('pan ends at '+x+','+y);
            dwg.x-=(x-x0);
            dwg.y-=(y-y0);
            console.log('drawing x,y: '+dwg.x+','+dwg.y+'; scale: '+scale+'; zoom: '+zoom);
            mode='select';
            console.log('mode is '+mode);
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
                if(lineType=='dashed') html+="stroke-dasharray='3 3' ";
                else if(lineType=='dotted') html+="stroke-dasharray='1 1' ";
                html+="stroke-opacity='"+opacity+"' fill='none'/>";
                id('dwg').innerHTML+=html;
                console.log('poly/line added: '+html);
                /*
                switch(lineType) {
                    case 'solid':
                        id('bluePolyline').setAttribute('stroke-dasharray',null);
                        break;
                    case 'dashed':
                        id('bluePolyline').setAttribute('stroke-dasharray','3 3');
                        break;
                    case 'dotted':
                        id('bluePolyline').setAttribute('stroke-dasharray','1 1');
                }
                
                id('bluePolyline').setAttribute('stroke','black');
                id('bluePolyline').setAttribute('stroke-width',pen);
                id('bluePolyline').setAttribute('stroke-opacity',opacity);
                id('bluePolyline').setAttribute('id','~'+elID);
                */
                elementID='~'+elID;
	            element=id(elementID);
                id('bluePolyline').setAttribute('points','0,0');
	            // console.log('element is '+elementID);
                elID++;
                // var el="<polyline id='bluePolyline' points='0,0' stroke='blue' fill='none'/>";
                // id('dwg').innerHTML+=el;
                // add nodes to nodes[] array
                for(var i=0;i<element.points.length;i++) {
                    nodes.push({'x':element.points[i].x,'y':element.points[i].y,'el':elementID});
                    console.log('node added at '+element.points[i].x+','+element.points[i].y);
                }
                // TEST
                for(i=0;i<nodes.length;i++) {
                    console.log('node '+i+' at '+nodes[i].x+','+nodes[i].y+' element '+nodes[i].el);
                }
                // save poly/line to database
                var dbTransaction=db.transaction('elements',"readwrite");
	            console.log("indexedDB transaction ready");
	            var dbObjectStore=dbTransaction.objectStore('elements');
	            console.log("indexedDB objectStore ready");
	            console.log("save element "+elementID);
	            console.log('create object from '+html);
	            var el={}
	            el.id=elementID;
	            el.type='polyline';
	            el.points=element.getAttribute('points');
	            el.stroke=element.getAttribute('stroke');
	            el.lineW=element.getAttribute('stroke-width');
	            if(element.getAttribute('stroke-dasharray')) el.lineStyle=val;
	            el.fill=element.getAttribute('fill');
	            if(element.getAttribute('stroke-opacity')) el.opacity=element.getAttribute('stroke-opacity');
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
                showInfo(false);
                mode='select';
            }
            break;
        case 'box':
            var html="<rect id='~"+elID+"' x='"+((x<x0)?x:x0)+"' y='"+((y<y0)?y:y0)+"' width='"+w+"' height='"+h+"' stroke=";
            switch(lineType) {
                case 'solid':
                    html+=lineShade;
                    break;
                case 'dashed':
                    html+=lineShade+" stroke-dasharray='3 3'";
                    break;
                case 'dotted':
                    html+=lineShade+" stroke-dasharray='1 1'";
            }
            html+=" stroke-width="+(pen*scale)+" stroke-opacity='"+opacity+"' fill='";
            console.log('fillType: '+fillType+' fillShade: '+fillShade);
            if(fillType>0) html+=fillShade;
            else if(fillType==0) html+="none";
            // PATTERN FILL?
            html+="' fill-opacity='"+opacity+"'>";
            console.log('box svg: '+html);
            id('dwg').innerHTML+=html;
	        console.log("box svg drawn: "+x0+','+y0+' to '+(x0+w)+','+(y0+h));
	        elementID='~'+elID;
	        element=id(elementID);
	        console.log('element is '+elementID);
	        elID++;
	        id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            // add nodes to nodes[] array
            x=parseInt(element.getAttribute('x'));
            y=parseInt(element.getAttribute('y'));
            w=parseInt(element.getAttribute('width'));
            h=parseInt(element.getAttribute('height'));
            console.log('x:'+x+' y:'+y+' w:'+w+' h:'+h);
            nodes.push({'x':x,'y':y,'el':elementID});
            nodes.push({'x':x+w,'y':y,'el':elementID});
            nodes.push({'x':x,'y':y+h,'el':elementID});
            nodes.push({'x':x+w,'y':y+h,'el':elementID});
            for(var i=0;i<4;i++) console.log('node '+i+': '+nodes[i].x+','+nodes[i].y+' el:'+nodes[i].el);
            // save box to database
            var dbTransaction=db.transaction('elements',"readwrite");
	        console.log("indexedDB transaction ready");
	        var dbObjectStore=dbTransaction.objectStore('elements');
	        console.log("indexedDB objectStore ready");
	        console.log("save element "+elementID);
	        console.log('create object from '+html);
	        var el={}
	        el.id=elementID;
	        el.type='rect';
	        el.x=x;
	        el.y=y;
	        el.width=w;
	        el.height=h;
	        el.stroke=element.getAttribute('stroke');
	        el.lineW=element.getAttribute('stroke-width');
	        if(element.getAttribute('stroke-dasharray')) el.lineStyle=val;
	        el.fill=element.getAttribute('fill');
	        if(element.getAttribute('stroke-opacity')) el.opacity=element.getAttribute('stroke-opacity');
	        if(element.getAttribute('transform')) el.transform=element.getAttribute('transform');
	        console.log('element data object id: '+el.id+'; type: '+el.type+'; size: '+el.width+'x'+el.height);
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
                    html+=lineShade+" stroke-dasharray='3 3'";
                    break;
                case 'dotted':
                    html+=lineShade+" stroke-dasharray='1 1'";
            }
            html+=" stroke-width="+(pen*scale)+" stroke-opacity='"+opacity+"' fill='";
            console.log('fillType: '+fillType+' fillShade: '+fillShade);
            if(fillType>0) html+=fillShade;
            else if(fillType==0) html+="none";
            // PATTERN FILL?
            html+="' fill-opacity='"+opacity+"'>";
            console.log('oval svg: '+html);
            id('dwg').innerHTML+=html;
            console.log("oval svg drawn: "+w+" x "+h+" at "+x0+","+y0);
            elementID='~'+elID;
	        element=id(elementID);
	        console.log('element is '+elementID);
            elID++;
            id('blueOval').setAttribute('rx',0);
            id('blueOval').setAttribute('ry',0);
            // add nodes to nodes[] array
            x=parseInt(element.getAttribute('cx'));
            y=parseInt(element.getAttribute('cy'));
            w=parseInt(element.getAttribute('rx'));
            h=parseInt(element.getAttribute('ry'));
            console.log('x:'+x+' y:'+y+' w:'+w+' h:'+h);
            nodes.push({'x':x,'y':y,'el':elementID});
            nodes.push({'x':(x-w),'y':y,'el':elementID});
            nodes.push({'x':(x+w),'y':y,'el':elementID});
            nodes.push({'x':x,'y':(y-h),'el':elementID});
            nodes.push({'x':x,'y':(y+h),'el':elementID});
            console.log('oval nodes added');
            // save oval to database
            var dbTransaction=db.transaction('elements',"readwrite");
	        console.log("indexedDB transaction ready");
	        var dbObjectStore=dbTransaction.objectStore('elements');
	        console.log("indexedDB objectStore ready");
	        console.log("save element "+elementID);
	        console.log('create object from '+html);
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
	        if(element.getAttribute('stroke-opacity')) el.opacity=element.getAttribute('stroke-opacity');
	        if(element.getAttribute('transform')) el.transform=element.getAttribute('transform');
	        console.log('element data object id: '+el.id+'; type: '+el.type+'; radii: '+el.rx+'x'+el.ry);
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
        case 'select':
        case 'edit':
            var el=event.target.id;
            console.log('touchend on '+el+' at '+scr.x+','+scr.y+'; ie: '+x+','+y+' on drawing');
            if(el=='svg') { // check for elements within snap distance
                var hit=null;
                var e=-5;
                var n=-5;
                while(e<6 && !hit) {
                    n=-5;
                    while(n<6 && !hit) {
                        // console.log('check at '+e+','+n+' '+(scr.x+e)+','+(scr.y+n));
                        el=document.elementFromPoint(scr.x+e,scr.y+n);
                        if(el) el=el.id;
                        if(el!='svg') hit=el; // hits.push(el); 
                        n++; // 
                    }
                    e++;
                }
            }
            else hit=el;
            console.log('hit: '+el);
            if(hit && el.charAt(0)=='~') { // IDENTIFIES ELEMENTS - WAS if(el!='dwg') {
                // IF BOX-SELECT ADD TO 'selections' ARRAY - LIST OF ELEMENT IDs
                // OTHERWISE (CLICK-SELECT) JUST SELECT AN ELEMENT IN snap RANGE
                console.log('el: '+el+' set styles');
                elementID=el;
                var el=id(el);
                element=el;
                var val=el.getAttribute('stroke-dasharray');
                console.log('element lineType (dasharray): '+val);
                switch(val) {
                    case null:
                        console.log('set lineType to solid');
                        id('lineType').value='solid';
                        id('styles').style.borderStyle='solid';
                        break;
                    case '3 3':
                        console.log('set lineType to dashed');
                        id('lineType').value='dashed';
                        id('styles').style.borderStyle='dashed';
                        break;
                    case '1 1':
                        console.log('set lineType to dotted');
                        id('lineType').value='dotted';
                        id('styles').style.borderStyle='dotted';
                }
                val=el.getAttribute('stroke-width');
                console.log('element line width: '+val);
                id('penWidth').value=id('penSelect').value=val;
                id('styles').style.borderWidth=val+'mm 0 0 '+val+'mm';
                val=el.getAttribute('stroke');
                console.log('set lineShade to '+val);
                id('lineShade').value=val;
                id('styles').style.borderColor=val;
                val=el.getAttribute('strokeOpacity');
                console.log('stroke opacity: '+val);
                id('opacity').value=val;
                id('styles').style.opacity=val;
                val=el.getAttribute('fill');
                console.log('element fill: '+val);
                if(val=='none') {
                    id('fillType').value=0;
                    id('styles').style.background='#00000000';
                }
                else { // MODIFY THIS TO ACCOMMODATE PATTERN FILL
                    console.log('set fill to '+val);
                    id('fillType').value=1;
                    id('fillShade').value=val;
                    id('styles').style.background=val;
                    val=el.getAttribute('fill-opacity');
                    console.log('element opacity: '+val);
                    id('styles').style.opacity=val;
                }
                /*
                console.log('set fillShade to '+val);
                id('fillShade').value=val;
                id('styles').style.opacity=opacity;
                // SIMILAR FOR OPACITY
                */
                id('handles').innerHTML=''; // clear any handles then add handles for selected element 
                console.log('element type: '+type(el));
                switch(type(el)) {
                    case 'polyline':
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
                        showInfo(true,'LINE');
                        elementID=el.id;
                        mode='edit';
                        break;
                    case 'box':
                        console.log('box '+el.id+': '+el.getAttribute('x')+','+el.getAttribute('y')+' '+el.getAttribute('width')+'x'+el.getAttribute('height'));
                        x=parseFloat(el.getAttribute('x'));
                        y=parseFloat(el.getAttribute('y'));
                        w=parseFloat(el.getAttribute('width'));
                        h=parseFloat(el.getAttribute('height'));
                        elementID=el.id;
                        var html="<circle id='handleNW' cx="+x+" cy="+y+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // top-left circle handle at top-left used to move whole box
                        html="<rect id='handleNE' x='"+(x+w-handleR)+"' y='"+(y-handleR)+"' width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // top-right square handle adjusts box width
                        html="<rect id='handleSE' x='"+(x+w-handleR)+"' y='"+(y+h-handleR)+"' width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // bottom-right handle adjusts box size keeping aspect ratio
                        html="<rect id='handleSW' x='"+(x-handleR)+"' y='"+(y+h-handleR)+"' width='"+(2*handleR)+"' height='"+(2*handleR)+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // bottom-left handle adjusts box height
                        setSizes(false);
                        showInfo(true,(w==h)?'SQUARE':'BOX');
                        mode='edit';
                        break;
                    case 'oval':
                        console.log('oval '+el.id);
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
                        showInfo(true,(w==h)?'CIRCLE':'OVAL');
                        mode='edit';
                }
                id('editTools').style.display='block';
            }
            else {
                mode='select';
                elementID=null;
                selection=[];
                id('handles').innerHTML=''; //remove element handles
                showInfo(false);
                console.log('set lineType to current default: '+lineType);
                id('lineType').value=lineType;
                id('styles').style.borderStyle=lineType;
                console.log('set penWidth to current default: '+pen);
                id('penWidth').value=id('penSelect').value=pen;
                id('styles').style.borderWidth=pen+'mm 0 0 '+pen+'mm';;
                console.log('set lineShade to current default: '+lineShade);
                id('lineShade').value=lineShade;
                id('styles').style.borderColor=lineShade;
                id('fillType').value=fillType;
                if(fillType==0) {
                    id('styles').style.opacity=0;
                }
                else id('styles').style.opacity=opacity; // WHAT ABOUT PATTERN FILL?
                id('opacity').value=opacity;
            }
            // if SHIFT add to selection otherwise deselect currently selected elements and select this
            event.stopPropagation();
    }
    event.stopPropagation();
})
// ADJUST ELEMENT SIZES
id('first').addEventListener('change',function() {
    var val=parseInt(id('first').value);
    console.log('element '+elementID+' value changed to '+val);
    element=id(elementID);
    switch(type(element)) {
        case 'polyline':
            console.log('element: '+element.id);
            if(elementID.startsWith('~')) { // width of completed (poly)line
                console.log('completed polyline - adjust overall width');
                var bounds=element.getBBox();
                w=bounds.width;
                var ratio=val/w;
                var points=element.points;
                // var n=points.length;
                var i=0;
                var n=-1;
                while(n<0 && i<nodes.length) {
                    if(nodes[i].el==elementID) n=i;
                }
                console.log('start node is '+n);
                console.log('adjust all polyline points, nodes and handles x-values by ratio '+ratio);
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
            console.log(n+' points');
            var pt0=element.points[n-2];
            var pt1=element.points[n-1];
            w=pt1.x-pt0.x;
            h=pt1.y-pt0.y;
            len=Math.sqrt(w*w+h*h);
            console.log('length: '+len);
            var r=val/len;
            w*=r;
            h*=r;
            x=x0+w;
            y=y0+h;
            pt1.x=x;
            pt1.y=y;
            console.log('new end-point: '+x+','+y);
            element.points[n-1]=pt1;
            break;
        case 'box':
            console.log('change width of element '+elementID);
            element.setAttribute('width',val);
            updateElement(elementID,'width',val);
            var elX=parseInt(element.getAttribute('x'));
            // console.log('move nodes and handles');
            for(var i=0;i<nodes.length;i++) { // adjust two RH nodes...
                if((nodes[i].el==elementID)&&(nodes[i].x!=elX)) {
                    // console.log('node '+i+' x changed to '+(elX+val));
                    nodes[i].x=elX+val;
                }
            } // ...then move RH edit handles
            // console.log('RH handles.x: '+(elX+val-handleR));
            id('handleNE').setAttribute('x',(elX+val-handleR));
            id('handleSE').setAttribute('x',(elX+val-handleR));
            break;
        case 'oval':
            element.setAttribute('rx',val/2);
            updateElement(elementID,'rx',val/2);
            var elX=parseInt(element.getAttribute('cx'));
            for(var i=0;i<nodes.length;i++) { // adjust two RH nodes...
                if((nodes[i].el==elementID)&&(nodes[i].x!=elX)) {
                    // console.log('node '+i+' x changed to '+(elX+val));
                    console.log('change node '+i+'.x: '+nodes[i].x);
                    if(nodes[i].x<elX) nodes[i].x=elX-val/2;
                    else nodes[i].x=elX+val/2;
                    // nodes[i].x=elX+(nodes[i].x<elX)?val/2*-1:val/2;
                    console.log('to: '+nodes[i].x);
                }
            }
            id('handleSize').setAttribute('x',(elX+val/2-handleR));
    }
})
id('second').addEventListener('change',function() {
    var val=parseInt(id('second').value);
    element=id(elementID);
    console.log('element '+element+' type: '+type(element)+' value changed to '+val);
    switch(type(element)) {
        case 'polyline':
            console.log('element: '+element.id);
            if(elementID.startsWith('~')) { // height of completed (poly)line
                console.log('completed polyline - adjust overall height');
                var bounds=element.getBBox();
                h=bounds.height;
                var ratio=val/h;
                var points=element.points;
                var i=0;
                var n=-1;
                while(n<0 && i<nodes.length) {
                    if(nodes[i].el==elementID) n=i;
                }
                console.log('start node is '+n);
                console.log('adjust all polyline points, nodes and handles x-values by ratio '+ratio);
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
            // ADJUST LINE ANGLE!!!
            var n=element.points.length;
            console.log(n+' points');
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
            // element=id(element.id); DONE EARLIER 
            console.log('box height is '+element.getAttribute('height'));
            console.log('set to '+val);
            element.setAttribute('height',val);
            updateElement(elementID,'height',val);
            var elY=parseInt(element.getAttribute('y'));
            console.log('move nodes and handles');
            for(var i=0;i<nodes.length;i++) { // adjust two lower nodes...
                if((nodes[i].el==elementID)&&(nodes[i].y!=elY)) {
                    console.log('change node '+i+'.y: '+nodes[i].y);
                    nodes[i].y=elY+val;
                    console.log('to: '+nodes[i].y);
                }
            } // ...then move lower edit handles
            // console.log('lower handles.y: '+(elY+val-handleR));
            id('handleSW').setAttribute('y',(elY+val-handleR));
            id('handleSE').setAttribute('y',(elY+val-handleR));
            break;
        case 'oval':
            console.log('change oval height');
            element.setAttribute('ry',val/2);
            updateElement(elementID,'ry',val/2);
            var elY=parseInt(element.getAttribute('cy'));
            for(var i=0;i<nodes.length;i++) { // adjust top & bottom nodes...
                if((nodes[i].el==elementID)&&(nodes[i].y!=elY)) {
                    console.log('change node '+i+'.y: '+nodes[i].y);
                    if(nodes[i].y<elY) nodes[i].y=elY-val/2;
                    else nodes[i].y=elY+val/2;
                    console.log('to: '+nodes[i].y);
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
        handleR=2.5*scale; // ...and 2.5mm radius handles at 1:1 scale
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
    }
    else {
        snapD=0.2*scale; // ...0.2in snap distance...
        handleR=0.1*scale; // ...and 0.1in handle radius at 1:1 scale
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
    }
    w=dwg.w*scale; // viewBox is to scale
    h=dwg.h*scale;
    id('svg').setAttribute('viewBox',"0 0 "+w+" "+h);
    // draw dashed drawing outline in 'ref' layer
    var html="<rect x='0' y='0' width='"+w+"' height='"+h+"' stroke='gray' fill='none'/>";
    id('ref').innerHTML+=html;
    // clip to drawing edges
    console.log('clip to '+w+'x'+h);
    html="<rect x='0' y='0' width='"+w+"' height='"+h+"'/>";
    console.log('clipPath: '+html);
    id('clipper').innerHTML=html;
    console.log('drawing scale size: '+w+'x'+h+units+'; scaleF: '+scaleF+'; snapD: '+snapD);
    mode='select';
    alert('screen: '+scr.w+'x'+scr.h+' drawing: '+dwg.w+'x'+dwg.h+units+' at '+dwg.x+','+dwg.y+' scale: '+scale+' scaleF: '+scaleF);
}
function showDialog(dialog,visible) {
    id(dialog).style.display=(visible)?'block':'none';
    currentDialog=(visible)?dialog:null;
    console.log('current dialog: '+currentDialog);
}
function showBoxDialog() { // CODE THIS
    alert('open box dialog');
}
function type(el) {
    if(el instanceof SVGPolylineElement) {
        return 'polyline';
    }
    else if(el instanceof SVGRectElement) {
        return 'box';
    }
    else if(el instanceof SVGEllipseElement) {
        return 'oval';}
    }
function action(text) {
    id('actionLabel').innerHTML=text; //display text for 3 secs
    id('actionLabel').style.display='block';
    setTimeout(function(){id('actionLabel').style.display='none'},3000);
}
function showInfo(visible,prompt) {
    id('info').style.display=(visible)?'block':'none';
    id('prompt').innerHTML=(prompt)?prompt:'';
}
function setSizes(polar) {
    if(polar) {
        w=Math.abs(x-x0);
        h=Math.abs(y-y0);
        var r=Math.round(Math.sqrt(w*w+h*h));
        id('first').value=r;
        id('between').innerHTML=units;
        if(x==x0) r=(y>y0)?180:0; // vertical
        else if(y==y0) r=(x>x0)?90:270; // horizontal
        else { // sloping
            r=Math.atan((y-y0)/(x-x0)); // radians
            r=r*180/Math.PI; // degrees...
            r=Math.round(r)+90; // ...as compass bearings
            if(x<x0) r+=180; 
        }
        id('second').value=r;
        id('after').innerHTML='&deg;';
    }
    else {
        id('first').value=w;
        id('between').innerHTML='x';
        id('second').value=h;
        id('after').innerHTML=units;
    }
}
function snapCheck() {
    console.log('check for snap-to-node');
    var nearNodes=nodes.filter(nearby);
    // console.log('snap potential: '+nearNodes.length);
    if(nearNodes.length>0) {
        var dMin=2*snapD;
        var d=0;
        for (var i=0;i<nearNodes.length;i++) {
            console.log('element '+nearNodes[i].el+' at '+nearNodes[i].x+','+nearNodes[i].y);
            d=Math.abs(nearNodes[i].x-x)+Math.abs(nearNodes[i].y-y);
            if(d<dMin) {
                dMin=d;
                x=nearNodes[i].x;
                y=nearNodes[i].y;
            }
        }
        console.log('snap to '+x+','+y);
        return true;
    }
    // console.log('no snap');
    return false;
}
function nearby(node) {
    return (node.x>x-snapD)&&(node.x<x+snapD)&&(node.y>y-snapD)&&(node.y<y+snapD);
}
function updateElement(id,attribute,val) {
    var dbTransaction=db.transaction('elements',"readwrite");
	console.log("indexedDB transaction ready");
	var dbObjectStore=dbTransaction.objectStore('elements');
	console.log("indexedDB objectStore ready");
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
	            // MAY NEED TO SAVE INDIVIDUAL ARRAY ITEMS
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
	        // ALSO TEXT SIZE AND TRANSFORM
	    }
	    console.log('element '+id+' '+attribute+' changed to '+val);
	    request=dbObjectStore.put(el);
	    request.onsuccess=function(event) {
			console.log("element '+id+' updated");
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
	var svg=id('graphic').innerHTML;
	console.log("SVG: "+svg);
	var fileName="drawing.svg";
	// var saveName=id('saveName').value;
	// if(saveName) fileName=saveName+".svg";
	console.log("save as "+fileName);
	// var json=JSON.stringify(data);
	var blob=new Blob([svg], {type:"data:image/svg+xml"});
	var a =document.createElement('a');
	a.style.display='none';
	var url = window.URL.createObjectURL(blob);
	a.href= url;
	a.download=fileName;
	document.body.appendChild(a);
	a.click();
	alert(fileName+" saved to downloads folder");
}
function report(text) {
	console.log(text);
}

/* following code is from 'badger' app...

id('squareButton').addEventListener('click', function() {
	badge.shape='square';
	var el="<rect id='badge' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='"+badge.col+"'/>";
	id('badgeSVG').innerHTML+=el;
	el="<clipPath id='badgeClip'><rect id='badgeClipSquare' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"'/></clipPath>";
	id('badgeSVG').innerHTML+=el;
	show('colour');
});

id('lozengeButton').addEventListener('click', function() {
	badge.shape='lozenge';
	var el="<rect id='badge' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' rx='"+(badge.size/5)+"' ry='"+(badge.size/5)+"' width='"+badge.size+"' height='"+badge.size+"' fill='"+badge.col+"'/>";
	id('badgeSVG').innerHTML+=el;
	el="<clipPath id='badgeClip'><rect id='badgeClipLozenge' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' rx='"+(badge.size/5)+"' ry='"+(badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"'/></clipPath>";
	id('badgeSVG').innerHTML+=el;
	show('colour');
});

id('circleButton').addEventListener('click', function() {
	badge.shape='circle';
	var el="<circle id='badge' cx='0' cy='0' r='"+badge.size/2+"' fill='"+badge.col+"'/>";
	id('badgeSVG').innerHTML+=el;
	el="<clipPath id='badgeClip'><circle id='badgeClipCircle' cx='0' cy='0' r='"+badge.size/2+"'/></clipPath>";
	id('badgeSVG').innerHTML+=el;
	show('colour');
});

id('diamondButton').addEventListener('click', function() {
	badge.shape='diamond';
	var el="<path id='badge' d='M"+(-badge.size/2)+" 0 L0"+(-badge.size/2)+" L"+(badge.size/2)+" 0 L0 "+(badge.size/2)+" Z' transform='scale(1)' fill='"+badge.col+"'/>";
	id('badgeSVG').innerHTML+=el;
	el="<clipPath id='badgeClip'><path id='badgeClipDiamond' d='M"+(-badge.size/2)+" 0 L0 "+(-badge.size/2)+" L"+(badge.size/2)+" 0 L0 "+(badge.size/2)+" Z' transform='scale(1)'/></clipPath>";
	id('badgeSVG').innerHTML+=el;
	show('colour');
});

id('shieldButton').addEventListener('click', function() {
	badge.shape='shield';
	var el="<path id='badge' d='M"+(-badge.size/2)+" 0 L"+(-badge.size/2)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(-badge.size/2)+" L"+(badge.size/2)+" 0 A"+(badge.size/2)+" "+(badge.size/2)+" 0 1 1 "+(-badge.size/2)+" 0' fill='"+badge.col+"' transform='scale(1)' />";
	id('badgeSVG').innerHTML+=el;
	el="<clipPath id='badgeClip'><path id='badgeClipShield' d='M"+(-badge.size/2)+" 0 L"+(-badge.size/2)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(-badge.size/2)+" L"+(badge.size/2)+" 0 A"+(badge.size/2)+" "+(badge.size/2)+" 0 1 1 "+(-badge.size/2)+" 0' transform='scale(1)'></clipPath>";
	id('badgeSVG').innerHTML+=el;
	show('colour');
});

// add other shapes

id('redButton').addEventListener('click', function() {
	setColour('red');
});

id('orangeButton').addEventListener('click', function() {
	setColour('orange');
});

id('yellowButton').addEventListener('click', function() {
	setColour('yellow');
});

id('limeButton').addEventListener('click', function() {
	setColour('lime');
});

id('greenButton').addEventListener('click', function() {
	setColour('green');
});

id('blueButton').addEventListener('click', function() {
	setColour('blue');
});

id('purpleButton').addEventListener('click', function() {
	setColour('purple');
});

id('whiteButton').addEventListener('click', function() {
	setColour('white');
});

id('grayButton').addEventListener('click', function() {
	setColour('gray');
});

id('blackButton').addEventListener('click', function() {
	setColour('black');
});

id('noPatternButton').addEventListener('click', function() {
	report("plain - no pattern");
	setPattern(null);
});

id('dotsButton').addEventListener('click', function() {
	report("dots");
	setPattern('dots');
});

id('checksButton').addEventListener('click', function() {
	report("checks");
	setPattern('checks');
});

id('HstripesButton').addEventListener('click', function() {
	report("horizontal stripes");
	setPattern('stripesH');
});

id('VstripesButton').addEventListener('click', function() {
	setPattern('stripesV');
});

id('diamondsButton').addEventListener('click', function() {
	report("diamonds");
	setPattern('diamonds');
});

id('RdiagonalsButton').addEventListener('click', function() {
	report("diagonalsR");
	setPattern('diagonalsR');
});

id('LdiagonalsButton').addEventListener('click', function() {
	report("diagonalsL");
	setPattern('diagonalsL');
});

id('crossesButton').addEventListener('click', function() {
	report("crosses");
	setPattern('crosses');
});

id('starsButton').addEventListener('click', function() {
	report("stars");
	setPattern('stars');
});

id('chevronsButton').addEventListener('click', function() {
	report("chevrons");
	setPattern('chevrons');
});

id('noBorderButton').addEventListener('click', function() {
	report("plain - no border");
	show('division');
});

id('outlineButton').addEventListener('click', function() {
	console.log('OUTLINE');
	var el="";
	border.size=0.95;	
	switch(badge.shape) {		
		case 'square':
			report("square outline");
			el="<rect id='outline' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='none' stroke='"+border.col+"' stroke-width='3'/>";
			badge.size*=border.size;
			id('badge').setAttribute('x',-badge.size/2);
			id('badge').setAttribute('y',-badge.size/2);
			id('badge').setAttribute('width',badge.size);
			id('badge').setAttribute('height',badge.size);
			id('badgeClipSquare').setAttribute('x',-badge.size/2);
			id('badgeClipSquare').setAttribute('y',-badge.size/2);
			id('badgeClipSquare').setAttribute('width',badge.size);
			id('badgeClipSquare').setAttribute('height',badge.size);
			break;
		case 'lozenge':
			report("lozenge outline");
			el="<rect id='outline' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' rx='"+(badge.size/5)+"' ry='"+(badge.size/5)+"' width='"+badge.size+"' height='"+badge.size+"' fill='none' stroke='"+border.col+"' stroke-width='3'/>";
			badge.size*=border.size;
			id('badge').setAttribute('x',-badge.size/2);
			id('badge').setAttribute('y',-badge.size/2);
			id('badge').setAttribute('rx',badge.size/5);
			id('badge').setAttribute('ry',badge.size/5);
			id('badge').setAttribute('width',badge.size);
			id('badge').setAttribute('height',badge.size);
			id('badgeClipLozenge').setAttribute('x',-badge.size/2);
			id('badgeClipLozenge').setAttribute('y',-badge.size/2);
			id('badgeClipLozenge').setAttribute('rx',badge.size/5);
			id('badgeClipLozenge').setAttribute('ry',badge.size/5);
			id('badgeClipLozenge').setAttribute('width',badge.size);
			id('badgeClipLozenge').setAttribute('height',badge.size);
			break;
		case 'circle':
			report("circle outline");
			el="<circle id='outline' cx='0' cy='0' r='"+badge.size/2+"' fill='none' stroke='"+border.col+"' stroke-width='5'/>";
			badge.size*=border.size;
			id('badge').setAttribute('r',badge.size/2);
			id('badgeClipCircle').setAttribute('r',badge.size/2);
			break;
		case 'diamond':
			report("diamond outline");
			el="<path id='outline' d='M"+(-badge.size/2)+" 0 L0"+(-badge.size/2)+" L"+(badge.size/2)+" 0 L0 "+(badge.size/2)+" Z' transform='scale(1)' fill='none' stroke='"+border.col+"' stroke-width='3'/>";
			badge.size*=border.size;
			id('badge').setAttribute('transform','scale('+border.size+')');
			id('badgeClipDiamond').setAttribute('transform','scale('+border.size+')');
			break;
		case 'shield':
			report("shield outline");
			el="<path id='outline' d='M"+(-badge.size/2)+" 0 L"+(-badge.size/2)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(-badge.size/2)+" L"+(badge.size/2)+" 0 A"+(badge.size/2)+" "+(badge.size/2)+" 0 1 1 "+(-badge.size/2)+" 0' fill='none' stroke='"+border.col+"' stroke-width='3' transform='scale(1)' />";
			badge.size*=border.size;
			id('badge').setAttribute('transform','scale('+border.size+')');
			id('badgeClipShield').setAttribute('transform', 'scale('+border.size+')');
			break;
	}
	id('badgeSVG').innerHTML+=el;
	element='outline';
	show('colour');
});

id('borderButton').addEventListener('click', function() {
	report("broad border");
	border.size=0.714; // 1/7th
	var el="";
	switch(badge.shape) {
		case 'square':
			report("square border");
			el="<mask id='borderMask'>";
			el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='white'/>";
			el+="<rect x='"+(-border.size*badge.size/2)+"' y='"+(-border.size*badge.size/2)+"' width='"+(border.size*badge.size)+"' height='"+(border.size*badge.size)+"' fill='black'/>";
			el+="</mask>";
			el+="<rect id='border' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' mask='url(#borderMask)' fill='"+border.col+"'/>";
			id('badgeSVG').innerHTML+=el;
			badge.size*=border.size;
			id('badge').setAttribute('x',-badge.size/2);
			id('badge').setAttribute('y',-badge.size/2);
			id('badge').setAttribute('width',badge.size);
			id('badge').setAttribute('height',badge.size);
			id('badgeClipSquare').setAttribute('x',-badge.size/2);
			id('badgeClipSquare').setAttribute('y',-badge.size/2);
			id('badgeClipSquare').setAttribute('width',badge.size);
			id('badgeClipSquare').setAttribute('height',badge.size);
			break;
		case 'lozenge':
			report("lozenge border");
			el="<mask id='borderMask'>";
			el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' rx='"+(badge.size/5)+"' ry='"+(badge.size/5)+"' width='"+badge.size+"' height='"+badge.size+"' fill='white'/>";
			el+="<rect x='"+(-border.size*badge.size/2)+"' y='"+(-border.size*badge.size/2)+"' rx='"+(border.size*badge.size/10)+"' ry='"+(border.size*badge.size/10)+"' width='"+(border.size*badge.size)+"' height='"+(border.size*badge.size)+"' fill='black'/>";
			el+="</mask>";
			el+="<rect id='border' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' rx='"+(badge.size/10)+"' ry='"+(badge.size/10)+"' width='"+badge.size+"' height='"+badge.size+"' mask='url(#borderMask)' fill='"+border.col+"'/>";
			id('badgeSVG').innerHTML+=el;
			badge.size*=border.size;
			id('badge').setAttribute('x',-badge.size/2);
			id('badge').setAttribute('y',-badge.size/2);
			id('badge').setAttribute('rx',badge.size/10);
			id('badge').setAttribute('ry',badge.size/10);
			id('badge').setAttribute('width',badge.size);
			id('badge').setAttribute('height',badge.size);
			id('badgeClipLozenge').setAttribute('x',-badge.size/2);
			id('badgeClipLozenge').setAttribute('y',-badge.size/2);
			id('badgeClipLozenge').setAttribute('rx',badge.size/10);
			id('badgeClipLozenge').setAttribute('ry',badge.size/10);
			id('badgeClipLozenge').setAttribute('width',badge.size);
			id('badgeClipLozenge').setAttribute('height',badge.size);
			break;
		case 'circle':
			report("circle border");
			el="<mask id='borderMask'>";
			el+="<circle cx='0' cy='0' r='"+badge.size/2+"' fill='white'/>";
			el+="<circle cx='0' cy='0' r='"+(badge.size*border.size/2)+"' fill='black'/>";
			el+="</mask>";
			el+="<circle id='border' cx='0' cy='0' r='"+badge.size/2+"' mask='url(#borderMask)'/>";
			id('badgeSVG').innerHTML+=el;
			badge.size*=border.size;
			id('badge').setAttribute('r',badge.size/2);
			id('badgeClipCircle').setAttribute('r',badge.size/2);
			break;
		case 'diamond':
			report("diamond border");
			el="<mask id='borderMask'>";
			var b=badge.size;
			el+="<path d='M"+(-b/2)+" 0 L0 "+(-b/2)+" L"+(b/2)+" 0 L0 "+(b/2)+" Z' fill='white'/>";
			b*=border.size;
			el+="<path d='M"+(-b/2)+" 0 L0 "+(-b/2)+" L"+(b/2)+" 0 L0 "+(b/2)+" Z' fill='black'/>";
			el+="</mask>";
			el+="<rect id='border' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"'  mask='url(#borderMask)' fill='"+border.col+"'/>";
			id('badgeSVG').innerHTML+=el;
			b=badge.size-b;
			badge.size*=border.size;
			id('badge').setAttribute('transform','scale('+border.size+')');
			id('badgeClipDiamond').setAttribute('transform','scale('+border.size+')');
			break;
		case 'shield':
			report("shield border");
			el="<mask id='borderMask'>";
			var b=badge.size;
			el+="<path d='M"+(-b/2)+" 0 L"+(-b/2)+" "+(-b/2)+" L"+(b/2)+" "+(-b/2)+" L"+(b/2)+" 0 A"+(b/2)+" "+(b/2)+" 0 1 1 "+(-b/2)+" 0' fill='white'/>";
			b*=border.size;
			el+="<path d='M"+(-b/2)+" 0 L"+(-b/2)+" "+(-b/2)+" L"+(b/2)+" "+(-b/2)+" L"+(b/2)+" 0 A"+(b/2)+" "+(b/2)+" 0 1 1 "+(-b/2)+" 0' fill='black'/>";
			el+="</mask>";
			el+="<rect id='border' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"'  mask='url(#borderMask)' fill='"+border.col+"'/>";
			id('badgeSVG').innerHTML+=el;
			b=badge.size-b;
			badge.size*=border.size;
			id('badge').setAttribute('transform','scale('+border.size+')');
			id('badgeClipShield').setAttribute('transform','scale('+border.size+')');
			break;
	}
	element='border';
	show('colour');
});

id('noDivisionButton').addEventListener('click', function() {
	report("full - no division");
	show('band');
});

id('VdivButton').addEventListener('click', function() {
	report("vertical division");
	var el="<mask id='divisionMask'>";
	el+="<rect x='0' y='"+(-badge.size/2)+"' width='"+(badge.size/2)+"' height='"+badge.size+"' fill='white'/>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+(badge.size/2)+"' height='"+badge.size+"' fill='black'/>";
	el+="</mask>";	
	el+="<rect id='division' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#divisionMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	division.type='vertical';
	division.col='black';
	element='division';
	show('colour');
});

id('HdivButton').addEventListener('click', function() {
	report("horizontal division");
	var el="<mask id='divisionMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='0' width='"+badge.size+"' height='"+badge.size+"' fill='white'/>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+(badge.size/2)+"' fill='black'/>";
	el+="</mask>";
	el+="<rect id='division' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#divisionMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	division.type='horizontal';
	division.col='black';
	element='division';
	show('colour');
});

id('SEdivButton').addEventListener('click', function() {
	report("SE diagonal division");
	var el="<mask id='divisionMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<path d='M"+(-badge.size/2)+" "+(badge.size/2)+" L"+(badge.size/2)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(badge.size/2)+" Z' fill='white'/>";
	el+="</mask>";
	el+="<rect id='division' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#divisionMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	division.type='diagonalSE';
	division.col='black';
	element='division';
	show('colour');
});

id('SWdivButton').addEventListener('click', function() {
	report("SW diagonal division");
	var el="<mask id='divisionMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<path d='M"+(-badge.size/2)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(badge.size/2)+" L"+(-badge.size/2)+" "+(badge.size/2)+" Z' fill='white'/>";
	el+="</mask>";
	el+="<rect id='division' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#divisionMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	division.type='diagonalSE';
	division.col='black';
	element='division';
	show('colour');
});

id('quartersButton').addEventListener('click', function() {
	report("quarters division");
	var el="<mask id='divisionMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+(badge.size/2)+"' height='"+(badge.size/2)+"' fill='white'/>";
	el+="<rect x='0' y='0' width='"+(badge.size/2)+"' height='"+(badge.size/2)+"' fill='white'/>";
	el+="</mask>";
	el+="<rect id='division' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#divisionMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	division.type='quarters';
	division.col='black';
	element='division';
	show('colour');
});

id('diagonalQuartersButton').addEventListener('click', function() {
	report("diagonal quarters division");
	var el="<mask id='divisionMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<path d='M0 0 L"+(badge.size/2)+" "+(badge.size/2)+" L"+(-badge.size/2)+" "+(badge.size/2)+"L0 0 L"+(-badge.size/2)+" "+(-badge.size/2)+" L "+(badge.size/2)+" "+(-badge.size/2)+" Z' fill='white'/>";
	el+="</mask>";
	el+="<rect id='division' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#divisionMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	division.type='diagonalQuarters';
	division.col='black';
	element='division';
	show('colour');
});

id('cantonButton').addEventListener('click', function() {
	report("cannton division");
	var el="<mask id='divisionMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+(badge.size/2)+"' height='"+(badge.size/2)+"' fill='white'/>";
	el+="</mask>";
	el+="<rect id='division' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#divisionMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	division.type='canton';
	division.col='black';
	element='division';
	show('colour');
});

id('noBandButton').addEventListener('click', function() {
	report("plain - no band");
	show('symbol');
});

id('chiefButton').addEventListener('click', function() {
	report("chief");
	var el="<mask id='bandMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+(badge.size/5)+"' fill='white'/>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-0.3*badge.size)+"' width='"+badge.size/2+"' height='"+(0.8*badge.size)+"' fill='black'/>";
	el+="</mask>";
	el+="<rect id='band' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#bandMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	band.type='chief';
	band.col='black';
	element='band';
	show('colour');
});

id('paleButton').addEventListener('click', function() {
	report("pale");
	var el="<mask id='bandMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<rect x='"+(-badge.size/10)+"' y='"+(-badge.size/2)+"' width='"+(badge.size/5)+"' height='"+(badge.size)+"' fill='white'/>";
	el+="</mask>";
	el+="<rect id='band' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#bandMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	band.type='pale';
	band.col='black';
	element='band';
	show('colour');
});

id('fessButton').addEventListener('click', function() {
	report("fell");
	var el="<mask id='bandMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/10)+"' width='"+badge.size+"' height='"+(badge.size/5)+"' fill='white'/>";
	el+="</mask>";
	el+="<rect id='band' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#bandMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	band.type='fell';
	band.col='black';
	element='band';
	show('colour');
});

id('RbendButton').addEventListener('click', function() {
	report("right bend");
	var el="<mask id='bandMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<path d='M"+(-badge.size/2)+" "+(0.37*badge.size)+" L"+(0.37*badge.size)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(-0.37*badge.size)+" L"+(-0.37*badge.size)+" "+(badge.size/2)+" L"+(-badge.size/2)+" "+(badge.size/2)+" Z' fill='white'/>";
	el+="</mask>";
	el+="<rect id='band' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#bandMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	band.type='bendR';
	band.col='black';
	element='band';
	show('colour');
});

id('LbendButton').addEventListener('click', function() {
	report("left bend");
	var el="<mask id='bandMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<path d='M"+(-badge.size/2)+" "+(-badge.size/2)+" L"+(-0.37*badge.size)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(0.37*badge.size)+" L"+(badge.size/2)+" "+(badge.size/2)+  " L"+(0.37*badge.size)+" "+(badge.size/2)+" L"+(-badge.size/2)+" "+(-0.37*badge.size)+" Z' fill='white'/>";
	el+="</mask>";
	el+="<rect id='band' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#bandMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	band.type='bendL';
	band.col='black';
	element='band';
	show('colour');
});

id('crossedButton').addEventListener('click', function() {
	report("crossed bands");
	var el="<mask id='bandMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/10)+"' width='"+badge.size+"' height='"+(badge.size/5)+"' fill='white'/>";
	el+="<rect x='"+(-badge.size/10)+"' y='"+(-badge.size/2)+"' width='"+(badge.size/5)+"' height='"+badge.size+"' fill='white'/>";
	el+="</mask>";
	el+="<rect id='band' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#bandMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	band.type='crossed';
	band.col='black';
	element='band';
	show('colour');
});

id('saltireButton').addEventListener('click', function() {
	report("saltire");
	var el="<mask id='bandMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<path d='M"+(-badge.size/2)+" "+(-badge.size/2)+" L"+(-0.37*badge.size)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(0.37*badge.size)+" L"+(badge.size/2)+" "+(badge.size/2)+  " L"+(0.37*badge.size)+" "+(badge.size/2)+" L"+(-badge.size/2)+" "+(-0.37*badge.size)+" Z' fill='white'/>";
	el+="<path d='M"+(-badge.size/2)+" "+(0.37*badge.size)+" L"+(0.37*badge.size)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(-badge.size/2)+" L"+(badge.size/2)+" "+(-0.37*badge.size)+" L"+(-0.37*badge.size)+" "+(badge.size/2)+" L"+(-badge.size/2)+" "+(badge.size/2)+" Z' fill='white'/>";
	el+="</mask>";
	el+="<rect id='band' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#bandMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	band.type='bendL';
	band.col='black';
	element='band';
	show('colour');
});

id('chevronUpButton').addEventListener('click', function() {
	report("chevron up");
	var el="<mask id='bandMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<path d='M"+(-badge.size/2)+" "+(0.11*badge.size)+" L0 "+(-0.39*badge.size)+" L"+(badge.size/2)+" "+(0.11*badge.size)+" L"+(badge.size/2)+" "+(0.39*badge.size)+" L0 "+(-0.11*badge.size)+" L"+(-badge.size/2)+" "+(0.39*badge.size)+" Z' fill='white'/>";
	el+="</mask>";
	el+="<rect id='band' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#bandMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	band.type='chevronUp';
	band.col='black';
	element='band';
	show('colour');
});

id('chevronDownButton').addEventListener('click', function() {
	report("chevron down");
	var el="<mask id='bandMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<path d='M"+(-badge.size/2)+" "+(-0.11*badge.size)+" L0 "+(0.39*badge.size)+" L"+(badge.size/2)+" "+(-0.11*badge.size)+" L"+(badge.size/2)+" "+(-0.39*badge.size)+  " L0 "+(0.11*badge.size)+" L"+(-badge.size/2)+" "+(-0.39*badge.size)+" Z' fill='white'/>";
	el+="</mask>";
	el+="<rect id='band' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#bandMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	band.type='chevronUp';
	band.col='black';
	element='band';
	show('colour');
});

id('noSymbolButton').addEventListener('click', function() {
	report("no symbol");
	element='badge';
	show('save');
});

id('ballButton').addEventListener('click', function() {
	report("ball");
	var el="<circle id='symbol' cx='0' cy='0' r='"+(badge.size*0.2)+"' fill='black'/>";
	id('badgeSVG').innerHTML+=el;
	element="symbol";
	show("colour");
});

id('ringButton').addEventListener('click', function() {
	report("ring");
	var el="<mask id='symbolMask'>";
	el+="<rect x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black'/>";
	el+="<circle cx='0' cy='0' r='"+(badge.size*0.2)+"' fill='white'/>";
	el+="<circle cx='0' cy='0' r='"+(badge.size*0.1)+"' fill='black'/>";
	el+="</mask>";
	el+="<rect id='symbol' x='"+(-badge.size/2)+"' y='"+(-badge.size/2)+"' width='"+badge.size+"' height='"+badge.size+"' fill='black' mask='url(#symbolMask)' clip-path='url(#badgeClip)'/>";
	id('badgeSVG').innerHTML+=el;
	element="symbol";
	show("colour");
});

id('boxButton').addEventListener('click', function() {
	report("box");
	var el="<rect id='symbol' x='"+(-badge.size/5)+"' y='"+(-badge.size/5)+"' width='"+(badge.size*0.4)+"' height='"+(badge.size*0.4)+"' fill='black'/>";
	id('badgeSVG').innerHTML+=el;
	element="symbol";
	show("colour");
});

id('dmndButton').addEventListener('click', function() {
	report("diamond");
	var el="<path id='symbol' d='M "+(-badge.size/5)+" 0 L0 "+(-badge.size/5)+" L"+(badge.size/5)+" 0 L0 "+(badge.size/5)+" Z' fill='black'/>";
	id('badgeSVG').innerHTML+=el;
	element="symbol";
	show("colour");
});

id('crossButton').addEventListener('click', function() {
	report("cross");
	var d=badge.size/5;
	var el="<path id='symbol' d='M"+(d/2)+" "+(d/2)+" l"+d+" 0 l 0 "+(-d)+" l"+(-d)+" 0 l0"+(-d)+" l"+(-d)+" 0 l 0 "+d+" l "+(-d)+" 0 l0 "+d+" l"+d+" 0 l0 "+d+" l"+d+" 0 Z' fill='black'/>";
	id('badgeSVG').innerHTML+=el;
	element="symbol";
	show("colour");
});

id('starButton').addEventListener('click', function() {
	report("star");
	var r=badge.size/3;
	var el="<path id='symbol' d='M0 "+(-r)+" L"+(0.588*r)+" "+(0.809*r)+" L"+(-0.951*r)+" "+(-0.309*r)+" L"+(0.951*r)+" "+(-0.309*r)+" L"+(-0.558*r)+" "+(0.809*r)+" Z' fill='black'/>";
	id('badgeSVG').innerHTML+=el;
	element="symbol";
	show("colour");
});

// add other symbols

id('saveButton').addEventListener('click',saveSVG);

function setColour(col) {
	report("set  colour of "+element+" to "+col+" - pattern is "+pattern);
	switch(element) {
		case 'badge':
			if(pattern) {
				id('badgeFront').setAttribute('fill', col);
				pattern=false;
				show('border');
			}
			else {
				badge.col=col;
				id('badge').setAttribute('fill',col);
				show('pattern');
			}
			break;
		case 'outline':
			border.col=col;
			id('outline').setAttribute('stroke', border.col);
			show('division'); 
			break;
		case 'border':
			border.col=col;
			id('border').setAttribute('fill',col);
			element='badge';
			show('division');
			break;
		case 'band':
			if(pattern) {
				id('bandFront').setAttribute('fill', col);
				pattern=false;
				show('symbol');
			}
			else {
				band.col=col;
				id('band').setAttribute('fill', col);
				show('pattern');
			}
			break;
		case 'division':
			if(pattern) {
				id('divisionFront').setAttribute('fill', col);
				pattern=false;
				show('band');
			}
			else {
				division.col=col;
				id('division').setAttribute('fill', col);
				show('pattern');
			}
			break;
		case 'symbol':
			id('symbol').setAttribute('fill',col);
			element='badge';
			show('save');
			break;
	}
};

function setPattern(type) {
	console.log("set pattern "+type+" for "+element+" badge size "+badge.size);
	if(type==null) {
		switch(element) {
			case 'badge':
				show('border');
				break;
			case 'division':
				show('band');
				break;
			case 'band':
				show('symbol');
				break;
		}
		return;
	}
	var backCol='white';
	switch(element) {
		case 'badge':
			backCol=badge.col;
			break;
		case 'border':
			backCol=border.col;
			break;
		case 'band':
			backCol=band.col;
			break;
		case 'division':
			backCol=division.col;
	}
	switch(type) {
		case 'dots':
			var el="<pattern id='"+element+"Pattern' viewBox='0,0,10,10' width='0.1' height='0.1'>";
			el+="<rect id='"+element+"Back' x='0' y='0' width='10' height='10' fill='"+backCol+"'/>";
			el+="<circle id='"+element+"Front' cx='5' cy='5' r='3' fill='black'></circle>";
			el+="</pattern>";
			break;
		case 'checks':
			var el="<pattern id='"+element+"Pattern' viewBox='0,0,10,10' width='0.2' height='0.2'>";
			el+="<rect id='"+element+"Back' x='0' y='0' width='10' height='10' fill='"+backCol+"'/>"	;
			el+="<path id='"+element+"Front' d='M0 0 L5 0 L5 5 L0 5 L0 0 M5 5 L10 5 L10 10 L5 10 L5 5' fill='black'/>";
			el+="</pattern>";
			break;
		case 'stripesH':
			var el="<pattern id='"+element+"Pattern' viewBox='0,0,10,10' width='0.1' height='0.1'>";
			el+="<rect id='"+element+"Back' x='0' y='0' width='10' height='5' fill='"+backCol+"'/>";
			el+="<rect id='"+element+"Front' x='0' y='5' width='10' height='5' fill='black'/>";
			el+="</pattern>";
			break;
		case 'stripesV':
			var el="<pattern id='"+element+"Pattern' viewBox='0,0,10,10' width='0.1' height='0.1'>";
			el+="<rect id='"+element+"Back' x='0' y='0' width='5' height='10' fill='"+backCol+"'/>";
			el+="<rect id='"+element+"Front' x='5' y='0' width='5' height='10' fill='black'/>";
			el+="</pattern>";
			break;
		case 'diamonds':
			var el="<pattern id='"+element+"Pattern' viewBox='0,0,10,10' width='0.1' height='0.1'>";
			el+="<rect id='"+element+"Back' x='0' y='0' width='10' height='10' fill='"+backCol+"'/>";
			el+="<path id='"+element+"Front' d='M5 0 L10 5 L5 10 L0 5 Z' fill='black'/>";
			el+="</pattern>";
			break;
		case 'diagonalsR':
			var el="<pattern id='"+element+"Pattern' viewBox='0,0,10,10' width='0.1' height='0.1'>";
			el+="<rect id='"+element+"Back' x='0' y='0' width='10' height='10' fill='"+backCol+"'/>";
			el+="<path id='"+element+"Front' d='M0 0 L5 0 L0 5 L0 0 M0 10 L10 0 L10 5 L5 10 L0 10' fill='black'/>";
			el+="</pattern>";
			break;
		case 'diagonalsL':
			var el="<pattern id='"+element+"Pattern' viewBox='0,0,10,10' width='0.1' height='0.1'>";
			el+="<rect id='"+element+"Back' x='0' y='0' width='10' height='10' fill='"+backCol+"'/>";
			el+="<path id='"+element+"Front' d='M0 0 L10 10 L5 10 L0 5 L0 0 M5 0 L10 0 L10 5 L5 0' fill='black'/>";
			el+="</pattern>";
			break;
		case 'crosses':
			var el="<pattern id='"+element+"Pattern' viewBox='0,0,10,10' width='0.1' height='0.1'>";
			el+="<rect id='"+element+"Back' x='0' y='0' width='10' height='10' fill='"+backCol+"'/>";
			el+="<path id='"+element+"Front' d='M4 2 L6 2 L6 4 L8 4 L8 6 L6 6 L6 8 L4 8 L4 6 L2 6 L2 4 L4 4 Z' fill='black'/>";
			el+="</pattern>";
			break;
		case 'stars':
			var el="<pattern id='"+element+"Pattern' viewBox='0,0,10,10' width='0.1' height='0.1'>";
			el+="<rect id='"+element+"Back' x='0' y='0' width='10' height='10' fill='"+backCol+"'/>";
			el+="<path id='"+element+"Front' d='M5 2 L6.76 7.43 L2.15 4.07 L7.85 4.07 L3.24 7.43 Z' fill='black'/>";
			el+="</pattern>";
			break;
		case 'chevrons':
			var el="<pattern id='"+element+"Pattern' viewBox='0,0,10,10' width='0.1' height='0.1'>";
			el+="<rect id='"+element+"Back' x='0' y='0' width='10' height='10' fill='"+backCol+"'/>";
			el+="<path id='"+element+"Front' d='M0 5 L5 0 L10 5 L10 10 L5 5 L0 10 Z' fill='black'/>";
			el+="</pattern>";
			break;
		}
	id('badgeSVG').innerHTML+=el;
	var url="url(#"+element+"Pattern)";
	id(element).setAttribute('fill',url);
	pattern=true;
	show('colour');
}

function saveSVG() {
	var svg=id('graphic').innerHTML;
	console.log("SVG: "+svg);
	var fileName="badge.svg";
	var saveName=id('saveName').value;
	if(saveName) fileName=saveName+".svg";
	console.log("save as "+fileName);
	// var json=JSON.stringify(data);
	var blob=new Blob([svg], {type:"data:image/svg+xml"});
	var a =document.createElement('a');
	a.style.display='none';
	var url = window.URL.createObjectURL(blob);
	a.href= url;
	a.download=fileName;
	document.body.appendChild(a);
	a.click();
	alert(fileName+" saved to downloads folder");
}

function show(name) {
	report("switch to "+name+"Dialog from "+currentDialog);
	if(currentDialog) id(currentDialog).style.display='none';
	// id('element').innerHTML=element;
	// id('dialog').innerHTML=name;
	currentDialog=name+'Dialog';
	id(currentDialog).style.display='block';
}
*/

// START-UP CODE
var request=window.indexedDB.open("ddDB");
request.onsuccess=function(event) {
    db=event.target.result;
    console.log("ddDB open");
    var dbTransaction=db.transaction('elements',"readwrite");
    console.log("indexedDB transaction ready");
    var dbObjectStore=dbTransaction.objectStore('elements');
    console.log("indexedDB objectStore ready");
    // code to read elements from database
    nodes=[];
    console.log("node array ready");
    var request=dbObjectStore.openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if (cursor) {
            var el=cursor.value;
            var html="<"+el.type+" id='"+el.id+"' ";
            switch(el.type) {
                case 'polyline':
                    html+="points='"+el.points+"' ";
                    html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
                    if(el.lineStyle) html+="stroke-dasharray='"+el.lineStyle+"' ";
                    html+="stroke-opacity='"+el.opacity+"' ";
                    html+="fill='"+el.fill+"' ";
                    html+="fill-opacity='"+el.opacity+"' ";
                    if(el.transform) html+="transform='"+el.transform+"'";
                    html+="></polyline>";
                    console.log('add element svg: '+html);
                    for(var i=0;i<el.points.length;i++) {
                        nodes.push({'x':el.points[i].x,'y':el.points[i].y,'el':el.id});
                    }
                    break;
                case 'rect':
                    html+="x='"+el.x+"' y='"+el.y+"' width='"+el.width+"' height='"+el.height+"' ";
                    html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
                    if(el.lineStyle) html+="stroke-dasharray='"+el.lineStyle+"' ";
                    html+="stroke-opacity='"+el.opacity+"' ";
                    html+="fill='"+el.fill+"' ";
                    html+="fill-opacity='"+el.opacity+"' ";
                    if(el.transform) html+="transform='"+el.transform+"'";
                    html+="></rect>";
                    console.log('add element svg: '+html);
                    nodes.push({'x':el.x,'y':el.y,'el':el.id});
                    nodes.push({'x':el.x,'y':el.y+el.height,'el':el.id});
                    nodes.push({'x':el.x+el.width,'y':el.y,'el':el.id});
                    nodes.push({'x':el.x+el.width,'y':el.y+el.height,'el':el.id});
                    break;
                case 'ellipse':
                    html+="cx='"+el.cx+"' cy='"+el.cy+"' rx='"+el.rx+"' ry='"+el.ry+"' ";
                    html+="stroke='"+el.stroke+"' stroke-width='"+el.lineW+"' ";
                    if(el.lineStyle) html+="stroke-dasharray='"+el.lineStyle+"' ";
                    html+="stroke-opacity='"+el.opacity+"' ";
                    html+="fill='"+el.fill+"' ";
                    html+="fill-opacity='"+el.opacity+"' ";
                    if(el.transform) html+="transform='"+el.transform+"'";
                    html+="></ellipse>";
                    console.log('add element svg: '+html);
                    nodes.push({'x':el.cx,'y':el.cy,'el':el.id});
                    nodes.push({'x':el.cx-el.rx,'y':el.cy,'el':el.id});
                    nodes.push({'x':el.cx+el.rx,'y':el.cy,'el':el.id});
                    nodes.push({'x':el.cx,'y':el.cy-el.ry,'el':el.id});
                    nodes.push({'x':el.cx,'y':el.cy+el.ry,'el':el.id});
                    break;
            }
            var len=nodes.length;
            console.log(len+ ' nodes');
            for(var i=len-4;i<len;i++) console.log('node: '+nodes[i].x+','+nodes[i].y+' el:'+nodes[i].el);
            id('dwg').innerHTML+=html;
            elID=parseInt(el.id.substr(1))+1;
		    // elements.push(cursor.value); INSTEAD CREATE SVG ELEMENT THEN...
		    // GET NODES FROM EACH ELEMENT AND ADD TO NODES ARRAY
		    // ADD TO dwg (OR TO ref OR nts GROUPS OR IN defs IF SYMBOL)
	    	cursor.continue();  
        }
	    else {
		    console.log("No more entries. elID: "+elID);
		    // SORT NODES BY x AND y COORDINATES
		    /*
		    console.log(logs.length+" elements"); // OR NODES?
		    if(elements.length<1) { // no elements (NODES?) - offer to restore backup
		    alert('no elements');
		        // toggleDialog('importDialog',true);
		        return
		    }
		    logs.sort(function(a,b) { return Date.parse(a.date)-Date.parse(b.date)}); // date order
		    for(var i in logs) { // populate tagChooser
  			    for(var j in logs[i].tags) { // for each tag in each log...
				    if(tags.indexOf(logs[i].tags[j])<0) { // ...if not already in tags...
					    tags.push(logs[i].tags[j]); // ...add it
				    }
			    }
  		    }
  		    tags.sort(); // sort tags alphabetically and populate tag choosers
  		    for(i in tags) {
			    var tag=document.createElement('option');
			    tag.text=tags[i];
			    tag=document.createElement('option');
			    tag.text=tags[i];
			    id('tagChooser').options.add(tag);
			    var stag=document.createElement('option');
			    stag.text=tags[i];
			    stag=document.createElement('option');
			    stag.text=tags[i];
			    id('searchTagChooser').options.add(stag);
  		    }
  		    console.log('search tags: '+id('searchTagChooser').options.length);
		    populateList();
		    */
	    }
    };
};
request.onupgradeneeded=function(event) {
	var dbObjectStore=event.currentTarget.result.createObjectStore("elements", { keyPath: 'id', autoIncrement: false });
	console.log("new elements ObjectStore created");
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
		// console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}