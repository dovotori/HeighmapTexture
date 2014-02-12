<?php
if (!isset($langue_user) && !isset($_SESSION["lang"])){
	
	$langue_user=substr($_SERVER["HTTP_ACCEPT_LANGUAGE"], 0, 2);
	switch($langue_user){	

	case"fr":
	$_SESSION["lang"] = "fr";
	header ("Location: /index2014/fr-index2014.php");	
	break;
		
	case "en":
	$_SESSION["lang"] = "en";
	header ("Location: /index2014/en-index2014.php");
	break;

	case "es":
	$_SESSION["lang"] = "es";
	header ("Location: /index2014/es-index2014.php");
	break;

	case "ar":
	$_SESSION["lang"] = "ar";
	header ("Location: /index2014/ar-index2014.php");
	break;

	case "fa":
	$_SESSION["lang"] = "fa";
	header ("Location: /index2014/fa-index2014.php");
	break;

	case "ru":
	$_SESSION["lang"] = "ru";
	header ("Location: /index2014/ru-index2014.php");
	break;
  	
	default:
	$_SESSION["lang"] = "en";
	header ("Location: /religions/en.html");
	break;
	}
}

?>