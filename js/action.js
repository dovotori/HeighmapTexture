$(function(){
   $("#picto_cam").draggable({
   		containment: "parent",
  		drag: function( event, ui ) {
  			canvas.rotation(event.clientX, event.clientY);
  		}
	});

   

   	$("#more").hide(0);
	$("#intro").append("<br/><a href='#'>Lire la suite</a>");
	$("#intro a").click(function(){
		$("#more").slideDown(500);
		$(this).hide(0);
	})



}); 