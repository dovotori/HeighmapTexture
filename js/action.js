

$(function(){

	var origine = false;
	var origineX;
	var origineY;
	var angleX;
	var angleY;


  $("#main").hide(0);


 	
	$(".mode2d #carte").draggable();
  
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

  			angleX = map(angleX, -100, 100, -90, 90);
  			angleY = map(angleY, -100, 100, 90, -90);

  			canvas.rotation(angleX , angleY);


  		}
	});

  

  var readMoreTrad = [];
 readMoreTrad["fr"] = "Lire la suite";
 readMoreTrad["en"] = "Read more";
 readMoreTrad["es"] = "Leer más";
 readMoreTrad["ru"] = "Дальше";
 readMoreTrad["ar"] = "اقرأ المزيد";

 var readMore = "Read more";

 if( readMoreTrad[$("html").attr("lang")] ){
    readMore = readMoreTrad[$("html").attr("lang")];  
 }

 

  $("#more").hide(0);
	$("#intro").append("<br/><a class='morelink' href='#'>"+readMore+"</a>");
	$("#intro > a").add("#intro").click(function(){
		$("#more").slideDown(500);
		$(".morelink").hide(0);
	})



}); 




function action_resetPositionCarte()
{
  $("#carte").animate({ 
    top: 0, 
    left: 0}, 400);
}




function action_focusPaysListe(isoPays)
{

    action_removeFocusPaysListe();
    $("#"+isoPays).addClass( "focusList");

    $("#liste").animate({
          scrollTop: $("#"+isoPays).position().top + $("#liste").scrollTop() },
          1000);

}


function action_removeFocusPaysListe()
{
  $(".itemPays").removeClass("focusList");
}



function action_recentrerPictoCam(x, y)
{
  $("#picto_cam").animate({
                left: x+"px",
                top: y+"px"
                }, 2000);
}


