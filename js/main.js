

window.addEventListener("load", setup, false);



var width = 520;
var height = 520;
var conteneur = "carte";

var projection = d3.geo.mercator()
    .scale(80)
    .translate([width/2, height/2]);


var svg = d3.select("#"+conteneur).append("svg")
	.attr("id", "carteSvg")
	.attr("width", width)
	.attr("height", height);

var path = d3.geo.path().projection(projection);  

var graticule = d3.geo.graticule();

// svg.append("path")
//     .datum(graticule)
//     .attr("class", "graticule")
//     .attr("d", path)
//     .style("stroke", "#fff")
//     .style("stroke-width", ".1px");

var svgFond = svg.append("svg:rect").attr("x", 0).attr("y", 0)
	.attr("width", width).attr("height", height)
	.style("fill", "rgba(0, 0, 0, 0)"); 

var index;
var canvas;
var d2d;
var d3d;
var currentYear;
var langue;
var pathFrontieres;
var mode;










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


    // gestion boutons 2D
    document.getElementById("btn_precedent").addEventListener("click", function(){ changementAnnee(1); }, false);
    document.getElementById("btn_suivant").addEventListener("click", function(){ changementAnnee(-1); }, false);
    document.getElementById("btn_2d").addEventListener("click", passage2d, false);


    d2d = new Dessin2D();
    d2d.setup();


	// si WegGL est supporté
	if(window.WebGLRenderingContext)
	{

        // 3D
		document.getElementById("btn_3d").addEventListener("click", function(){ passage3d(); }, false);
        canvas = new Canvas();
        canvas.setup(width, height);

        d3d = new Dessin3D();
        d3d.setup();

        animate();

	} else {
		alert("WebGL not supported, 3d mode not supported");
	}


	
	
}






function animate()
{
    requestAnimationFrame(animate); 
    
    if(mode == "3d")
    {
       canvas.draw();
       d3d.update();
    }

}








//////////////////////////////////////////////////////////
////////////// DESSIN 2D ////////////////////////////////
////////////////////////////////////////////////////////

var Dessin2D = function()
{



    this.setup = function()
    {

        queue()
            .defer(lireJson, "data/world-countries-clean.json")
            .defer(lireCsv, "data/index.csv")
            .awaitAll(this.draw);
    }




    this.draw = function(error, results){

        index = results[1];
        var features = results[0].features;

        var frontieres = svg.append("svg:g")
            .selectAll("path")
            .data(features)
            .enter().append("svg:path")
            .attr("id", function(d){ return d.id; })
            .attr("d", function(d){ return path(d); })
            .style("fill", "rgba(200, 200, 200, 1)")
            .each(function(d, i){

                // calcul des frontieres pour la 3d
                pathFrontieres[i] = getPath(path(d));

                for (var i = 0; i < index.length; i++) {

                    if(d.id == index[i].iso)
                    {

                        // Remplir la liste du classement
                        d3.select("#classement").append("li").attr("class", "itemPays")
                            .style("position", "absolute")
                            .attr("id", index[i].iso)
                            .on("click", function(){ clicPaysClassement(this.id); });

                    }
                }

            })
       
        changementAnnee(0);
        d2d.setup3d();

    }



    this.setup3d = function()
    {

        d3d.draw(canvas.scene);
        onresize();

    }



    this.redrawSvg = function()
    {
        
        for(var i = 0; i < index.length; i++)
        {
            var pays = svg.select("#"+index[i].iso);

            var hauteur = 0;
            switch(currentYear)
            {
                case 0: hauteur = index[i].an2013;  break;
                case 1: hauteur = index[i].an2012;  break;
            }

            var hauteurMax = index.length;
            var red, green, blue;

            if(mode == "3d")
            {
                var gris = map(hauteur, hauteurMax, 0, 0, 255);
                gris = Math.floor(gris);
                red = green = blue = gris; 

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

            }

            pays.style("fill", "rgba("+red+","+green+","+blue+", 1)" );
            pays.style( "stroke", "rgba("+red+","+green+","+blue+", 1)" );

        }

    }





    this.createTextureFromSvg = function()
    {

        var svgImg = document.getElementById("carteSvg");

        // transforme le svg en image
        var xml = new XMLSerializer().serializeToString(svgImg);
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
        //document.getElementById(conteneur).appendChild(canvas2d);
        
        // creation de la texture THREE
        var textureCarted3js = new THREE.Texture( canvas2d );
        textureCarted3js.needsUpdate = true;
        
        d3d.updateTexture( textureCarted3js );

    }




    this.resize = function(newWidth, newHeight, scale)
    {

        projection
            .translate( [ newWidth/2, newHeight/2 ] )
            .scale(scale);

        svg
            .attr("width", newWidth)
            .attr("height", newHeight);

        svg.selectAll("path").attr('d', path);

    }


}







//////////////////////////////////////////////////////////
////////////// DESSIN 3D ////////////////////////////////
////////////////////////////////////////////////////////


var Dessin3D = function()
{


    this.uniformsTerrain;
    this.lerp;
    this.newTexture;
    this.oldTexture;



    this.setup = function()
    {
        this.lerp = 0.0;
    }



    this.draw = function( scene )
    {

        this.displayBorders( scene ); 
        this.displayRelief( scene ); 
        //this.displayRepere( scene );

    }



    this.update = function()
    {
        if(this.lerp < 1.0)
        {
            this.uniformsTerrain[ "animLerp" ].value = this.lerp;
            this.lerp += 0.02;
        }
    }



    this.updateTexture = function( texture )
    {

        this.lerp = 0.0;
        this.oldTexture = this.newTexture;
        this.newTexture = texture;
        this.uniformsTerrain[ "tDisplacement" ].value = this.newTexture;
        document.getElementById("loader").style.display = "none";

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

        // TEXTURE EFFECT
        var detailTexture = THREE.ImageUtils.loadTexture("data/textureLisse.jpg", null, loaded);

        // SQUARE TEXTURE
        var wireTexture = new THREE.ImageUtils.loadTexture( 'data/square.png' );
        wireTexture.wrapS = wireTexture.wrapT = THREE.RepeatWrapping; 
        wireTexture.repeat.set( 40, 40 );

        var terrainShader = THREE.ShaderTerrain[ "terrain" ];

        this.uniformsTerrain = THREE.UniformsUtils.clone(terrainShader.uniforms);

        this.uniformsTerrain[ "animLerp" ].value = this.lerp;                         // animation lerp
        this.uniformsTerrain[ "textureSquare" ].value = wireTexture;            // texture pour le cadrillage
        this.uniformsTerrain[ "uDisplacementScale" ].value = fourchetteHauteur; // hauteur max
        this.uniformsTerrain[ "tNormal" ].value = detailTexture;
        this.uniformsTerrain[ "tDiffuse1" ].value = detailTexture;
        this.uniformsTerrain[ "tDetail" ].value = detailTexture;
        this.uniformsTerrain[ "uNormalScale" ].value = 1;
        this.uniformsTerrain[ "enableDiffuse1" ].value = true;
        this.uniformsTerrain[ "enableDiffuse2" ].value = true;
        this.uniformsTerrain[ "enableSpecular" ].value = true;
        this.uniformsTerrain[ "uDiffuseColor" ].value.setHex(0x888888);         // diffuse
        this.uniformsTerrain[ "uSpecularColor" ].value.setHex(0xffffff);        // spec // pas de repercution
        this.uniformsTerrain[ "uAmbientColor" ].value.setHex(0x888888);         // ambiant
        this.uniformsTerrain[ "uShininess" ].value = 3;                         // shininess
        this.uniformsTerrain[ "uRepeatOverlay" ].value.set(3, 3);               // light reflection



        // MATERIAL
        var material = new THREE.ShaderMaterial({

            uniforms: this.uniformsTerrain,
            vertexShader: terrainShader.vertexShader,
            fragmentShader: terrainShader.fragmentShader,
            lights: true,
            fog: false,
            side: THREE.DoubleSide

        });
        

        var geometryTerrain = new THREE.PlaneGeometry(width, height, 128, 128 );
        //geometryTerrain.computeFaceNormals();
        geometryTerrain.computeVertexNormals();
        geometryTerrain.computeTangents();


        var terrain = new THREE.Mesh( geometryTerrain, material );
        terrain.position.set(0, 0, -fourchetteHauteur);
        scene.add(terrain);

        loaded();


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



















//////////////////////////////////////////////////////////
////////////// PASSAGE MODE /////////////////////////////
////////////////////////////////////////////////////////

function passage2d()
{

    document.body.setAttribute("class", "mode2d");

    if(mode == "3d")
    {
        mode = "2d";
        onresize();

        // fond de la carte svg transparent
        svgFond.style("fill", "rgba(0,0,0,0)");
        
        d2d.redrawSvg();

    }

}



function passage3d()
{

    document.body.setAttribute("class", "mode3d");


    if(mode == "2d")
    {

        mode = "3d"; 
        d2d.resize(520, 520, 80);

        document.getElementById("loader").style.display = "block";    

        // fond de la carte svg noir
        svgFond.style("fill", "rgba(0,0,0,1)");

        d2d.redrawSvg();
        d2d.createTextureFromSvg();
        
    }

}










/////////////////////////////////////////////////////////////////////////////////
///////////// CHANGEMENT ANNEE /////////////////////////////////////////////////
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
    var classement = d3.select("#classement");


    for(var i = 0; i < index.length; i++)
    {

        var espaceEntreDeux = 20;
        var top = 0;
        switch(currentYear)
        {
            case 0: top = parseInt(index[i].an2013);  break;
            case 1: top = parseInt(index[i].an2012);  break;
        }

        var positionPays = top;
        var paysD3 = classement.select("#"+index[i].iso);

        // SI PAS DE NOTES
        if(!isNaN(positionPays))
        {
   
            // REGLER EGALITES
            for(var j = 0; j < already.length; j++)
            {
                if(top == already[j])
                {
                    top += 1;
                }
            }
            already.push(top);
            top *= espaceEntreDeux;

            var nomPays = "";
            if(langue == "FR"){ nomPays = index[i].nom; } else { nomPays = index[i].name; }


            // RECLASSER LA LISTE
            paysD3
                .transition().duration(700)
                .style("display", "inline")
                .style("top", top+"px")
                .text("#"+positionPays+" "+nomPays);

        } else {
            paysD3.style("display", "none");
        }

    }

    d2d.redrawSvg();

    if(mode == "3d")
    {
        document.getElementById("loader").style.display = "block";
        setTimeout( function(){ d2d.createTextureFromSvg(); }, 700 ); 
    }
    

}











/////////////////////////////////////////////////////////////////////////////////
//////////////////// CLIC PAYS /////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function clicPaysClassement(isoPays)
{

    if(mode == "3d")
    {
        var classement = d3.selectAll(".itemPays");
        classement.style("color", "black");

        for(var i = 0; i < index.length; i++)
        {
            if(isoPays == index[i].iso)
            {

                d3.selectAll("#"+index[i].iso).style("color", "#00f");
                var positionPays = projectionfor3d(getGeoCoord(index[i].latitude, index[i].longitude));
                canvas.moveCamToPosition(positionPays);
            
            }
        }
        
    }

}












//////////////////////////////////////////////////////////
////////////// UTILS ////////////////////////////////////
////////////////////////////////////////////////////////


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
        var traductionCoor = projection(coordonneesCapitale);        

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
    
    this.spot1; this.spot2;
    this.angleSpot;

    this.isZoom;

    this.camera;
    this.angleCamera;
    this.rayonCamera;
    this.positionInitCam;
    this.focusCamera;
    this.transitionCamera;
    this.transitionFocusCamera;


    this.background;
    this.backgroundScene;
    this.backgroundCam;



    this.setup = function(WIDTH, HEIGHT)
    {


        var VIEW_ANGLE = 45,
            ASPECT = WIDTH / HEIGHT,
            NEAR = 0.1,
            FAR = 10000;          


        this.mouseDown = false;
        this.scrollSouris = false;
        this.angleSpot = 0;
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
        this.positionInitCam = [0, 0, 800];
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
        this.renderer.setSize(window.innerWidth, 4*window.innerWidth/6);
        this.renderer.setClearColor("rgb(20, 50, 100)", 1);



        // LIGHT
        this.scene.add( new THREE.AmbientLight( 0xffffff ) );

        this.spot1 = new THREE.DirectionalLight( 0xff0000, 2 );
        this.spot1.position.set( 0.5, 1, 0 );
        this.scene.add(this.spot1);

        this.spot2 = new THREE.DirectionalLight( 0x00ff00, 2 );
        this.spot2.position.set( -0.5, 1, 0 );
        this.scene.add(this.spot2);

        this.canvas = this.renderer.domElement;
        this.canvas.id = "canvas3d";
        document.getElementById(conteneur).appendChild(this.canvas);   



        // INTERACTION
        var clone = this;
        this.canvas.addEventListener("mousemove", function(event){ clone.onMouseMove(event); }, false);
        this.canvas.addEventListener("mousedown", function(event){ clone.onMouseDown(event); }, false);
        this.canvas.addEventListener("mouseup", function(event){ clone.onMouseUp(event); }, false);
        this.canvas.addEventListener("mouseout", function(event){ clone.onMouseUp(event); }, false); // releve le clic si tu sort du canvas
        this.canvas.addEventListener("click", function(event){ clone.onClick(event); }, false);


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

        // background
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



    this.onClick = function(event)
    {
        
        if(this.scrollSouris == false)
        {
            this.initCam();
        } else {
            this.scrollSouris = false;
        }

    }


    this.initCam = function()
    {

        var classement = d3.selectAll(".itemPays");
        classement.style("color", "black");

        if(this.isZoom)
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

            this.isZoom = false;
        }

    }



    this.positionCamera = function()
    {
        
        // ANGLES
        this.angleCamera[0] += (this.xSouris - this.xSourisOld);
        this.angleCamera[1] += (this.ySouris - this.ySourisOld);


        /*
        // CONDITIONS ANGLES
        var limiteAngle = [ 20, 160 ];
        // if(this.angleCamera[0] > limiteAngle[1]){ this.angleCamera[0] = limiteAngle[1]; }
        // if(this.angleCamera[0] < limiteAngle[0]){ this.angleCamera[0] = limiteAngle[0]; }

        if(this.angleCamera[1] > limiteAngle[1]){ this.angleCamera[1] = limiteAngle[1]; }
        if(this.angleCamera[1] < limiteAngle[0]){ this.angleCamera[1] = limiteAngle[0]; }


        // IO
        // this.camera.position.x = Math.cos(this.angleCamera[0]*(Math.PI/180)) * this.rayonCamera;
        // this.camera.position.y = Math.cos(this.angleCamera[1]*(Math.PI/180)) * this.rayonCamera;
        // this.camera.position.z = Math.sin(this.angleCamera[0]*(Math.PI/180)) * Math.sin(this.angleCamera[1]*(Math.PI/180)) * this.rayonCamera;

        this.camera.lookAt( new THREE.Vector3( this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ) );
        */

        if(this.angleCamera[0] > 120){ this.angleCamera[0] = 120; }
        if(this.angleCamera[0] < -120){ this.angleCamera[0] = -120; }

        if(this.angleCamera[1] > 180){ this.angleCamera[1] = 180; }
        if(this.angleCamera[1] < -180){ this.angleCamera[1] = -180; }

        this.camera.position.x = this.rayonCamera * Math.sin( this.angleCamera[0] * Math.PI / 360 ) * Math.cos( this.angleCamera[1] * Math.PI / 360 );
        this.camera.position.y = this.rayonCamera * Math.sin( this.angleCamera[1] * Math.PI / 360 );
        this.camera.position.z = this.rayonCamera * Math.cos( this.angleCamera[0] * Math.PI / 360 ) * Math.cos( this.angleCamera[1] * Math.PI / 360 );
        this.camera.updateMatrix();


    }



    this.moveCamToPosition = function(position)
    {

        this.angleCamera[0] = 0;
        this.angleCamera[1] = 0;
        this.rayonCamera = this.positionInitCam[2];

        this.transitionCamera.setup(
            [this.camera.position.x, this.camera.position.y, this.camera.position.z], 
            [ position[0], position[1], this.rayonCamera ] );
        
        this.transitionFocusCamera.setup(
            [ this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ],
            [ position[0], position[1], 0 ] );

        this.isZoom = true;

    }

    





    this.onResize = function(newWidth, newHeight)
    {

        this.renderer.setSize(newHeight, newHeight);
    
    }




    this.setupBackground = function()
    {

        var attributes = {};

        var uniforms = {

            noise:  { type:'f', value: 0.04 },

        };

        var shaderMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            attributes: attributes,
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

        canvas.onResize(newWidth, newHeight);

    } else {

        d2d.resize(newWidth, newHeight, newWidth/12);     

    }

}

















