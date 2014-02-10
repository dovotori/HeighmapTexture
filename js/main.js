

window.addEventListener("load", setup, false);



var conteneur = "carte";
var width = 520;
var height = 520;
var index;
var canvas;
var d2d;
var d3d;
var currentYear;
var langue;
var pathFrontieres;
var mode;
var loader;
var noWebgl;








function lireCsv(url, callback) {
	d3.csv(url, function(d){ callback(null, d); });
}
function lireJson(url, callback) {
	d3.json(url, function(d){ callback(null, d); });
}


function setup()
{

    currentYear = 0;
    langue = "FR";
    pathFrontieres = [];
    mode = "2d";
    noWebgl = false;
    
    loader = new Image();
    loader.addEventListener("load", function(){ document.getElementById("main").appendChild(this); }, false);
    loader.src= "data/loader.gif";
    loader.id = "loader";

    // gestion boutons 2D
    document.getElementById("btn_precedent").addEventListener("click", function(){ changementAnnee(1); }, false);
    document.getElementById("btn_suivant").addEventListener("click", function(){ changementAnnee(-1); }, false);
    
    document.getElementById("btn_2d").addEventListener("click", function(){ passage2d(); }, false);
    document.getElementById("btn_3d").addEventListener("click", function(){ passage3d(); }, false);
    
    document.getElementById("btn_in").addEventListener("click", function(){ zoom(1); }, false);
    document.getElementById("btn_out").addEventListener("click", function(){ zoom(-1); }, false);
    document.getElementById("btn_reset").addEventListener("click", function(){ reset(); }, false);
    


    d2d = new Dessin2D();
    d2d.setup();


	// si WegGL est supporté	
	var canvasTest = document.createElement( 'canvas' ); 
	if(window.WebGLRenderingContext && ( canvasTest.getContext( 'webgl' ) || canvasTest.getContext( 'experimental-webgl' )))
	{

        // 3D
        canvas = new Canvas();
        canvas.setup();

        document.getElementById('rotationX').addEventListener("change", function(event){ canvas.rotation(event); }, false);
        document.getElementById('rotationY').addEventListener("change", function(event){ canvas.rotation(event); }, false);

        d3d = new Dessin3D();
        d3d.setup();

        animate();

	} else {
		
		noWebgl = true;
		
	}


	
	
}






function animate()
{

    setTimeout(animate, 1000/50); 
    
    if(mode == "3d")
    {
       canvas.draw();
    }

}






//////////////////////////////////////////////////////////
////////////// PASSAGE MODE /////////////////////////////
////////////////////////////////////////////////////////

function passage2d()
{

	
    if(mode == "3d" || mode == "noWebgl")
    {
		loader.style.display = "block";
        
        if(!noWebgl){ canvas.initCam(); }
        setTimeout(function(){
        	mode = "2d";
		    onresize();
		    d2d.redrawSvg();
        	document.body.setAttribute("class", "mode2d");
        	loader.style.display = "none";
        }, 3000);
        

    }

}



function passage3d()
{

    if(mode == "2d")
    {
    	
    	if(!noWebgl)
    	{
	        loader.style.display = "block";
	
	        d2d.reset();
		
			setTimeout(function(){
				document.body.setAttribute("class", "mode3d");
				mode = "3d";
				d2d.redrawSvg();
				d2d.resize(520, 520, 80, 520/2, 520/2);
				d2d.createTextureFromSvg();
			}, 800);
			
	        canvas.onResize(window.innerWidth, window.innerWidth);
	       
    	} else {
    		
    		document.body.setAttribute("class", "noWebgl");
    		mode = "noWebgl";
    		
    	}
    }

}










//////////////////////////////////////////////////////////
////////////// DESSIN 2D ////////////////////////////////
////////////////////////////////////////////////////////

var Dessin2D = function()
{

    this.projection;
    this.svg;
    this.svgFond;
    this.path;
    this.scale;
    this.focusPosition;




    this.setup = function()
    {

        this.scale = 1;

        this.projection = d3.geo.mercator()
            .scale(80)
            .translate([width/2, height/2]);


        this.svg = d3.select("#"+conteneur).append("svg")
            .attr("id", "carte2d")
            .attr("width", width)
            .attr("height", height);


        this.svgFond = this.svg.append("svg:rect").attr("x", 0).attr("y", 0)
            .attr("width", width).attr("height", height)
            .style("fill", "rgba(0, 0, 0, 0)"); 

        this.path = d3.geo.path().projection(this.projection);

        this.focusPosition = [ width/2, height/2 ];

        // var graticule = d3.geo.graticule();
        // svg.append("path")
        //     .datum(graticule)
        //     .attr("class", "graticule")
        //     .attr("d", path)
        //     .style("stroke", "#fff")
        //     .style("stroke-width", ".1px");

        queue()
            .defer(lireJson, "data/world-countries-clean.json")
            .defer(lireCsv, "data/index.csv")
            .awaitAll(this.draw);
    }




    this.draw = function(error, results){

        index = results[1];
        var features = results[0].features;


        var frontieres = d2d.svg.append("svg:g")
            .selectAll("path")
            .data(features)
            .enter().append("svg:path")
            .attr("class", "land")
            .attr("id", function(d){ return d.id; })
            .attr("d", function(d){ return d2d.path(d); })
            .style("fill", "rgba(200, 200, 200, 1)")
            .style("stroke-width", "0.4")
            .each(function(d, i){

                // calcul des frontieres pour la 3d
                pathFrontieres[i] = getPath(d2d.path(d));

                for (var i = 0; i < index.length; i++) {

                    if(d.id == index[i].iso)
                    {

                        // Remplir la liste du classement
                        var pays = d3.select("#liste").append("li").attr("class", "itemPays")
                            .style("position", "absolute")
                            .attr("id", index[i].iso)
                            .on("click", function(){ clicPaysClassement(this.id); })
                            
                        pays.append("span").attr("class","position");
                        pays.append("span").attr("class","name");

                    }

                    
                }

            })
       
        changementAnnee(0);
		if(!noWebgl){ d3d.draw(canvas.scene); }
    	onresize();
    	loader.style.display = "none";

    }








    this.redrawSvg = function()
    {

        if(mode == "3d")
        {
            // fond de la carte svg noir
            this.svgFond.style("fill", "rgba(0,0,0,1)");
        } else {
            // fond de la carte svg transparent
            this.svgFond.style("fill", "rgba(0,0,0,0)");
        }


        for(var i = 0; i < index.length; i++)
        {

            var hauteur = getPositionCurrentYear(i);
            
            var pays = this.svg.select("#"+index[i].iso);
        
       		var rvb = this.couleurPays(hauteur);
        
       		pays.style("fill", "rgba("+rvb[0]+","+rvb[1]+","+rvb[2]+", 1)" );
        	pays.style( "stroke", "rgba("+rvb[0]+","+rvb[1]+","+rvb[2]+", 1)" );

        }

    }




	this.couleurPays = function(hauteur)
	{
		var hauteurMax = index.length;
		var red, green, blue;

        if(mode == "3d")
        {
            var gris = map(hauteur, hauteurMax, 0, 0, 255);
            gris = Math.floor(gris);
            red = green = blue = gris;
            return [red, green, blue]; 

        } else {

            if(hauteur < hauteurMax / 3){
                // de vert à jaune
                red = map(hauteur, 0, hauteurMax / 3, 0, 255);
                green = 255;
        
            } else if(hauteur < 2 * hauteurMax / 3) {
                // de jaune à orange
                red = 255;
                green = map(hauteur, hauteurMax / 3, 2 * hauteurMax / 3, 255, 127);

            } else if(hauteur <= hauteurMax){
                // de orange à rouge
                red = 255;
                green = map(hauteur, 2 * hauteurMax / 3, hauteurMax, 127, 0);

            }
            
            red = Math.floor(red);
            green = Math.floor(green);
            blue = 70;
            
            return [red, green, blue];
           
        }

	}



    this.createTextureFromSvg = function()
    {

        var svgImg = document.getElementById("carte2d");
 
        var xml = new XMLSerializer().serializeToString(svgImg);

        // var firstLine = xml.split('\n')[0];

        xml = xml.replace('<svg id="carte2d" width="520" height="520">','<svg xmlns="http://www.w3.org/2000/svg" id="carte2d" width="520" height="520">\n');

        var data = "data:image/svg+xml;base64," + btoa(xml);
        
        var imageTexture = new Image();
        var clone = this;
        imageTexture.addEventListener("load", clone.blurImage, false);
        imageTexture.src = data;

    }





    this.blurImage = function()
    {

        var canvas2d = document.createElement( "canvas" );
        var ctx = canvas2d.getContext('2d');

        canvas2d.width = width;
        canvas2d.height = height;
        canvas2d.id = "canvas2d";

        ctx.drawImage( this, 0, 0, canvas2d.width, canvas2d.height );

        // application du blur
        varBlur(ctx, function(x, y){ return 6.9; });
        document.getElementById(conteneur).appendChild(canvas2d);
        
        // creation de la texture THREE
        var textureCarted3js = new THREE.Texture( canvas2d );
        textureCarted3js.needsUpdate = true;
        
        d3d.updateTexture( textureCarted3js );


    }




    this.resize = function(newWidth, newHeight, scale, translateX, translateY)
    {

        this.projection
            .translate( [ translateX, translateY ] )
            .scale(scale);

        this.svg
            .attr("width", newWidth)
            .attr("height", newHeight);

        this.focusPosition = [ newWidth/2, newHeight/2 ];

        this.svg.selectAll("path").attr('d', this.path);

    }




    this.zoom = function(sens)
    {

        if(sens < 0)
        {
            if(this.scale > 1)
            {
                this.scale--;
            }
        } else {
            if(this.scale < 4)
            {
                this.scale++;
            }
        }

       this.scaling(); 

    }

	
	   this.scaling = function()
    {

        var w = parseInt(this.svg.attr("width"));
        var h = parseInt(this.svg.attr("height"));

        this.svg.selectAll("path").transition().duration(750)
            .attr("transform", "translate(" + w / 2 + ", " + h / 2 + ")scale("+this.scale+")translate(" + -this.focusPosition[0] + "," + -this.focusPosition[1] + ")");
         
           
    
    }



    this.moveToPosition = function(position)
    {

        this.focusPosition = position;
        this.scaling();

    }
    
    
    this.colorerPays = function(iso, position)
    {
		this.svg.selectAll(".land").transition().duration(400)
			.style("fill", "rgb(60, 90, 140)").style("stroke", "#fff");

            
        var pays = this.svg.select("#"+iso);
    
   		var rvb = this.couleurPays(position);
    
   		pays.transition().duration(400)
   			.style("fill", "rgba("+rvb[0]+","+rvb[1]+","+rvb[2]+", 1)" )
   			.style( "stroke", "rgba("+rvb[0]+","+rvb[1]+","+rvb[2]+", 1)" ); 

    }



 


    this.reset = function()
    {

		var w = parseInt(this.svg.attr("width"));
        var h = parseInt(this.svg.attr("height"));
        this.focusPosition = [ w/2, h/2 ];
        this.scale = 1;
        
        this.scaling();
        
        this.redrawSvg();

    }






}







//////////////////////////////////////////////////////////
////////////// DESSIN 3D ////////////////////////////////
////////////////////////////////////////////////////////


var Dessin3D = function()
{


    this.uniformsTerrain;


    this.setup = function()
    {
        this.uniformsTerrain = {

            lerp:  { type:'f', value: 0.0 },
            displacement: { type:'t', value: null }

        };

    }



    this.draw = function( scene )
    {

        this.displayBorders( scene ); 
        this.displayRelief( scene ); 
        //this.displayRepere( scene );

    }





    this.updateTexture = function( texture )
    {

        this.uniformsTerrain[ "displacement" ].value = texture;
        loader.style.display = "none";

    }



    this.displayBorders = function( scene )
    {


        var materialBorder = new THREE.LineBasicMaterial({ 
            color:0xffffff,
            opacity: 1,
            linewidth: 1
        });

        for(var k = 0; k < pathFrontieres.length; k++)
        {
            var coor = pathFrontieres[k];

            for(var i = 0; i < coor.length; i++)
            {
                var geometryBorder = new THREE.Geometry();

                for(var j = 0; j < coor[i].length; j+=2)
                {
                    var position = projectionfor3d([ coor[i][j], coor[i][j+1] ]);
                    geometryBorder.vertices.push(new THREE.Vector3(position[0], position[1], 0));
                }
                
                // dernier point pour fermer la forme
                var position = projectionfor3d([ coor[i][0], coor[i][1] ]);
                geometryBorder.vertices.push(new THREE.Vector3(position[0], position[1], 0));

                // ajout dans la scene
                var line = new THREE.Line(geometryBorder, materialBorder);
                line.position.set(0, 0, 20);       
                scene.add(line);

            }
        }
        pathFrontieres = null;


    }




    this.displayRelief = function( scene )
    {


        var n = 0;
        function loaded() {
            n++;
            console.log("loaded: " + n);

            if (n == 2) {
                terrain.visible = true;
            }
        }


        var fourchetteHauteur = 100;
        //this.uniformsTerrain[ "lerp" ].value = this.lerp;
 

		

        // MATERIAL
        var material = new THREE.ShaderMaterial({

            uniforms: this.uniformsTerrain,
            vertexShader: document.getElementById("vertexShader").textContent,
            fragmentShader: document.getElementById("fragmentShader").textContent,
            fog: false

        });
        

        var geometryTerrain = new THREE.PlaneGeometry(width, height, 256, 256 );
        //geometryTerrain.computeFaceNormals();
        //geometryTerrain.computeVertexNormals();
        //geometryTerrain.computeTangents();


        var terrain = new THREE.Mesh( geometryTerrain, material );
        terrain.position.set(0, 0, -fourchetteHauteur);
        scene.add(terrain);

        loaded();

		this.terrainShader = null;

    }





    this.displayRepere = function(scene)
    {

        var geometrie = new THREE.Geometry();
        geometrie.vertices.push(new THREE.Vector3(0, 0, 0));
        geometrie.vertices.push(new THREE.Vector3(100, 0, 0));
        var ligne = new THREE.Line(geometrie, new THREE.LineBasicMaterial({ color: 0xff0000 }));
        scene.add(ligne);

        geometrie = new THREE.Geometry();
        geometrie.vertices.push(new THREE.Vector3(0, 0, 0));
        geometrie.vertices.push(new THREE.Vector3(0, 100, 0));
        ligne = new THREE.Line(geometrie, new THREE.LineBasicMaterial({ color: 0x00ff00 }));
        scene.add(ligne);

        geometrie = new THREE.Geometry();
        geometrie.vertices.push(new THREE.Vector3(0, 0, 0));
        geometrie.vertices.push(new THREE.Vector3(0, 0, 100));
        ligne = new THREE.Line(geometrie, new THREE.LineBasicMaterial({ color: 0x0000ff }));
        scene.add(ligne);   

    }





}

























/////////////////////////////////////////////////////////////////////////////////
///////////// INTERACTION///// /////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function changementAnnee(sens)
{

    if(sens > 0 && currentYear < 1)
    {
        currentYear++;
    } else if(sens < 0 && currentYear >= 1){
        currentYear--;
    }


    var displayYear = document.getElementById("current_year");
    displayYear.innerHTML = 2013-currentYear;

    var already = [];
    var classement = d3.select("#liste");


    for(var i = 0; i < index.length; i++)
    {


        var espaceEntreDeux = 20;
        var top = 0;


		top = getPositionCurrentYear(i);
        var positionPays = top;



        var paysD3 = classement.select("#"+index[i].iso);
        var paysD3name = paysD3.select(".name");
        var paysD3position = paysD3.select(".position");


        // SI PAS DE NOTES
        if(!isNaN(positionPays))
        {

            // REGLER EGALITES
            for(var j = 0; j < already.length; j++)
            {
                if(top == already[j])
                {
                    top += 1;
                    positionPays = "&nbsp;";

                }

            }
            already.push(top);


            top *= espaceEntreDeux;

            var nomPays = "";
            if(langue == "FR"){ nomPays = index[i].nom; } else { nomPays = index[i].name; }
                


            paysD3.transition()
                .duration(700)
                .style("display", "inline")
                .style("top", top+"px");
            
            paysD3name.html(nomPays);
            paysD3position.html(positionPays);

        } else {
            paysD3.style("display", "none");
        }


    }

    d2d.redrawSvg();

    if(mode == "3d")
    {
        loader.style.display = "block";
        setTimeout( function(){ d2d.createTextureFromSvg(); }, 700 ); 
    }
    


}




function reset()
{

    if(mode == "3d")
    {

        canvas.initCam();

    } else {

        d2d.reset();

    }

}





function zoom(sens)
{

    if(mode == "3d")
    {

        canvas.zoom(sens);

    } else {

        d2d.zoom(sens);

    }

}


function rotation(range)
{

    canvas.rotation(range);

}





/////////////////////////////////////////////////////////////////////////////////
//////////////////// CLIC PAYS /////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function clicPaysClassement(isoPays)
{

        for(var i = 0; i < index.length; i++)
        {
            if(isoPays == index[i].iso)
            {
                
                if(mode == "3d")
                {
                    var positionPays = projectionfor3d(getGeoCoord(index[i].latitude, index[i].longitude));
                    canvas.moveCamToPosition(positionPays);
                } else {
                    //d2d.moveToPosition(getGeoCoord(index[i].latitude, index[i].longitude));
                    d2d.colorerPays(isoPays, getPositionCurrentYear(i));
                }
            }
        }
    

}












//////////////////////////////////////////////////////////
////////////// UTILS ////////////////////////////////////
////////////////////////////////////////////////////////



function getPositionCurrentYear(i)
{
	switch(currentYear)
    {
            case 0: return parseInt(index[i].an2013);  break;
            case 1: return parseInt(index[i].an2012);  break;
    }	
}



function getPath(path)
{

    var chaine = path.replace(/Z/g,""); 
    chaine = chaine.replace(/[L,]/g," ");
    var pathFragment = chaine.split("M");
    var coor = [];


    for(var i = 1; i < pathFragment.length; i++) // on commence a un car le split fait une premiere partie vide
    {
        var coordonnees = pathFragment[i].split(" ");
        coor[i-1] = [];

        for(var j = 0; j < coordonnees.length; j++) 
        {
            coor[i-1][j] = parseFloat(coordonnees[j]);
        }   
    }
    return coor;

}




function getGeoCoord(x, y)
{

    var latitude = x;
    var longitude = y;
    var traductionCoor = [ 0, 0 ];

    if(latitude != "#N/A" && longitude != "#N/A")
    {

        var lat = parseFloat(latitude.substring(0, latitude.length-1));
        var sens = latitude.substring(latitude.length-1, latitude.length);
        if(sens == "S"){ lat *= -1; }

        var long = parseFloat(longitude.substring(0, longitude.length-1));
        sens = longitude.substring(longitude.length-1, longitude.length);
        if(sens == "W"){ long *= -1; }

        coordonneesCapitale = [ long, lat ];
        var traductionCoor = d2d.projection(coordonneesCapitale);        

    }

    return traductionCoor;

}



function projectionfor3d(array)
{

    array[0] = array[0]-width/2;
    array[1] = (array[1]-height/2)*(-1);
    return array;

}











////////////////////////////////////////////////////////////////////////////////////////
//////////// CANVAS ///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////

var Canvas = function()
{

    this.canvas;
    this.renderer;
    this.scene;
    this.centreCarte;

    this.xSouris, this.xSourisOld;
    this.ySouris, this.ySourisOld;
    this.mouseDown;
    this.scrollSouris; 

    this.camera;
    this.angleCamera;
    this.rayonCamera;
    this.positionInitCam;
    this.focusCamera;
    this.transitionCamera;
    this.transitionFocusCamera;


    //this.background;
    //this.backgroundScene;
    //this.backgroundCam;



    this.setup = function()
    {


        var VIEW_ANGLE = 45,
            ASPECT = width / height,
            NEAR = 0.1,
            FAR = 10000;          


        this.mouseDown = false;
        this.scrollSouris = false;
        this.xSouris = 0; this.xSourisOld = 0;
        this.ySouris = 0; this.ySourisOld = 0;


        // SCENE
        this.scene = new THREE.Scene();
        //this.scene.fog = new THREE.Fog( 0x000000, 1, FAR/8 );


        // CAMERA
        this.transitionCamera = new Transition();
        this.transitionFocusCamera = new Transition();
        this.isZoom = false;
        this.angleCamera = [];
        this.angleCamera[0] = 0;
        this.angleCamera[1] = 0;
        this.positionInitCam = [0, 0, 1000];
        this.focusCamera = [ 0,0,0 ];
        this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
        this.camera.up = new THREE.Vector3( 0, 1, 0 );

        this.rayonCamera = this.positionInitCam[2];

        //this.camera.position.set( this.positionInitCam[0], this.positionInitCam[1], this.positionInitCam[2] );
        this.camera.position.x = this.rayonCamera * Math.sin( this.angleCamera[1] * Math.PI / 360 ) * Math.cos( this.angleCamera[0] * Math.PI / 360 );
        this.camera.position.y = this.rayonCamera * Math.sin( this.angleCamera[0] * Math.PI / 360 );
        this.camera.position.z = this.rayonCamera * Math.cos( this.angleCamera[1] * Math.PI / 360 ) * Math.cos( this.angleCamera[0] * Math.PI / 360 );
        this.camera.lookAt(new THREE.Vector3( this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ));
        this.scene.add(this.camera);


        // RENDERER
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, 4 * window.innerWidth / 6);
        this.renderer.setClearColor("rgb(20, 50, 100)", 1);



        // RENDU
        this.canvas = this.renderer.domElement;
        this.canvas.id = "carte3d";
        document.getElementById(conteneur).appendChild(this.canvas);   



        // INTERACTION
        var clone = this;
        this.canvas.addEventListener("mousemove", function(event){ clone.onMouseMove(event); }, false);
        this.canvas.addEventListener("mousedown", function(event){ clone.onMouseDown(event); }, false);
        this.canvas.addEventListener("mouseup", function(event){ clone.onMouseUp(event); }, false);
        this.canvas.addEventListener("mouseout", function(event){ clone.onMouseUp(event); }, false); // releve le clic si tu sort du canvas


        // BACKGROUND
        this.setupBackground();


    }
    
    

    this.draw = function()
    {
  
        // transition pour la position de la camera
        if(!this.transitionCamera.isFinished)
        {
            var currentPos = this.transitionCamera.execute3d();
            this.camera.position.set(currentPos[0], currentPos[1], currentPos[2]);
        } 

        // transition pour le focus de la camera
        if(!this.transitionFocusCamera.isFinished)
        {
            var currentPos = this.transitionFocusCamera.execute3d();
            this.focusCamera[0] = currentPos[0];
            this.focusCamera[1] = currentPos[1];
            this.focusCamera[2] = currentPos[2];
            this.camera.lookAt(new THREE.Vector3(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2]));
        } else {
            this.camera.lookAt(new THREE.Vector3(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2]));
        }

        this.drawBackground();

        // rendu
        this.renderer.render(this.scene, this.camera);

        
    }
    

    
    this.onMouseMove = function(event)
    {
        
        if(this.mouseDown)
        {

            this.xSouris = event.clientX;
            this.ySouris = event.clientY;

            this.positionCamera();

            this.xSourisOld = this.xSouris;
            this.ySourisOld = this.ySouris;

            this.scrollSouris = true;

        }
        return false;

    }





    this.onMouseDown = function(event)
    {

        this.mouseDown = true;
        this.xSouris = event.clientX;
        this.xSourisOld = this.xSouris;
        this.ySouris = event.clientY;
        this.ySourisOld = this.ySouris;

    }



    this.onMouseUp = function(event)
    {
        
        this.mouseDown = false;

    }




    this.resetCam = function()
    {

        this.angleCamera[0] = 0;
        this.angleCamera[1] = 0;
        
        document.getElementById('rotationX').setAttribute("value", 0);
        document.getElementById('rotationY').setAttribute("value", 0);

        this.camera.position.set(this.positionInitCam[0], this.positionInitCam[1], this.positionInitCam[2]);
        this.camera.lookAt(this.positionInitCam[0], this.positionInitCam[1], 0);

    }




    this.initCam = function()
    {

        this.angleCamera[0] = 0;
        this.angleCamera[1] = 0;
        this.rayonCamera = this.positionInitCam[2];

        this.transitionCamera.setup(
            [ this.camera.position.x, this.camera.position.y, this.camera.position.z ], 
            [ this.positionInitCam[0], this.positionInitCam[1], this.rayonCamera ] );
        
        this.transitionFocusCamera.setup(
            [ this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ],
            [ this.positionInitCam[0], this.positionInitCam[1], 0 ] );
            
        document.getElementById('rotationX').setAttribute("value", 0);
        document.getElementById('rotationY').setAttribute("value", 0);

    }



    this.positionCamera = function()
    {
        
        // ANGLES
        var decalageX = (this.xSouris - this.xSourisOld) * 0.1;
        var decalageY = (this.ySouris - this.ySourisOld) * 0.1;


        this.camera.position.x -= decalageX;
        this.focusCamera[0] -= decalageX;
        this.camera.position.y += decalageY;
        this.focusCamera[1] += decalageY;
        this.camera.lookAt(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2]);
  

    }




    this.rotation = function(event)
    {

		console.log(event);

        if(event.target.id == "rotationX")
        {
            this.angleCamera[0] = event.target.value;
        } else {
            this.angleCamera[1] = event.target.value;
        }


        // CONDITIONS ANGLES
        var x = this.rayonCamera * Math.sin( this.angleCamera[0] * Math.PI / 360 ) * Math.cos( this.angleCamera[1] * Math.PI / 360 );
        var y = this.rayonCamera * Math.sin( this.angleCamera[1] * Math.PI / 360 );
        var z = this.rayonCamera * Math.cos( this.angleCamera[0] * Math.PI / 360 ) * Math.cos( this.angleCamera[1] * Math.PI / 360 );


        this.transitionCamera.setup(
                [ this.camera.position.x, this.camera.position.y, this.camera.position.z ], 
                [ x, y, z ] );

    }




    this.moveCamToPosition = function(position)
    {

        // this.transitionCamera.setup(
        //     [ this.camera.position.x, this.camera.position.y, this.camera.position.z ], 
        //     [ position[0], position[1], this.rayonCamera ] );
        
        this.transitionFocusCamera.setup(
            [ this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ],
            [ position[0], position[1], 0 ] );

        this.isZoom = true;

    }



    this.zoom = function(sens)
    {
        var distance = 300;
        if(sens > 0)
        {
            if(this.rayonCamera > 200.0)
            {
                this.rayonCamera -= distance;
            }
        } else {
            if(this.rayonCamera < 900.0)
            {
                this.rayonCamera += distance;
            }
        }

        this.transitionCamera.setup(
            [ this.camera.position.x, this.camera.position.y, this.camera.position.z], 
            [ this.camera.position.x, this.camera.position.y, this.rayonCamera ] );

    }



    this.onResize = function(newWidth, newHeight)
    {

        this.renderer.setSize(newWidth, newHeight);
    
    }






    this.setupBackground = function()
    {


        var shaderMaterial = new THREE.ShaderMaterial({
            vertexShader:   document.getElementById("background_vertexshader").textContent,
            fragmentShader: document.getElementById("background_fragmentshader").textContent
        });

        this.background = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, 0),
            shaderMaterial
        );

        this.background.material.depthTest = false;
        this.background.material.depthWrite = false;

        this.backgroundScene = new THREE.Scene();
        this.backgroundCam = new THREE.Camera();
        this.backgroundScene.add(this.backgroundCam);
        this.backgroundScene.add(this.background);

    }




    this.drawBackground = function()
    { 

        this.renderer.autoClear = false;
        this.renderer.clear();
        this.renderer.render(this.backgroundScene, this.backgroundCam);

    }



}









/////////////////////////////////////////////////////////////////////////////////
/////////////////////// RESIZE /////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


window.addEventListener("resize", onresize, false);

function onresize()
{

    var newWidth = window.innerWidth;
    var newHeight = window.innerHeight;

    if(mode == "3d")
    {

        canvas.onResize(newWidth, newWidth);

    } else {

        d2d.resize(newWidth, newWidth, newWidth/10, newWidth/2, newWidth/2);     

    }

}

















