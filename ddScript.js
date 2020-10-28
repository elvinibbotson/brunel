// GLOBAL VARIABLES
var aspect=null;
var zoom=1;
var mode=null;
var scale=1;
// var canvas=null;
var drawingX=0;
var drawingY=0;
var x=0;
var y=0;
var x0=0;
var y0=0;
var w=0;
var h=0;
var elID=0;
var selection=[];
var timer=null;
var element=null; // current element
var elementID=null; // id of current element 
var lineType='solid'; // default styles
var lineShade='black';
var penW=0.25; // 0.25mm at 1:1 scale - increase for smaller scales (eg.12.5 at 1:50 scale)
var fillType=0;
var fillShade='gray';
var opacity='1';
var handleR=2; // 2mm handle radius at 1:1 scale - increase for smaller scales (eg. 100 at 1:50)
var snap=5; // 5mm snap distance at 1:1 scale - increase for smaller scales (eg. 250 at 1:50)
var currentDialog=null;
var sw=screen.width;
var sh=screen.height;
console.log("screen size "+sw+"x"+sh);

// TOOLS
// file
id('fileButton').addEventListener('click',function() { // SHOULD SHOW FILE MENU BUT FOR NOW...
    showDialog('fileMenu',true);
})
id('new').addEventListener('click',function() {
    report("show New Drawing dialog");
    showDialog('fileMenu',false);
    showDialog('newDrawing',true);
})
id('save').addEventListener('click',function() {
    saveSVG();
    showDialog('fileMenu',false);
})
// SET DRAWING ASPECT
aspect=window.localStorage.getItem('aspect');
if(!aspect) showDialog('newDrawing',true);
else console.log('aspect is '+aspect);
id('landscapeButton').addEventListener('click',function() {
    aspect='landscape';
    window.localStorage.setItem('aspect','landscape');
    showDialog('newDrawing',false);
})
id('portraitButton').addEventListener('click',function() {
    aspect='portrait';
    window.localStorage.setItem('aspect','portrait');
    showDialog('newDrawing',false);
})
// id('scaleSelect').addEventListener('') {} SET SCALE
scale=1; // FOR NOW
if(aspect=='landscape') {
    id('dwgSVG').setAttribute('width','297mm');
    id('dwgSVG').setAttribute('height','210mm');
    id('dwgSVG').setAttribute("viewBox", "0 0 297 210");
}
else {
    id('dwgSVG').setAttribute('width','210mm');
    id('dwgSVG').setAttribute('height','297mm');
    id('dwgSVG').setAttribute("viewBox", "0 0 210 297");
}
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
id('lineButton').addEventListener('click', function() { // (POLY)LINE: JUST CLICK - NO HOLD OR DRAG
    mode='line';
    showInfo(true,'LINE: press at start');
})
id('boxButton').addEventListener('click',function() { // BOX(& SQUARE): JUST CLICK - NO HOLD OR DRAG
    mode='box';
    showInfo(true,'BOX: press at start');
})
id('ovalButton').addEventListener('click',function() { // OVAL/CIRCLE
    mode='oval';
    showInfo(true,'OVAL: press at centre');
})
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
                element.setAttribute('stroke-dasharray',null);
                break;
            case 'dashed':
                element.setAttribute('stroke-dasharray','3 3');
                break;
            case 'dotted':
                element.setAttribute('stroke-dasharray','1 1');
        }
        console.log('set element '+element.id+' line style to '+type);
    }
    else { // change default line type
        lineType=type;
        console.log('line type is '+type);
        id('styles').style.borderStyle=type;
    }
})
id('penSelect').addEventListener('change',function() {
    var pen=event.target.value;
    console.log('pen width: '+pen+'mm');
    id('penWidth').value=pen;
    if(elementID) { // change selected element
        element=id(elementID);
        element.setAttribute('stroke-width',pen);
        console.log('set element '+element.id+' pen to '+pen);
    }
    else { // change default pen width
        penW=pen;
        console.log('pen is '+penW);
        id('styles').style.borderWidth=pen+'mm 0 0 '+pen+'mm';
    }
})
id('lineShade').addEventListener('change',function() {
    var shade=event.target.value;
    if(elementID) { // change selected element
        element=id(elementID);
        element.setAttribute('stroke',shade);
        console.log('set element '+element.id+' line shade to '+shade);
    }
    else { // change default line shade
        console.log('line shade: '+shade);
        lineShade=shade;
        id('styles').style.borderColor=shade;
    }
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
            var val=element.getAttribute('fill');
            console.log('set element fill to '+val);
            element.setAttribute('fill',val);
            val=element.getAttribute('fill-opacity');
            id('styles').style.opacity=val;
        }
        else {  // no fill
            element.setAttribute('fill','none');
            id('styles').style.opacity=0;
        }
    }
    else { // change default fill pattern
        fillType=fill;
        console.log('fillType set to '+fill);
        if(fill==0) {
            console.log('set fill to none');
            id('styles').style.opacity=0;
        }
        else {
            console.log('set fill to '+fillShade);
            id('styles').style.opacity=opacity;
        }
    }
})
id('fillShade').addEventListener('change',function() {
    var val=event.target.value;
    console.log('fill shade: '+val);
    if(elementID) { // change selected element
        element=id(elementID);
        element.setAttribute('fill',val);
        console.log('set element '+element.id+' fill shade to '+val);
        id('styles').style.background=val;
    }
    else { // change default fill shade
        console.log('fill shade: '+val);
        fillShade=val;
        if(fillType>0) id('styles').style.background=val;
    }
    // ADJUST SELECTED ELEMENT(S) OR DEFAULT
})
id('opacity').addEventListener('change',function() {
    var val=event.target.value;
    console.log('opacity: '+val);
    if(elementID) { // change selected element
        element=id(elementID);
        element.setAttribute('stroke-opacity',val);
        element.setAttribute('fill-opacity',val);
    }
    else opacity=val; // change default opacity
    id('styles').style.opacity=val;
})
// TOUCH - START
id('graphic').addEventListener('touchstart',function() {
    event.preventDefault();
    console.log('dialog: '+currentDialog);
    if(currentDialog) showDialog(currentDialog,false);
    console.log('touch at '+event.touches[0].clientX/3.78+','+event.touches[0].clientY/3.78);
    x=x0=Math.round(event.touches[0].clientX/3.78-drawingX);
    y=y0=Math.round(event.touches[0].clientY/3.78-drawingY);
    switch(mode) {
        case 'line':
            element=id('bluePolyline');
            var point=id('dwgSVG').createSVGPoint();
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
            var el=event.target.id;
            console.log('select '+el+' at '+x0+','+y0);
            if(el=='dwgSVG') {
                var hit=null;
                var e=-5;
                var n=-5;
                while(e<6 && !hit) {
                    n=-5;
                    while(n<6 && !hit) {
                        var el=document.elementFromPoint(x0*3.78+e+drawingX*3.78,y0*3.78+n+drawingY*3.78);
                        if(el.id.startsWith('node')) hit=el;
                        n++;
                    }
                    e++;
                }
                if(hit) console.log('touch: '+el.id);
            }
            break;
    }
    event.stopPropagation();
})
// TOUCH - MOVE
id('graphic').addEventListener('touchmove',function() {
    event.preventDefault();
    x=Math.round(event.touches[0].clientX/3.78);
    y=Math.round(event.touches[0].clientY/3.78);
    switch(mode) {
        case 'line':
            if(Math.abs(x-x0)<snap) x=x0; // snap to vertical
            if(Math.abs(y-y0)<snap) y=y0; // snap to horizontal
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
            if(Math.abs(w-h)<snap*2) w=h; // snap to square
            id('blueBox').setAttribute('x',boxX);
            id('blueBox').setAttribute('y',boxY);
            id('blueBox').setAttribute('width',w);
            id('blueBox').setAttribute('height',h);
            setSizes(false);
            break;
        case 'oval':
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            if(Math.abs(w-h)<snap*2) w=h; // snap to circle
            id('blueOval').setAttribute('rx',w);
            id('blueOval').setAttribute('ry',h);
            w=Math.abs(w*2);
            h=Math.abs(h*2);
            setSizes(false);
    }
    event.stopPropagation();
})
// TOUCH - END
id('graphic').addEventListener('touchend',function() {
    switch(mode) {
        case 'line':
            var d=Math.sqrt((x-x0)*(x-x0)+(y-y0)*(y-y0));
            if(d<snap) { // click/tap to finish polyline
                console.log('end polyline');
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
                id('bluePolyline').setAttribute('stroke-width',penW);
                id('bluePolyline').setAttribute('stroke-opacity',opacity);
                id('bluePolyline').setAttribute('id','~'+elID);
                elID++;
                var el="<polyline id='bluePolyline' points='0,0' stroke='blue' fill='none'/>";
                id('dwgSVG').innerHTML+=el;
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
            html+=" stroke-width="+penW+" stroke-opacity='"+opacity+"' fill='";
            console.log('fillType: '+fillType+' fillShade: '+fillShade);
            if(fillType>0) html+=fillShade;
            else if(fillType==0) html+="none";
            // PATTERN FILL?
            html+="' fill-opacity='"+opacity+"'>";
            console.log('box svg: '+html);
            id('dwgSVG').innerHTML+=html;
	        console.log("box svg drawn: "+x0+','+y0+' to '+(x0+w)+','+(y0+h));
	        elID++;
	        id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
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
            html+=" stroke-width="+penW+" stroke-opacity='"+opacity+"' fill='";
            console.log('fillType: '+fillType+' fillShade: '+fillShade);
            if(fillType>0) html+=fillShade;
            else if(fillType==0) html+="none";
            // PATTERN FILL?
            html+="' fill-opacity='"+opacity+"'>";
            console.log('oval svg: '+html);
            id('dwgSVG').innerHTML+=html;
            console.log("oval svg drawn: "+w+" x "+h+" at "+x0+","+y0);
            elID++;
            id('blueOval').setAttribute('rx',0);
            id('blueOval').setAttribute('ry',0);
            element=elementID=null;
            mode='select';
            break;
        case 'select':
        case 'edit':
            var el=event.target.id;
            console.log('select '+el+' at '+x0+','+y0);
            if(el=='dwgSVG') {
                var hit=null;
                var e=-5;
                var n=-5;
                while(e<6 && !hit) {
                    n=-5;
                    while(n<6 && !hit) {
                        var el=document.elementFromPoint(x0*3.78+e+drawingX*3.78,y0*3.78+n+drawingY*3.78).id;
                        // console.log(el+' at '+(Math.round(x0*3.78+e+drawingX*3.78))+','+Math.round(y0*3.78+n+drawingY*3.78));
                        if(el!='dwgSVG') hit=el; // hits.push(el); 
                        n++;
                    }
                    e++;
                }
            }
            console.log('hit: '+el);
            if(el.charAt(0)=='~') { // IDENTIFIES ELEMENTS - WAS if(el!='dwgSVG') {
                // IF BOX-SELECT ADD TO 'selections' ARRAY - LIST OF ELEMENT IDs
                // OTHERWISE (CLICK-SELECT) JUST SELECT AN ElEMENT IN snap RANGE
                var el=id(el);
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
                switch(type(el)) {
                    case 'line':
                        var bounds=el.getBBox();
                        w=bounds.width;
                        h=bounds.height;
                        var points=el.points;
                        var n=points.length;
                        console.log('bounds: '+w+'x'+h+'mm; '+n+' points');
                        setSizes(false); // size of bounding box
                        var html="<circle id='handle0' cx="+points[0].x+" cy="+points[0].y+" r='"+handleR+"' stroke='blue' fill='none'/>";
                        id('handles').innerHTML+=html; // start handle moves whole poly
                        for(var i=1;i<n;i++) {
                            html="<circle id='handle"+i+"' cx="+points[i].x+" cy="+points[i].y+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>";
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
                        var html="<circle id='handleNW' cx="+x+" cy="+y+" r='"+handleR+"' stroke='#0000FF88' fill='none'/>"
                        id('handles').innerHTML+=html; // hollow circle handle at top-left used to move whole box
                        html="<circle id='handleNE' cx="+(x+w)+" cy="+y+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // top-right disc handle adjusts box width
                        html="<circle id='handleSE' cx="+(x+w)+" cy="+(y+h)+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // bottom-right handle adjusts box size keeping aspect ratio
                        html="<circle id='handleSW' cx="+x+" cy="+(y+h)+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
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
                        var html="<circle id='handleCentre' cx="+x+" cy="+y+" r='"+handleR+"' stroke='#0000FF88' fill='none'/>"
                        id('handles').innerHTML+=html; // hollow circle handle at centre used to move whole box
                        html="<circle id='handleSize' cx="+(x+w/2)+" cy="+(y+h/2)+" r='"+handleR+"' stroke='none' fill='#0000FF88'/>"
                        id('handles').innerHTML+=html; // disc handle adjusts ellipse size
                        setSizes(false);
                        showInfo(true,(w==h)?'CIRCLE':'OVAL');
                        mode='edit';
                }
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
                console.log('set penWidth to current default: '+penW);
                id('penWidth').value=id('penSelect').value=penW;
                id('styles').style.borderWidth=penW+'mm 0 0 '+penW+'mm';;
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
    var val=id('first').value;
    console.log('element '+elementID+' value changed to '+val);
    element=id(elementID);
    switch(type(element)) {
        case 'line':
            console.log('element: '+element.id);
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
            element.setAttribute('width',val);
            break;
        case 'oval':
            element.setAttribute('rx',val/2);
    }
})
id('second').addEventListener('change',function() {
    var val=id('second').value;
    element=id(elementID);
    console.log('element '+element+' type: '+type(element)+' value changed to '+val);
    switch(type(element)) {
        case 'line':
            // adjust heights of all nodes?
            break;
        case 'box':
            // element=id(element.id); DONE EARLIER 
            console.log('box height is '+element.getAttribute('height'));
            console.log('set to '+val);
            element.setAttribute('height',val);
            // MOVE HANDLES
            break;
        case 'oval':
            console.log('change oval height');
            element.setAttribute('ry',val/2);
            // move size handle
    }
})

// UTILITY FUNCTIONS
function id(el) {
	return document.getElementById(el);
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
    if(el instanceof SVGLineElement) {
        return 'line';
    }
    else if(el instanceof SVGPolylineElement) {
        return 'polyline';
    }
    else if(el instanceof SVGRectElement) {
        return 'box';
    }
    else if(el instanceof SVGEllipseElement) {
        return 'oval';}
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
        id('between').innerHTML='mm';
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
        id('after').innerHTML='mm';
    }
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

/* start-up code
var request=window.indexedDB.open("ddDB");
request.onsuccess=function(event) {
    db=event.target.result;
    console.log("ddDB open");
    var dbTransaction=db.transaction('elements',"readwrite");
    console.log("indexedDB transaction ready");
    var dbObjectStore=dbTransaction.objectStore('elements');
    console.log("indexedDB objectStore ready");
    // code to read elements from database
    elements=[]; // NEEDED??
    nodes=[];
    console.log("elements and nodes arrays ready");
    var request=dbObjectStore.openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if (cursor) {
		    elements.push(cursor.value); // INSTEAD CREATE SVG ELEMENT THEN...
		    // GET NODES FROM EACH ELEMENT AND ADD TO NODES ARRAY UNLESS IN nts LAYER
	    	cursor.continue();  
        }
	    else {
		    console.log("No more entries!");
		    console.log(logs.length+" elements"); // OR NODES?
		    if(elements.length<1) { // no elements (NODES?) - offer to restore backup
		    alert('no elements');
		        // toggleDialog('importDialog',true);
		        return
		    }
		    // SORT NODES BY x AND y COORDINATES
		    /*
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
	    }
    };
};
request.onupgradeneeded=function(event) {
	var dbObjectStore=event.currentTarget.result.createObjectStore("elements", { keyPath: "id", autoIncrement: false });
	console.log("new elements ObjectStore created");
};
request.onerror=function(event) {
	alert("indexedDB error");
};
*/

// implement service worker if browser is PWA friendly
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
}
else { //Register the ServiceWorker
	navigator.serviceWorker.register('ddSW.js').then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}