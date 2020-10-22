
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
var polyline=false;
var square=false;
var element=null; // current element
var penW=0.25; // 0.25mm at 1:1 scale - increase for smaller scales (eg.12.5 at 1:50 scale)
var nodeR=2; // 2mm node radius at 1:1 scale - increase for smaller scales (eg. 100 at 1:50)
var snap=5; // 5mm snap distance at 1:1 scale - increase for smaller scales (eg. 250 at 1:50)
/*
var badge={};
var border={};
var band={};
var division={};
var symbol={};
var pattern=false;
var mid=250;
var shape='square';
var element='badge';
var currentDialog=null;
*/


var sw=screen.width;
var sh=screen.height;
console.log("screen size "+sw+"x"+sh);

// DRAW TOOLS
// file
id('fileButton').addEventListener('click',function() { // SHOULD SHOW FILE MENU BUT FOR NOW...
    /*
    report("show aspect dialog");
    showDialog('aspect',true);
    */
    saveSVG();
})
// line/polyline
id('lineButton').addEventListener('touchstart',function() {
    event.preventDefault();
    x=x0=event.touches[0].clientX;
    if(!timer) timer=window.setTimeout(showLineDialog,2000);
})
id('lineButton').addEventListener('touchmove',function() {
    x=event.touches[0].clientX;
})
id('lineButton').addEventListener('touchend',function() {
    if(Math.abs(x-x0)>20) {
        id('lineButton').style.background=(polyline)?'url(svg/line.svg)':'url(svg/polyline.svg)';
        polyline=!polyline;
        console.log('polyline mode is '+polyline);
    }
    else {
        mode=(polyline)?'polyline':'line';
        console.log('click lineButton - mode is '+mode);
        if(mode=='polyline') {
            console.log('begin/end polyline');
            if(id('bluePolyline').points.length>1) { // terminating polyline
                console.log('end polyline');
                id('bluePolyline').setAttribute('stroke','black');
                id('bluePolyline').setAttribute('stroke-width',penW);
                id('bluePolyline').setAttribute('id','~'+elID);
                elID++;
                var el="<polyline id='bluePolyline' points='0,0' stroke='blue' fill='none'/>";
                id('dwgSVG').innerHTML+=el;
                showInfo(false);
                mode='select'
            }
            else {
                showInfo(true,'POLYLINE: press at start');
            }
        }
        else { // start drawing line
            showInfo(true,'LINE: press at start');
        }
    }
    if(timer) {
        window.clearTimeout(timer);
        timer=null;
    }
})
function showLineDialog() { // CODE THIS
    alert('open line dialog');
}
// box/square
id('boxButton').addEventListener('touchstart',function() {
    event.preventDefault();
    x=x0=event.touches[0].clientX;
    if(!timer) timer=window.setTimeout(showBoxDialog,2000);
})
id('boxButton').addEventListener('touchmove',function() {
    x=event.touches[0].clientX;
})
id('boxButton').addEventListener('touchend',function() {
    if(Math.abs(x-x0)>20) {
        id('boxButton').style.background=(square)?'url(svg/box.svg)':'url(svg/square.svg)';
        square=!square;
        console.log('square mode is '+square);
    }
    else {
        mode='box';
        report('draw box');
        showInfo(true,(square)?'SQUARE':'BOX'+': press at start');
    }
    if(timer) {
        window.clearTimeout(timer);
        timer=null;
    }
})
// SET DRAWING ASPECT
aspect=window.localStorage.getItem('aspect');
if(!aspect) showDialog('aspect',true);
else console.log('aspect is '+aspect);
id('landscapeButton').addEventListener('click',function() {
    aspect='landscape';
    window.localStorage.setItem('aspect','landscape');
    showDialog('aspect',false);
})
id('portraitButton').addEventListener('click',function() {
    aspect='portrait';
    window.localStorage.setItem('aspect','portrait');
    showDialog('aspect',false);
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
// id('graphic').style.width=w*zoom+'px';
// id('graphic').style.height=h*zoom+'px';
// drawingX=(sw-w*zoom)/2;
// drawingY =(sh-h*zoom)/2;
// drawingX/=3.78; // convert to mm
// drawingY/=3.78;
// id('graphic').style.left=drawingX+'mm';
// id('graphic').style.top=drawingY+'mm';

id('graphic').addEventListener('touchstart',function() {
    event.preventDefault();
    console.log('touch at '+event.touches[0].clientX/3.78+','+event.touches[0].clientY/3.78);
    console.log('drawing at '+drawingX+','+drawingY);
    x=x0=Math.round(event.touches[0].clientX/3.78-drawingX);
    y=y0=Math.round(event.touches[0].clientY/3.78-drawingY);
    switch(mode) {
        case 'line':
            console.log('line starts at '+x+','+y);
            id('blueLine').setAttribute('x1',x0);
            id('blueLine').setAttribute('y1',y0);
            id('blueLine').setAttribute('x2',x);
            id('blueLine').setAttribute('y2',y);
            showInfo(true,'LINE: drag to end-point');
            break;
        case 'polyline':
            element=id('bluePolyline');
            var point=id('dwgSVG').createSVGPoint();
                point.x=x;
                point.y=y;
            if(id('bluePolyline').points.length<2) { // start polyline - create first (null-length) segment
                id('bluePolyline').points[0]=point;
            }
            id('bluePolyline').points.appendItem(point); // create null-length segment
            console.log(id('bluePolyline').points.length+' points');
            showInfo(true,'POLYLINE: drag to next point; click polyline button to end');
            break;
        case 'box':
        // case 'select':
            console.log('box starts at '+x0+','+y0);
            id('blueBox').setAttribute('x',x0);
            id('blueBox').setAttribute('y',y0);
            console.log('sizing box initiated');
            showInfo(true,(square)?'SQUARE':'BOX'+': drag to size');
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

id('graphic').addEventListener('touchmove',function() {
    event.preventDefault();
    x=Math.round(event.touches[0].clientX/3.78);
    y=Math.round(event.touches[0].clientY/3.78);
    switch(mode) {
        case 'line':
            if(Math.abs(x-x0)<snap) x=x0;
            if(Math.abs(y-y0)<snap) y=y0;
            id('blueLine').setAttribute('x2',x);
            id('blueLine').setAttribute('y2',y);
            setSizes(true);
            break;
        case 'polyline':
            if(Math.abs(x-x0)<snap) x=x0;
            if(Math.abs(y-y0)<snap) y=y0;
            var n=element.points.length;
            var point=element.points[n-1];
            // var point=id('dwgSVG').createSVGPoint();
            point.x=x;
            point.y=y;
            // var pts=id('bluePolyline').points.length;
            element.points[n-1]=point;
            // id('bluePolyline').points[pts-1]=point;
            setSizes(true);
            break;
        case 'box':
        // case 'select':
            var boxX=(x<x0)?x:x0;
            var boxY=(y<y0)?y:y0;
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            if(square) {
                console.log('square');
                if(w>h) h=w;
                else w=h;
            }
            id('blueBox').setAttribute('x',boxX);
            id('blueBox').setAttribute('y',boxY);
            id('blueBox').setAttribute('width',w);
            id('blueBox').setAttribute('height',h);
            setSizes(false);
            break;
    }
    event.stopPropagation();
})

id('graphic').addEventListener('touchend',function() {
    switch(mode) {
        case 'line':
            var html="<line id='~"+elID+"' x1="+x0+" y1="+y0+" x2="+x+" y2="+y+" stroke='black' stroke-width='"+penW+"'/>";
            id('dwgSVG').innerHTML+=html;
            element=id('~'+elID);
            console.log('line drawn');
            elID++;
            id('blueLine').setAttribute('x1',x);
            id('blueLine').setAttribute('y1',y);
            id('blueLine').setAttribute('x2',x);
            id('blueLine').setAttribute('y2',y);
            // showInfo(false);
            mode='select';
            break;
        case 'polyline':
            x0=x; // set up for subsequent segments
            y0=y;
            break;
        case 'box':
            var el="<rect id='~"+elID+"' x='"+((x<x0)?x:x0)+"' y='"+((y<y0)?y:y0)+"' width='"+w+"' height='"+h+"' stroke='black' stroke-width='"+penW+"' fill='none'/>";
            elID++;
            console.log('box svg: '+el);
            id('dwgSVG').innerHTML+=el;
	        console.log("box svg drawn: "+x0+','+y0+' to '+(x0+w)+','+(y0+h));
	        id('blueBox').setAttribute('width',0);
            id('blueBox').setAttribute('height',0);
            // showInfo(false);
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
            if(el!='dwgSVG') {
                // ADD TO 'selections' ARRAY - LIST OF ELEMENT IDs
                var el=id(el);
                // el.setAttribute('stroke','red');
                switch(type(el)) {
                    case 'line':
                        x0=el.getAttribute('x1');
                        y0=el.getAttribute('y1');
                        x=el.getAttribute('x2');
                        y=el.getAttribute('y2');
                        /* long-winded approach...
                        var node=document.createElementNS("http://www.w3.org/2000/svg",'circle');
                        node.setAttribute('id','nodeStart');
                        node.setAttribute('cx',x0);
                        node.setAttribute('cy',y0);
                        node.setAttribute('r',2);
                        node.setAttribute('stroke','blue');
                        node.setAttribute('fill','none');
                        id('dwgSVG').appendChild(node)
                        */ // quick and dirty...
                        var html="<circle id='nodeStart' cx="+x0+" cy="+y0+" r='"+nodeR+"' stroke='none' fill='#0000FF88'/>";
                        id('dwgSVG').innerHTML+=html; // can move either end of line
                        html="<circle id='nodeEnd' cx="+x+" cy="+y+" r='"+nodeR+"' stroke='none' fill='#0000FF88'/>";
                        id('dwgSVG').innerHTML+=html;
                        /* no line midpoint
                        x=Math.round((parseFloat(x0)+parseFloat(x))/2);
                        y=Math.round((parseFloat(y0)+parseFloat(y))/2);
                        console.log('midpoint: '+x+','+y);
                        html="<circle id='nodeMid' cx="+x+" cy="+y+" r='2' stroke='blue' fill='none'/>"
                        id('dwgSVG').innerHTML+=html;
                        */
                        setSizes(true);
                        showInfo(true,'LINE');
                        mode='edit';
                        element=el;
                        break;
                    case 'polyline':
                        var bounds=el.getBBox(); // NO -  DRAW CIRCLE AT START AND DISCS AT FOLLOWING NODES
                        console.log('bounds: '+bounds.x+','+bounds.y+' '+bounds.width+'x'+bounds.height);
                        w=bounds.width;
                        h=bounds.height;
                        setSizes(false);
                        showInfo(true,'POLYLINE');
                        element=el;
                        mode='edit';
                        break;
                    case 'box':
                        console.log('box '+el.id+': '+el.getAttribute('x')+','+el.getAttribute('y')+' '+el.getAttribute('width')+'x'+el.getAttribute('height'));
                        x=parseFloat(el.getAttribute('x'));
                        y=parseFloat(el.getAttribute('y'));
                        w=parseFloat(el.getAttribute('width'));
                        h=parseFloat(el.getAttribute('height'));
                        element=el;
                        var html="<circle id='nodeNW' cx="+x+" cy="+y+" r='"+nodeR+"' stroke='#0000FF88' fill='none'/>"
                        id('dwgSVG').innerHTML+=html; // hollow circle at top-left used to move whole box
                        html="<circle id='nodeNE' cx="+(x+w)+" cy="+y+" r='"+nodeR+"' stroke='none' fill='#0000FF88'/>"
                        id('dwgSVG').innerHTML+=html; // top-right node adjusts box width
                        html="<circle id='nodeSE' cx="+(x+w)+" cy="+(y+h)+" r='"+nodeR+"' stroke='none' fill='#0000FF88'/>"
                        id('dwgSVG').innerHTML+=html; // bottom-right node adjusts box size keeping aspect ratio
                        html="<circle id='nodeSW' cx="+x+" cy="+(y+h)+" r='"+nodeR+"' stroke='none' fill='#0000FF88'/>"
                        id('dwgSVG').innerHTML+=html; // bottom-left node adjusts box height
                        // ADD N, E, S, W & MID NODES
                        setSizes(false);
                        showInfo(true,'BOX'); // OR SQUARE?
                        mode='edit';
                        break;
                }
            }
            else {
                mode='select';
                selection=[];
                // ADD TRY..CATCH...
                try{id('dwgSVG').removeChild(id('nodeStart'))} catch(err) {}
                try{id('dwgSVG').removeChild(id('nodeEnd'))} catch(err) {}
                try{id('dwgSVG').removeChild(id('nodeMid'))} catch(err) {}
                try{id('dwgSVG').removeChild(id('nodeNW'))} catch(err) {}
                try{id('dwgSVG').removeChild(id('nodeNE'))} catch(err) {}
                try{id('dwgSVG').removeChild(id('nodeSE'))} catch(err) {}
                try{id('dwgSVG').removeChild(id('nodeSW'))} catch(err) {}
                showInfo(false);
            }
            // if SHIFT add to selection otherwise deselect currently selected elements and select this
            event.stopPropagation();
    }
    event.stopPropagation();
})
// ADJUST ELEMENT SIZES
id('first').addEventListener('change',function() {
    var val=id('first').value;
    console.log('element '+element.id+' value changed to '+val);
    element=id(element.id); // weird fix!
    switch(type(element)) {
        case 'line':
            x0=element.getAttribute('x1');
            y0=element.getAttribute('y1');
            x=element.getAttribute('x2');
            y=element.getAttribute('y2');
            // console.log('line from '+x0+','+y0+' to '+x+','+y);
            w=x-x0;
            h=y-y0;
            var len=Math.sqrt(w*w+h*h);
            var r=val/len;
            w*=r;
            h*=r;
            x=parseFloat(x0)+parseFloat(w);
            y=parseFloat(y0)+parseFloat(h);
            element.setAttribute('x2',x);
            element.setAttribute('y2',y);
            console.log('mode: '+mode);
            if(mode=='edit') {
                id('nodeEnd').setAttribute('cx',x);
                id('nodeEnd').setAttribute('cy',y);
            }
            break;
        case 'polyline':
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
    }
})
id('second').addEventListener('change',function() {
    var val=id('second').value;
    console.log('element '+element+' type: '+type(element)+' value changed to '+val);
    switch(type(element)) {
        case 'line':
            // adjust line angle by adjusting x2 and y2
            break;
        case 'polyline':
            break;
        case 'box':
            element=id(element.id);
            console.log('box height is '+element.getAttribute('height'));
            console.log('set to '+val);
            element.setAttribute('height',val);
            // id('nodeSE').setAttribute('cy',val);
            // id('nodeSW').setAttribute('cy',val);
            break;
    }
})

// UTILITY FUNCTIONS
function id(el) {
	return document.getElementById(el);
}
function showDialog(dialog,visible) {
    id(dialog).style.display=(visible)?'block':'none';
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
	navigator.serviceWorker.register('sw.js').then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}