
window.addEventListener("load", setup, false);

var width = 520; // 520
var height = 520;
var conteneur = "carte";

var projection = d3.geo.mercator()
    .scale(80)
    .translate([width/2, height/2]);

var projectionfor3d = function(array){
	array[0] = array[0]-width/2;
	array[1] = (array[1]-height/2)*(-1);
	return array;
}

var svg = d3.select("#"+conteneur).append("svg")
	.attr("id", "carteSvg")
	.attr("width", width)
	.attr("height", height);

var path = d3.geo.path().projection(projection);
var graticule = d3.geo.graticule();

svg.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path)
    .style("stroke", "#fff")
    .style("stroke-width", ".1px");

var svgFond = svg.append("svg:rect").attr("x", 0).attr("y", 0)
	.attr("width", width).attr("height", height)
	.style("fill", "rgba(0, 0, 0, 0)"); 


var index;
var canvas;
var currentYear;
var langue;










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

	// si WegGL est supporté
	if(window.WebGLRenderingContext)
	{
		document.getElementById("btn_3d").addEventListener("click", passage3d, false);
	} else {
		alert("wegGL not supported");
	}

	queue()
		.defer(lireJson, "data/world-countries-clean.json")
		.defer(lireCsv, "data/index.csv")
		.awaitAll(dessin2d);
	
}








function dessin2d(error, results)
{

	index = results[1];
	var features = results[0].features;

	var frontieres = svg.append("svg:g")
		.selectAll("path")
		.data(features)
		.enter().append("svg:path")
		.attr("id", function(d){ return d.id; })
		.attr("d", function(d){ return path(d); })
		.each(function(d){

			var colorCountry;
			var found = false;

			for (var i = 0; i < index.length; i++) {

				if(d.id == index[i].iso)
				{

					found = true;
					var centroid = path.centroid(d);
					var hauteur = index[i].an2013;
					var hauteurMax = index.length;

					// définir la couleur
					var red, green, blue;
					if(hauteur < hauteurMax/3){
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

					d3.select("#classement").append("p").attr("class", "itemPays")
                        .style("position", "absolute")
                        .attr("id", index[i].iso)
                        //.on("click", function(){ clickPays(this.id); });

				}
			}
			if(found)
			{
				colorCountry = "rgba("+red+","+green+","+blue+", 1)";
			} else {
				colorCountry = "rgba(200, 200, 200, 1)";
			}

			d3.select(this).style( "fill", colorCountry )
			d3.select(this).style( "stroke", colorCountry );

		})

        
        changementAnnee(0);

}


function passage3d()
{

	// carte greyscale pour texture heightMap
	svgFond.style("fill", "#fff");

	for(var i = 0; i < index.length; i++)
	{
		var pays = svg.select("#"+index[i].iso);

		var hauteur = index[i].an2013;
		var hauteurMax = index.length;
		var gris = map(hauteur, hauteurMax, 0, 0, 255);
		gris = Math.floor(gris);

		pays.style("fill", "rgba("+gris+","+gris+","+gris+", 1)" );
		pays.style( "stroke", "rgba("+gris+","+gris+","+gris+", 1)" );
	}


	var svgImg = document.getElementById("carteSvg");

    // transforme le svg en image
    var xml = new XMLSerializer().serializeToString(svgImg);
	var data = "data:image/svg+xml;base64," + btoa(xml);
	
	var imageTexture = new Image();
	imageTexture.addEventListener("load", blurImage, false);
	imageTexture.src = data;

}


function blurImage()
{


	var canvas2d = document.createElement( "canvas" );
	var ctx = canvas2d.getContext('2d');

	canvas2d.width = width;
	canvas2d.height = height;
	canvas2d.id = "canvas2d";

	ctx.drawImage( this, 0, 0, canvas2d.width, canvas2d.height );

	// application du blur
	varBlur(ctx, function(x, y){ return 10; });
	document.getElementById(conteneur).appendChild(canvas2d);
	
	dessin3d( canvas2d );

}



function dessin3d(canvas2d )
{

	// creation de la texture THREE
	var textureCarted3js = new THREE.Texture( canvas2d );
	textureCarted3js.needsUpdate = true;


	canvas = new Canvas();
	canvas.setup(width, height);

	var tailleCarte = projection([ 179, 89 ]);


	var cube = new THREE.Mesh(new THREE.CubeGeometry(100, 100, 100), new THREE.MeshBasicMaterial({ color : 0xff0000 }));
	cube.position.set(0, 0, 0)
	//canvas.scene.add(cube);

	displayRelief(canvas.scene, textureCarted3js);
	displayRepere(canvas.scene);

	// rendu
	animate();
	

}



function animate()
{
	requestAnimationFrame(animate); 
	canvas.draw();
}



function displayRelief(scene, texture)
{

    var n = 0;
    function loaded() {
        n++;
        console.log("loaded: " + n);

        if (n == 3) {
            terrain.visible = true;
        }
    }


    // heightmap
    //var texture = THREE.ImageUtils.loadTexture('mapInverse.png', null, loaded);

    // texture effect
    var detailTexture = THREE.ImageUtils.loadTexture("data/textureLisse.jpg", null, loaded);

    var terrainShader = THREE.ShaderTerrain[ "terrain" ];
    var uniformsTerrain = THREE.UniformsUtils.clone(terrainShader.uniforms);

    // HAUTEUR MAX
    uniformsTerrain[ "tDisplacement" ].value = texture;
    uniformsTerrain[ "uDisplacementScale" ].value = 10;

    // EFFET TEXTURE
    uniformsTerrain[ "tNormal" ].value = detailTexture;
    uniformsTerrain[ "tDiffuse1" ].value = detailTexture;
    uniformsTerrain[ "tDetail" ].value = detailTexture;

    // COULEUR
    uniformsTerrain[ "uNormalScale" ].value = 1;
    uniformsTerrain[ "enableDiffuse1" ].value = true;
    uniformsTerrain[ "enableDiffuse2" ].value = true;
    uniformsTerrain[ "enableSpecular" ].value = true;
    uniformsTerrain[ "uDiffuseColor" ].value.setHex(0xcccccc);	// diffuse
    uniformsTerrain[ "uSpecularColor" ].value.setHex(0x000000);	// spec 
    uniformsTerrain[ "uAmbientColor" ].value.setHex(0x0000cc);	// ambiant

    uniformsTerrain[ "uShininess" ].value = 3;  				// shininess
    uniformsTerrain[ "uRepeatOverlay" ].value.set(6, 6); 		// light reflection





    // MATERIAL
    var material = new THREE.ShaderMaterial({
        uniforms: uniformsTerrain,
        vertexShader: terrainShader.vertexShader,
        fragmentShader: terrainShader.fragmentShader,
        lights: true,
        fog: false,
        side: THREE.DoubleSide
    });




    var geometryTerrain = new THREE.PlaneGeometry(width, height, 256, 256);
    geometryTerrain.computeFaceNormals();
    geometryTerrain.computeVertexNormals();
    geometryTerrain.computeTangents();

    var terrain = new THREE.Mesh( geometryTerrain, material );
    terrain.position.set(0, 0, -10);

    scene.add(terrain);

    loaded();

}





function displayRepere(scene)
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


    this.setup = function(WIDTH, HEIGHT)
    {

        var VIEW_ANGLE = 45,
            ASPECT = WIDTH / HEIGHT,
            NEAR = 0.1,
            FAR = 10000;          


        this.mouseDown = false;
        this.scrollSouris = 100;
        this.centreCarte = [0,0];
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
        this.angleCamera = 90;
        this.positionInitCam = projectionfor3d(projection([0, -89]));
        this.focusCamera = [ this.centreCarte[0], this.centreCarte[1], 100 ];
        this.camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR );
        this.camera.up = new THREE.Vector3( 0, 0, 1 );

        this.rayonCamera = this.positionInitCam[1];

        this.camera.position.set( this.positionInitCam[0], this.positionInitCam[1], 800 );
        this.camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
        this.scene.add(this.camera);

    
        // RENDERER
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(WIDTH, HEIGHT);
        this.renderer.setClearColor("#000000", 1);


        // LIGHT
        this.scene.add( new THREE.AmbientLight( 0x888888 ) );

        this.spot1 = new THREE.DirectionalLight( 0x1111cc, 1 );
        this.spot1.position.set( 200, 0, 200 );
        this.spot1.intensity = 1.0;
        this.scene.add(this.spot1);

        this.spot2 = new THREE.DirectionalLight( 0xffffff, 0.4 );
        this.spot2.position.set( 200, 0, 200 );
        this.spot2.intensity = 1.0;
        this.scene.add(this.spot2);


        this.canvas = this.renderer.domElement;
        document.getElementById(conteneur).appendChild(this.canvas);
        


        var clone = this;
        this.canvas.addEventListener("mousemove", function(event){ clone.onMouseMove(event); }, false);
        this.canvas.addEventListener("mousedown", function(event){ clone.onMouseDown(event); }, false);
        this.canvas.addEventListener("mouseup", function(event){ clone.onMouseUp(event); }, false);
        this.canvas.addEventListener("mouseout", function(event){ clone.onMouseUp(event); }, false); // releve le clic si tu sort du canvas
        //this.canvas.addEventListener("mousewheel", function(event){ clone.onMouseScroll(event); }, false);
        //this.canvas.addEventListener("DOMMouseScroll", function(event){ clone.onMouseScroll(event); }, false);

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
        }
        return false;

    }



    this.onMouseScroll = function(event) 
    {

        var event = window.event || event;
        var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));

        this.scrollSouris += delta;
        this.scrollSouris = Math.min(this.scrollSouris, 70);
        this.scrollSouris = Math.max(this.scrollSouris, 40);
        
        this.positionCamera();
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




    this.positionCamera = function()
    {

        // ROTATION HORIZONTALE
        this.angleCamera += (this.xSouris - this.xSourisOld) * 0.1;

        var x = (Math.cos(this.angleCamera*(Math.PI/180)) * this.rayonCamera) + this.focusCamera[0];
        var y = (Math.sin(this.angleCamera*(Math.PI/180)) * this.rayonCamera) + this.focusCamera[1];
        
        this.camera.position.x = x;
        this.camera.position.y = y;
        this.camera.lookAt( new THREE.Vector3(this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ) );

        // ROTATION VERTICALE
        var dragY = (this.ySouris - this.ySourisOld);
        if((this.rayonCamera > 60 && dragY < 0) || (this.rayonCamera < 500 && dragY > 0) )
        {
            this.rayonCamera += dragY;
        }
    }



    this.moveCamToPays = function(paysId)
    {

        this.angleCamera = 90;
        this.rayonCamera = projection([ 0, -10 ])[1];

        this.transitionCamera.setup(
            [this.camera.position.x, this.camera.position.y, this.camera.position.z], 
            [ infosPays[paysId][3][0], infosPays[paysId][3][1]+this.rayonCamera, 2000 ] );
        
        this.transitionFocusCamera.setup(
            [ this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ],
            [ infosPays[ paysId][3][0], infosPays[paysId][3][1], 100 ] );

        this.isZoom = true;

    }

    

    this.positionSpot = function()
    {

        this.angleSpot++;
        var rayon = 1000;
        var centre = this.centreCarte;

        var x = (Math.cos(this.angleSpot*(Math.PI/180)) * rayon)+centre[0];
        var y = (Math.sin(this.angleSpot*(Math.PI/180)) * rayon)+centre[1];

        this.spot2.position.x = x;
        this.spot2.position.y = y;

    }



    this.init = function()
    {

        if(this.isZoom)
        {
            this.angleCamera = 90;
            this.rayonCamera = this.positionInitCam[1];

            this.transitionCamera.setup(
                [ this.camera.position.x, this.camera.position.y, this.camera.position.z ], 
                [ this.centreCarte[0], this.centreCarte[1]+this.rayonCamera, 2000 ] );
            
            this.transitionFocusCamera.setup(
                [ this.focusCamera[0], this.focusCamera[1], this.focusCamera[2] ],
                [ this.centreCarte[0], this.centreCarte[1], 100 ] );

            this.isZoom = false;
        }

    }


    this.onResize = function(newWidth, newHeight)
    {
        this.renderer.setSize(newWidth, newHeight);
    }


}









/////////////////////////////////////////////////////////////////////////////////
///////////// INTERACTION //////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


window.addEventListener("resize", onresize, false);

function onresize()
{

    var newWidth = window.innerWidth;
    var newHeight = window.innerHeight;
    //canvas.onResize(newWidth, newHeight);

}


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


    for(var i = 0; i < index.length; i++)
    {

        var espaceEntreDeux = 20;
        var top = 0;
        switch(currentYear)
        {
            case 0: top = index[i].an2013;  break;
            case 1: top = index[i].an2012;  break;
        }

        var positionPays = top;

        for(var j = 0; j < already.length; j++)
        {
            if(top == already[j])
            {
                top += espaceEntreDeux;
            }
        }
        already.push(top);
        top *= espaceEntreDeux;

        var nomPays = "";
        if(langue == "FR"){ nomPays = index[i].nom; } else { nomPays = index[i].name; }

        console.log(top+" : "+positionPays);

        var classement = d3.select("#classement");
        classement.select("#"+index[i].iso)
            .transition().duration(700)
            .style("top", top+"px")
            .text("#"+positionPays+" "+nomPays);

    }


}













