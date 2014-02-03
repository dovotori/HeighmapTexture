/**
 * @author alteredq / http://alteredqualia.com/
 *
 */

THREE.ShaderTerrain = {

	/* -------------------------------------------------------------------------
	//	Dynamic terrain shader
	//		- Blinn-Phong
	//		- height + normal + diffuse1 + diffuse2 + specular + detail maps
	//		- point, directional and hemisphere lights (use with "lights: true" material option)
	//		- shadow maps receiving
	 ------------------------------------------------------------------------- */

	'terrain' : {

		uniforms: THREE.UniformsUtils.merge( [

			THREE.UniformsLib[ "fog" ],
			THREE.UniformsLib[ "lights" ],
			THREE.UniformsLib[ "shadowmap" ],

			{

			"enableDiffuse1"  : { type: "i", value: 0 },
			"enableDiffuse2"  : { type: "i", value: 0 },
			"enableSpecular"  : { type: "i", value: 0 },
			"enableReflection": { type: "i", value: 0 },

			"animLerp": { type: "f", value: 0.0 },
			"textureSquare": { type: "t", value: null },

			"tDiffuse1"	   : { type: "t", value: null },
			"tDiffuse2"	   : { type: "t", value: null },
			"tDetail"	   : { type: "t", value: null },
			"tNormal"	   : { type: "t", value: null },
			"tSpecular"	   : { type: "t", value: null },
			"tDisplacement": { type: "t", value: null },

			"uNormalScale": { type: "f", value: 1.0 },

			"uDisplacementBias": { type: "f", value: 0.0 },
			"uDisplacementScale": { type: "f", value: 1.0 },

			"uDiffuseColor": { type: "c", value: new THREE.Color( 0xeeeeee ) },
			"uSpecularColor": { type: "c", value: new THREE.Color( 0x111111 ) },
			"uAmbientColor": { type: "c", value: new THREE.Color( 0x050505 ) },
			"uShininess": { type: "f", value: 30 },
			"uOpacity": { type: "f", value: 1 },

			"uRepeatBase"    : { type: "v2", value: new THREE.Vector2( 1, 1 ) },
			"uRepeatOverlay" : { type: "v2", value: new THREE.Vector2( 1, 1 ) },

			"uOffset" : { type: "v2", value: new THREE.Vector2( 0, 0 ) }

			}

		] ),

		fragmentShader: [

			"uniform vec3 uAmbientColor;",
			"uniform vec3 uDiffuseColor;",
			"uniform vec3 uSpecularColor;",
			"uniform float uShininess;",
			"uniform float uOpacity;",

			"uniform bool enableDiffuse1;",
			"uniform bool enableDiffuse2;",
			"uniform bool enableSpecular;",

			"uniform sampler2D textureSquare;",
			"uniform sampler2D tDiffuse1;",
			"uniform sampler2D tDiffuse2;",
			"uniform sampler2D tDetail;",
			"uniform sampler2D tNormal;",
			"uniform sampler2D tSpecular;",
			"uniform sampler2D tDisplacement;",

			"uniform float uNormalScale;",

			"uniform vec2 uRepeatOverlay;",
			"uniform vec2 uRepeatBase;",

			"uniform vec2 uOffset;",

			"varying vec3 vTangent;",
			"varying vec3 vBinormal;",
			"varying vec3 vNormal;",
			"varying vec2 vUv;",
			"varying vec3 p;",

			"uniform vec3 ambientLightColor;",


			"#if MAX_DIR_LIGHTS > 0",

				"uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];",
				"uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];",

			"#endif",

			"#if MAX_HEMI_LIGHTS > 0",

				"uniform vec3 hemisphereLightSkyColor[ MAX_HEMI_LIGHTS ];",
				"uniform vec3 hemisphereLightGroundColor[ MAX_HEMI_LIGHTS ];",
				"uniform vec3 hemisphereLightDirection[ MAX_HEMI_LIGHTS ];",

			"#endif",

			"#if MAX_POINT_LIGHTS > 0",

				"uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];",
				"uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];",
				"uniform float pointLightDistance[ MAX_POINT_LIGHTS ];",

			"#endif",

			"varying vec3 vViewPosition;",

			THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
			THREE.ShaderChunk[ "fog_pars_fragment" ],


			"float random(vec3 scale,float seed){",
			    "return fract(sin(dot(gl_FragCoord.xyz+seed,scale)) * 43758.5453 + seed);",
			"}",

			"float map(float valeur, float minRef, float maxRef, float minDest, float maxDest){",
				"return minDest + (valeur - minRef) * (maxDest - minDest) / (maxRef - minRef);",
			"}",


			"void main() {",


				"gl_FragColor = vec4( vec3( 1.0 ), uOpacity );",

				"vec3 specularTex = vec3( 1.0 );",

				"vec2 uvOverlay = uRepeatOverlay * vUv + uOffset;",
				"vec2 uvBase = uRepeatBase * vUv;",


				"vec3 normalTex = texture2D( tDetail, uvOverlay ).xyz * 2.0 - 1.0;",
				"normalTex.xy *= uNormalScale;",
				"normalTex = normalize( normalTex );",

				"if( enableDiffuse1 && enableDiffuse2 ) {",

					"vec4 colDiffuse1 = texture2D( tDiffuse1, uvOverlay );",
					"vec4 colDiffuse2 = texture2D( tDiffuse2, uvOverlay );",

					"#ifdef GAMMA_INPUT",

						"colDiffuse1.xyz *= colDiffuse1.xyz;",
						"colDiffuse2.xyz *= colDiffuse2.xyz;",

					"#endif",

					"gl_FragColor = gl_FragColor * mix ( colDiffuse1, colDiffuse2, 1.0 - texture2D( tDisplacement, uvBase ) );",

				" } else if( enableDiffuse1 ) {",

					"gl_FragColor = gl_FragColor * texture2D( tDiffuse1, uvOverlay );",

				"} else if( enableDiffuse2 ) {",

					"gl_FragColor = gl_FragColor * texture2D( tDiffuse2, uvOverlay );",

				"}",

				"if( enableSpecular )",
					"specularTex = texture2D( tSpecular, uvOverlay ).xyz;",

				"mat3 tsb = mat3( vTangent, vBinormal, vNormal );",
				"vec3 finalNormal = tsb * normalTex;",

				"vec3 normal = normalize( finalNormal );",
				"vec3 viewPosition = normalize( vViewPosition );",

				// point lights

				"#if MAX_POINT_LIGHTS > 0",

					"vec3 pointDiffuse = vec3( 0.0 );",
					"vec3 pointSpecular = vec3( 0.0 );",

					"for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {",

						"vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );",
						"vec3 lVector = lPosition.xyz + vViewPosition.xyz;",

						"float lDistance = 1.0;",
						"if ( pointLightDistance[ i ] > 0.0 )",
							"lDistance = 1.0 - min( ( length( lVector ) / pointLightDistance[ i ] ), 1.0 );",

						"lVector = normalize( lVector );",

						"vec3 pointHalfVector = normalize( lVector + viewPosition );",
						"float pointDistance = lDistance;",

						"float pointDotNormalHalf = max( dot( normal, pointHalfVector ), 0.0 );",
						"float pointDiffuseWeight = max( dot( normal, lVector ), 0.0 );",

						"float pointSpecularWeight = specularTex.r * max( pow( pointDotNormalHalf, uShininess ), 0.0 );",

						"pointDiffuse += pointDistance * pointLightColor[ i ] * uDiffuseColor * pointDiffuseWeight;",
						"pointSpecular += pointDistance * pointLightColor[ i ] * uSpecularColor * pointSpecularWeight * pointDiffuseWeight;",

					"}",

				"#endif",

				// directional lights

				"#if MAX_DIR_LIGHTS > 0",

					"vec3 dirDiffuse = vec3( 0.0 );",
					"vec3 dirSpecular = vec3( 0.0 );",

					"for( int i = 0; i < MAX_DIR_LIGHTS; i++ ) {",

						"vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );",

						"vec3 dirVector = normalize( lDirection.xyz );",
						"vec3 dirHalfVector = normalize( dirVector + viewPosition );",

						"float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );",
						"float dirDiffuseWeight = max( dot( normal, dirVector ), 0.0 );",

						"float dirSpecularWeight = specularTex.r * max( pow( dirDotNormalHalf, uShininess ), 0.0 );",

						"dirDiffuse += directionalLightColor[ i ] * uDiffuseColor * dirDiffuseWeight;",
						"dirSpecular += directionalLightColor[ i ] * uSpecularColor * dirSpecularWeight * dirDiffuseWeight;",

					"}",

				"#endif",

				// hemisphere lights

				"#if MAX_HEMI_LIGHTS > 0",

					"vec3 hemiDiffuse  = vec3( 0.0 );",
					"vec3 hemiSpecular = vec3( 0.0 );" ,

					"for( int i = 0; i < MAX_HEMI_LIGHTS; i ++ ) {",

						"vec4 lDirection = viewMatrix * vec4( hemisphereLightDirection[ i ], 0.0 );",
						"vec3 lVector = normalize( lDirection.xyz );",

						// diffuse

						"float dotProduct = dot( normal, lVector );",
						"float hemiDiffuseWeight = 0.5 * dotProduct + 0.5;",

						"hemiDiffuse += uDiffuseColor * mix( hemisphereLightGroundColor[ i ], hemisphereLightSkyColor[ i ], hemiDiffuseWeight );",

						// specular (sky light)

						"float hemiSpecularWeight = 0.0;",

						"vec3 hemiHalfVectorSky = normalize( lVector + viewPosition );",
						"float hemiDotNormalHalfSky = 0.5 * dot( normal, hemiHalfVectorSky ) + 0.5;",
						"hemiSpecularWeight += specularTex.r * max( pow( hemiDotNormalHalfSky, uShininess ), 0.0 );",

						// specular (ground light)

						"vec3 lVectorGround = -lVector;",

						"vec3 hemiHalfVectorGround = normalize( lVectorGround + viewPosition );",
						"float hemiDotNormalHalfGround = 0.5 * dot( normal, hemiHalfVectorGround ) + 0.5;",
						"hemiSpecularWeight += specularTex.r * max( pow( hemiDotNormalHalfGround, uShininess ), 0.0 );",

						"hemiSpecular += uSpecularColor * mix( hemisphereLightGroundColor[ i ], hemisphereLightSkyColor[ i ], hemiDiffuseWeight ) * hemiSpecularWeight * hemiDiffuseWeight;",

					"}",

				"#endif",

				// all lights contribution summation

				"vec3 totalDiffuse = vec3( 0.0 );",
				"vec3 totalSpecular = vec3( 0.0 );",

				"#if MAX_DIR_LIGHTS > 0",

					"totalDiffuse += dirDiffuse;",
					"totalSpecular += dirSpecular;",

				"#endif",

				"#if MAX_HEMI_LIGHTS > 0",

					"totalDiffuse += hemiDiffuse;",
					"totalSpecular += hemiSpecular;",

				"#endif",

				"#if MAX_POINT_LIGHTS > 0",

					"totalDiffuse += pointDiffuse;",
					"totalSpecular += pointSpecular;",

				"#endif",

				


				//"gl_FragColor.xyz = gl_FragColor.xyz * ( totalDiffuse + ambientLightColor * uAmbientColor ) + totalSpecular;",


				// WIRE FRAME
				// "vec4 wireFrame = texture2D( textureSquare, uvBase );",
				// "gl_FragColor.xyz = gl_FragColor.xyz * wireFrame.xyz;",				
				"vec2 Tile = vec2(0.01, 0.01);",
				"vec2 Shift = vec2(0.1, 0.1);",
				"vec2 xy = vec2( map( p.x, 0.0, 520.0, 0.0, 1.0 ), map( p.y, 0.0, 520.0, 0.0, 1.0 ) );",
				"vec2 phase = fract(xy / Tile) + Shift;",
				"if (phase.x > 1.0)",
				"phase.x = phase.x - 1.0;",
				"if (phase.y > 1.0)",
				"phase.y = phase.y - 1.0;",
				"vec4 outColor = texture2D( textureSquare, phase );",
				"if (outColor.a == 0.0){ discard; }",
				//"gl_FragColor = gl_FragColor * outColor;",


				// HAUTEUR DES PIXELS
				"vec4 texture = texture2D( tDisplacement, uvBase );",
				"float hauteur = texture.z;",

				// D'UNE COULEUR A L'AUTRE
				"vec3 colorFond = vec3(0.7, 0.2, 0.1);",
				"vec3 colorHaut = vec3(0.9, 0.9, 0.9);",
				//"gl_FragColor.xyz = ( gl_FragColor.xyz ) * vec3( 1.0, map( hauteur, 0.0, 1.0, 0.01, 0.6 ), map( hauteur, 0.0, 1.0, 0.01, 0.6 ) );",
				"gl_FragColor.x = map( gl_FragColor.x, 0.0, 1.0, colorFond.x, colorHaut.x );",
				"gl_FragColor.y = map( gl_FragColor.y, 0.0, 1.0, colorFond.y, colorHaut.y );",
				"gl_FragColor.z = map( gl_FragColor.z, 0.0, 1.0, colorFond.z, colorHaut.z );",

				// // MER NOIRE
				"if( hauteur < 0.001 ){",
					"gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );",
				"}",

				// // GRATICULE
				// "float modulo = mod( hauteur, 0.25 );",
				// "if( modulo > 0.0 && modulo < 0.01 )",
				// "{ gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0); }",
				
				// "float espace = 10.0; float epaisseur = 0.4;",
				// "float moduloX = mod( p.x, espace );",
				// "if( moduloX > 0.0 && moduloX < epaisseur ) {",
				// 	"gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );",
				// "}",

				// "float moduloY = mod( p.y, espace );",
				// "if( moduloY > 0.0 && moduloY < epaisseur ) {",
				// 	"gl_FragColor = vec4( 0.0, 0.0, 0.0, 0.4 );",
				// "}",

				//"if( p.x > 0.5){ gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }",

				//"float x = texture2D( tDisplacement, uvBase ).x;",
				//"gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );",
				//"if( gl_FragCoord.x > 400.0 ){ gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 ); }",


				THREE.ShaderChunk[ "shadowmap_fragment" ],
				THREE.ShaderChunk[ "linear_to_gamma_fragment" ],
				THREE.ShaderChunk[ "fog_fragment" ],

			"}"

		].join("\n"),

		vertexShader: [

			"attribute vec4 tangent;",

			"uniform vec2 uRepeatBase;",

			"uniform sampler2D tNormal;",

			"uniform float animLerp;",

			"#ifdef VERTEX_TEXTURES",

				"uniform sampler2D tDisplacement;",
				"uniform float uDisplacementScale;",
				"uniform float uDisplacementBias;",

			"#endif",

			"varying vec3 vTangent;",
			"varying vec3 vBinormal;",
			"varying vec3 vNormal;",
			"varying vec2 vUv;",
			"varying vec3 p;",

			"varying vec3 vViewPosition;",

			THREE.ShaderChunk[ "shadowmap_pars_vertex" ],

			"void main() {",

				"p = position.xyz;",

				"vNormal = normalize( normalMatrix * normal );",

				// tangent and binormal vectors

				"vTangent = normalize( normalMatrix * tangent.xyz );",

				"vBinormal = cross( vNormal, vTangent ) * tangent.w;",
				"vBinormal = normalize( vBinormal );",

				// texture coordinates

				"vUv = uv;",

				"vec2 uvBase = uv * uRepeatBase;",

				// displacement mapping

				"#ifdef VERTEX_TEXTURES",

					"vec3 dv = texture2D( tDisplacement, uvBase ).xyz;",
					"float df = uDisplacementScale * dv.x + uDisplacementBias;",
					"vec3 displacedPosition = normal * df + position;",

					"vec4 worldPosition = modelMatrix * vec4( displacedPosition, 1.0 );",
					"vec4 mvPosition = modelViewMatrix * vec4( displacedPosition, 1.0 );",

				"#else",

					"vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
					"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

				"#endif",


				// ANIMATION
				"gl_Position = projectionMatrix * modelViewMatrix * vec4( p.x, p.y, displacedPosition.z * animLerp, 1.0 );",
				
				//"gl_Position = projectionMatrix * mvPosition;",

				"vViewPosition = -mvPosition.xyz;",

				"vec3 normalTex = texture2D( tNormal, uvBase ).xyz * 2.0 - 1.0;",
				"vNormal = normalMatrix * normalTex;",

				THREE.ShaderChunk[ "shadowmap_vertex" ],

			"}"

		].join("\n")

	}

};
