$(function(){

	var origine = false;
	var origineX;
	var origineY;
	var angleX;
	var angleY;
	
	$(".mode2d #carte").draggable()

   $("#picto_cam").draggable({
   		containment: "parent",
   		start: function(event, ui ) {
   			if (origine == false){
   				origineX = event.clientX;
				origineY = event.clientY + 50;
				origine = true;
   			}
   		},
  		drag: function( event, ui ) {
  			
  			angleX = Math.max ( event.clientX - origineX , -100);
  			angleX = Math.min ( angleX , 100);

  			angleY = Math.max ( event.clientY - origineY + 100, -100);
  			angleY = Math.min ( angleY , 100);

  			angleX = map(angleX, -100, 100, -90, 90)
  			angleY = map(angleY, -100, 100, 90, -90)

  			canvas.rotation(angleX , angleY);



  		}
	});

   

   	$("#more").hide(0);
	$("#intro").append("<br/><a href='#'>Lire la suite</a>");
	$("#intro a").click(function(){
		$("#more").slideDown(500);
		$(this).hide(0);
	})



}); 


