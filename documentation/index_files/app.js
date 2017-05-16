/*globals jQuery, $, document */
(function ($) {
    'use strict';
    $(document).ready(function () {
    	$('body').attr('data-os-type', swa.detectOsType());
    });
}(jQuery));
