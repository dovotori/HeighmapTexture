$(function(){
   $("#picto_cam").draggable({
   		containment: "parent",
  		drag: function( event, ui ) {
  			console.log (event)
  		}
	});
}); 