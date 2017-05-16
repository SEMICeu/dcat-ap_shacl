/*******************************************************************************
 * Copyright (c) 2010 TopQuadrant, Inc.
 * All rights reserved. 
 *******************************************************************************/



	function setCookie(name, value) {
	//	 alert ("set cookie: " + name + " = " + value);
		var expires = new Date(); 
		expires.setDate(expires.getDate()+30); 
		var cookieString = name + "=" + escape(value) + "; path=/" + ((expires == null) ? "" : "; expires=" + expires.toGMTString()); 
		document.cookie = cookieString; 
		return document.cookie;  
	} 
	
	function getCookie(c_name)
	{
	if (document.cookie.length>0)
	  {
	  c_start=document.cookie.indexOf(c_name + "=");
	  if (c_start!=-1)
	    { 
	    c_start=c_start + c_name.length+1; 
	    c_end=document.cookie.indexOf(";",c_start);
	    if (c_end==-1) c_end=document.cookie.length;
	    var rslt = unescape(document.cookie.substring(c_start,c_end));
	//    alert ("cookie: " + c_name + " = " + rslt);
	    return rslt;
	    } 
	  }
   // alert ("no cookie: " + c_name );
	return "";
	}
	function delCookie(name) {
		document.cookie = name + "=; expires=Thu, 01-Jan-70 00:00:01 GMT" + "; path=/";
	}	

	var username = getCookie("username");
	