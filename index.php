<?php
if (!isset($langue_user) && !isset($_SESSION["lang"])){
	
	$langue_user=substr($_SERVER["HTTP_ACCEPT_LANGUAGE"], 0, 2);
	switch($langue_user){	

	case"fr":
	$_SESSION["lang"] = "fr";
	header ("Location: fr-index2014.php");	
	break;
		
	case "en":
	$_SESSION["lang"] = "en";
	header ("Location: en-index2014.php");
	break;

	case "es":
	$_SESSION["lang"] = "es";
	header ("Location: es-index2014.php");
	break;

	case "ar":
	$_SESSION["lang"] = "ar";
	header ("Location: ar-index2014.php");
	break;

	case "fa":
	$_SESSION["lang"] = "fa";
	header ("Location: fa-index2014.php");
	break;

	case "ru":
	$_SESSION["lang"] = "ru";
	header ("Location: ru-index2014.php");
	break;
  	
	default:
	$_SESSION["lang"] = "en";
	header ("Location: en.html");
	break;
	}
}

?>