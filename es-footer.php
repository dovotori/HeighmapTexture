		</section>

		<section id="main">
		
				<article id="noWebgl"><p>Votre carte graphique ou votre navigateur ne supporte pas webgl. <br/>Vous pouvez essayer d'utiliser firefox ou rester sur la version 2d de la carte.</p></article>

		
				<div id="control_mode">

					<div id="btn_rotation">
						<div id="picto_cam"></div>
					</div>

					<button class="btn_mode" id="btn_2d" type="button">2d</button>
					<button class="btn_mode" id="btn_3d" type="button">3d</button>

					<button class="btn_mode" id="btn_in" type="button">zoom +</button>
					<button class="btn_mode" id="btn_out" type="button">zoom -</button>
					<p id="btn_reset">reset</p>


				</div>

				<div id="carte"></div>
				
				<div id="classement" class="mod right">
					<div id="control_annees">
						<div class="btn_annee" id="btn_precedent">&#8592;</div>
						<h2 class="btn_annee" id="current_year"></h2>
						<div class="btn_annee" id="btn_suivant">&#8594;</div>
					</div>
					<table>
						<thead id="liste_legende">
							<tr class="legende itemPays">
								<th class="position">rank</th>
								<th class="name">country</th>
								<th class="diff">diff</th>
								<th class="note">note</th>
							</tr>
						</thead>
						<tbody id="liste-container">
							<tr id="liste">
							</tr>
						</tbody>
					</table>
				</div>


		</section>



		<section id="sources" class="line center">
			
			<p><a href="data/carte2014_en.png">Download the map</a></p>
			<p><a href="data/index2.csv">Download the index</a></p>
			

			<h3 class="h5-like">Methodology</h3>
			 <p><a href="data/2014_wpfi_methodology.pdf">Download pdf (450Kb) </a></p>
			
			<p class="small">Data visualisation by Pierre-Alain Leboucher and Dorian Ratovo</br>
				with <a href="http://d3js.org/">D3.js</a> by Mike Bostock, and <a href="http://threejs.org/">THREE.js</a> by Mrdoob</p>
		
				<br/><br/><br/>
		</section>



		
		<!-- RELIEF -->		
		<script type="x-shader/x-vertex" id="vertexShader">

			#ifdef GL_ES
			precision highp float;
			#endif
				
			uniform sampler2D displacement;
			varying vec2 vUv;
			varying vec3 vNormal;
			varying vec3 vPosition;
			
				
			void main() {	

				vec4 newPosition;
				vec4 dv;
				float df;
				dv = texture2D( displacement, uv );
	
				df = 0.30*dv.x + 0.59*dv.y + 0.11*dv.z;
	
				newPosition = vec4( normal * df * 100.0, 0.0) + vec4(position, 1.0);
				
				vUv = uv;
				//vNormal = normal;
				vNormal = normalize(newPosition.xyz);
				vPosition = newPosition.xyz;
				
				gl_Position = projectionMatrix * modelViewMatrix * newPosition;
				

			}

		</script>




		<script type="x-shader/x-fragment" id="fragmentShader">

			#ifdef GL_ES
			precision highp float;
			#endif

			
			uniform sampler2D displacement;
			uniform sampler2D tWireframe;
			
			varying vec2 vUv;
			varying vec3 vNormal;
			varying vec3 vPosition;
			
			

			float random(vec3 scale,float seed){
			    return fract(sin(dot(gl_FragCoord.xyz+seed,scale)) * 43758.5453 + seed);
			}

			float map(float valeur, float minRef, float maxRef, float minDest, float maxDest)
			{
				return minDest + (valeur - minRef) * (maxDest - minDest) / (maxRef - minRef);
			}

			void main(void)
			{
			
				
			    float n = 0.04 * ( .5 - random( vec3( 1. ), length( gl_FragCoord ) ) );
			    float hauteur = texture2D( displacement, vUv ).z;

			    float positionClassement = map(hauteur,0.0,1.0,1.0,180.0); 

			    float tColor_1 = 0.25;
			    float tColor_2 = 0.5;
			    float tColor_3 = 0.75;
			    float tColor_4 = 0.9;

			    // DIFFUSE
			    vec3 light = vec3(0.5, 0.2, 1.0);
				float diffuse = max(0.0, dot(normalize(vNormal), light));
				//gl_FragColor = vec4(vec3(diffuse), 1.0);

			    

			    
			    
			    // MER
				if( hauteur < 0.001 ){
					gl_FragColor = vec4( (40.0/255.0), (40.0/255.0), (40.0/255.0), 1.0 );
				} else { 			
			
					// 4 COULEURS
					float r, v, b;
					vec3 c1 = vec3(200.0/255.0, 255.0/255.0, 200.0/255.0); 	//vert très clair
					vec3 c2 = vec3(253.0/255.0, 227.0/255.0, 6.0/255.0); 	//jaune
					vec3 c3 = vec3(241.0/255.0, 151.0/255.0, 3.0/255.0);	//orange
					vec3 c4 = vec3(218.0/255.0, 0.0/255.0, 46.0/255.0);		//rouge
					vec3 c5 = vec3(46.0/255.0, 16.0/255.0, 47.0/255.0);		//violet
					
					if(hauteur < tColor_1){
						// violet -> rouge
						r = map(hauteur, 0.0, tColor_1, c5.x, c4.x);
						v = map(hauteur, 0.0, tColor_1, c5.y, c4.y);
						b = map(hauteur, 0.0, tColor_1, c5.z, c4.z);
						
					} else if(hauteur < tColor_2){
						// c4 -> c3
						r = map(hauteur, tColor_1, tColor_2, c4.x, c3.x);
						v = map(hauteur, tColor_1, tColor_2, c4.y, c3.y);
						b = map(hauteur, tColor_1, tColor_2, c4.z, c3.z);
					} else if(hauteur < tColor_3){
					
						// c3 -> c2
						r = map(hauteur, tColor_2, tColor_3, c3.x, c2.x);
						v = map(hauteur, tColor_2, tColor_3, c3.y, c2.y);
						b = map(hauteur, tColor_2, tColor_3, c3.z, c2.z);
						
					} else {
						// c2 -> c1
						r = map(hauteur, tColor_3, tColor_4, c2.x, c1.x);
						v = map(hauteur, tColor_3, tColor_4, c2.y, c1.y);
						b = map(hauteur, tColor_3, tColor_4, c2.z, c1.z);
					}

			
					vec3 color = vec3(r, v, b);
			    	gl_FragColor = vec4(color+n, 1.0);
				
				}



				// WIREFRAME
				vec2 Tile = vec2(0.01, 0.01);
				vec2 Shift = vec2(0.1, 0.1);
				vec2 xy = vec2( map( vPosition.x, 0.0, 520.0, 0.0, 1.0 ), map( vPosition.y, 0.0, 520.0, 0.0, 1.0 ) );
				vec2 phase = fract(xy / Tile) + Shift;
				if (phase.x > 1.0)
					phase.x = phase.x - 1.0;
				if (phase.y > 1.0)
					phase.y = phase.y - 1.0;
				vec4 outColor = texture2D( tWireframe, phase );
				
				if (outColor.a == 0.0){ discard; }

				// if (hauteur > 0.001){
				// 	gl_FragColor *= outColor;
				// }
				
			 
			}

		</script>


		








		<script type="text/javascript" src="http://rsf.org/squelettes/lib/js/jquery-1.4.2.min.js"></script>
		<script type="text/javascript" src="js/d3.js"></script>
		<script type="text/javascript" src="js/blur.js"></script>
		<script type="text/javascript" src="js/three.js"></script>
		<script type="text/javascript" src="js/queue.js"></script>
		<script type="text/javascript" src="js/utils.js"></script>
		<script type="text/javascript" src="js/main.js"></script>
		<script type="text/javascript" src="js/jquery-ui-1.10.4.custom.min.js"></script>
		<script type="text/javascript" src="js/action.js"></script>


	</body>
</html>
