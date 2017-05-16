var swaspin = {
	
	dialogIndex : 0,
		
	selectedTemplateURI : null,
		
	/**
	 * Called when the user clicks "Add" on an edit widget for spin:constraint and other
	 * properties that can instantiate SPIN templates. 
	 */
	addSPINConstraintRow : function(queryGraphURI, bodyId, single, subjectURI, predicateURI) {
		swaspin.selectedTemplateURI = null;
		var loadId = 'constraintDialog' + swaspin.dialogIndex++;
		var params = {
				loadId: loadId, 
				predicate : '<' + predicateURI + '>',
				subject : '<' + subjectURI + '>',
				_base: swa.queryGraphURI,
				_viewClass: 'swa:AddSPINConstraintDialog',
				_snippet: true
		};
		$('#swa-dialog-parent').load(swa.servlet, params, function(data) {
			var div = $('#div-' + loadId);
			var options = {
				modal: true,
				title: "Add Constraint",
				width: 900,
				height: 400,
			    close: function(event, ui) {
			        $(this).dialog('destroy').remove();
			    },
		        'buttons': {
		            'OK': function() {
		            	if(swaspin.selectedTemplateURI) {
		            		swaspin.doAddSPINConstraintRow(bodyId, swaspin.selectedTemplateURI, subjectURI, predicateURI);
		            		$(this).dialog('close');
		            	}
		            	else {
		            		alert("Please select a template.");
		            	}
		            },
		            'Cancel': function() {
		                $(this).dialog('close');
		            }
		        }
			};
			div.dialog(options);
		});
	},


	doAddSPINConstraintRow : function(bodyId, templateURI, subjectURI, predicateURI) {
		var params = {
			_base : swa.queryGraphURI,
			_snippet : true,
			_viewClass : 'swa:NewTemplateCallEditor',
			predicate : '<' + predicateURI + '>',
			newTemplateType : '<' + templateURI + '>',
			subject : '<' + subjectURI + '>'
		};
		$.get(swa.servlet, params, function(data) {
			$('#' + bodyId).append(data);
		});
	},
	
	
	reloadDependingArgumentEditors : function(groupId, propertyURI) {
		$(".swa-dependant-argument-editor-" + groupId).each(function(index, element) {
			var id = $(element).attr('id');
			console.log("Reloading " + id + " with " + propertyURI);
			swa.loadWithResource(id, 'property', propertyURI);
		});
	}
};