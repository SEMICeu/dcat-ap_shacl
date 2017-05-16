/**
 * The JavaScript library for the SWA components.
 *
 * Note that this is under active development and some parts of this API
 * are more stable than others.
 *
 * The public API that is considered relatively safe can be found on the top
 * of this file - anything under the demarkation line should only be used at
 * your own risk.  Please contact the developers if you need some specific
 * feature promoted to the stable API, or if you find a bug or limitation.
 */

// Global constants for RDF namespace
var rdf = {
        Property: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property',
        type: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
};

var rdfs = {
        domain: 'http://www.w3.org/2000/01/rdf-schema#domain',
        subClassOf: 'http://www.w3.org/2000/01/rdf-schema#subClassOf',
        subPropertyOf: 'http://www.w3.org/2000/01/rdf-schema#subPropertyOf'
};

var spin = {
        constraint: "http://spinrdf.org/spin#constraint"
};

// The main JavaScript object with references to the available functions
// (attached as fields so that they can more easily be "overloaded" by
// custom applications).
var swa = {

    // The event specified as the default resource-selection event in an application's FullScreenBorderLayout
    deepLinkingEvent : null,

    // Remembers which JS or CSS files were already imported - used by swa.requireJSLibrary
    importedFiles : { },

    // True if the "Enter log message" box has been activated
    logMessageBoxStatus : false,

    // The current (modal) progress monitor dialog
    progressMonitorDialog : null,

    // The progressId used by the current monitor dialog
    progressMonitorDialogId : null,

    // Should be set by application when starting up, contains the current base URI as string
    queryGraphURI : null,

    // If set, this warning will be issued in the UI after a change
    postConfigChangeWarning : null,

    // Whether to search the in-memory graph or search external data sources
    searchMemoryModel : false,

    // Set this true when a search is requested
    searchPerformed : false,

    // Server URL
    server : '',

    // Relative name of the main servlet
    servlet : 'swp',

    // Maps tabs to active graphs - values for queryGraphURI
    tabQueryGraphURIs : {},

    // Map of fields that are currently updating to timeout ids, to avoid duplicate or frequent ajax calls
    updateTimeouts : {}
};


/**
 * Replaces the content of a given jQuery element with a loading indicator
 * (spinning wheel).
 * @param e  the jQuery element
 */
swa.insertLoadingIndicator = function(e) {
    e.html('<div class="swa-loading-indicator"></div>');
};


/**
 * Reloads a ui:loadable using a jQuery Ajax call.
 * In addition to the id of the loadable, this function can take a JavaScript
 * object with name-value pairs.  The names will become pre-bound variables
 * in the reloaded view.  The values must be parsable RDF nodes (in SPARQL
 * syntax, e.g. '<http://example.org/MyClass>' or '"2011-11-11"^^xsd:date'.
 * @param id  the html id of the loadable
 * @param args  a JavaScript object with additional parameters
 * @param callback  an optional callback that is called after loading
 * @param withoutIndicator  true to bypass the insertion of an animated loading indicator
 * @return $jqxhr  the native XMLHttpRequest object in a jQuery wrapper
 */
swa.load = function(id, args, callback, withoutIndicator) {
    var $elementContainer = $('#' + id),
        uistate = $elementContainer.attr('uistate'),
        params,
        key;

    if ($elementContainer.length == 0) {
        alert('Error: Invalid use of swa.load: No element found with id ' + id);
        return;
    }

    if (!uistate) {
        alert('Error: Invalid use of swa.load: Missing uistate attribute at ' + id);
        return;
    }

    if (uistate.indexOf("&_window=true") > 0) {
        swa.loadWindow(id, args, callback);
        return;
    }

    if (!withoutIndicator) {
        swa.insertLoadingIndicator($elementContainer);
    }

    // Unsubscribe from any event this ui:loadable has subscribed to before.
    swa.unsubscribeWindow(id);

    params = $.deparam(uistate)

    if (args) {
        for (key in args) {
            params['_scope' + key] = args[key];
        }
    }

    params['_snippet'] = true;

    if (swa.server != '') {
        params['_server='] = escape(swa.server);
    }

    var $jqxhr = $.ajax({
        'url': swa.server + swa.servlet,
        'method': 'post',
        'data': params,
        'success': function (data, textStatus, jqXHR) {
            $elementContainer.html(data);
            swa.loadPostProcessAll($elementContainer);
            if(callback) {
                callback.call();
            }
        },
        'error': function (jqXHR, textStatus, errorThrown) {
            console.log(errorThrown);
        }
    });

    return $jqxhr;
};

/**
 * Checks if an element has a vertical scrollbar
 * @param $element  dom element in a jQuery wrapper
 * @returns boolean  if the element's vertical scrollbar is present
 */
swa.elementHasVerticalScrollbar = function ($element) {
    return ($element[0].scrollHeight > $element[0].clientHeight);
};


/**
 * Loads a given ui:loadable with a given variable pre-bound to
 * a given URI resource.
 * This can be used as onSelect handler of tree and grid elements,
 * e.g. onSelect="swa.loadWithResource('form', 'resource', resource)"
 * @param loadId  the id of the ui:loadable
 * @param varName  the name of the variable to set
 * @param resourceURI  the URI of the resource
 */
swa.loadWithResource = function(loadId, varName, resourceURI) {
    var params = {};
    params[varName] = '<' + resourceURI + '>';
    swa.load(loadId, params);
};




// PRIVATE UNSTABLE API follows -----------------------------------------------

// Global index that is incremented at each addRow operation
swa.addRowIndex = 0;


// Renames the name2 attribute to name to reactivate it for form submission
swa.activateHiddenFields = function(groupId) {
    $(".swa-group-" + groupId).each(function(index, node) {
        $(node).attr("name", $(node).attr("name2"));
        $(node).removeAttr("name2");
    });
};


// Renames the name attribute to name2 to deactivate it for form submission
swa.deactivateHiddenFields = function(groupId) {
    $(".swa-group-" + groupId).each(function(index, node) {
        $(node).attr("name2", $(node).attr("name"));
        $(node).removeAttr("name");
    });
};


// Helper function called when the user clicks the Add button on a property marked as swa:blankNodeProperty
swa.addBlankNodeObjectEditorRow = function(queryGraphURI, bodyId, single, subjectURI, predicateURI, appName) {
    var params = {
            _base : queryGraphURI,
            _snippet : true,
            _viewClass : 'swa:ObjectEditorRow',
            predicate : '<' + predicateURI + '>',
            subject : '<' + subjectURI + '>'
    };
    if(appName) {
        params["_contextswaAppName"] = '"' + appName + '"';
    }
    $.get(swa.servlet, params, function(data) {
        $('#' + bodyId).append(data);
        if(single) {
            $('#' + bodyId).prev().find('.swa-add-button-div').each(function(i,item) {
                $(item).addClass('swa-display-none');
                $(item).removeClass('swa-icon');
            });
        }
    });
};


// Helper function used to either insert a new row to either an object widget or a subject widget.
swa.addEditorRow = function(queryGraphURI, bodyId, single, viewClass, predicateURI, params, appName) {
    params._base = queryGraphURI;
    params._snippet = true;
    params._viewClass = viewClass;
    params.predicate = '<' + predicateURI + '>';
    if(appName && appName != '') {
        params['_contextswaAppName'] = '"' + appName + '"';
    }
    $.get(swa.server + swa.servlet, params, function(data) {
        $('#' + bodyId).append(data);
        if(single) {
            $('#' + bodyId).parent().parent().find('.swa-add-button-div').each(function(i,item) {
                $(item).addClass('swa-display-none');
                $(item).removeClass('swa-icon');
            });
        }
    });
};


swa.addGridButton = function(gridId, pagerId, options) {
    $("#" + gridId).jqGrid("navButtonAdd", "#" + pagerId, options);
    $("#" + gridId).jqGrid("navButtonAdd", "#" + gridId + "_toppager", options);
};


/**
 * Called when the user adds a new row to an object widget.
 * @param queryGraphURI  the query graph URI
 * @param bodyId  the id of the widget's body
 * @param single  true to disable the add button when done
 * @param subjectURI  the URI of the subject
 * @param predicateURI  the URI of the predicate
 * @param appName  the current app name (optional)
 * @param editWidgetURI  the URI of the declared arg:editWidget (optional)
 */
swa.addObjectEditorRow = function(queryGraphURI, bodyId, single, subjectURI, predicateURI, appName, editWidgetURI) {
    var params = {
            subject : '<' + subjectURI + '>'
    };
    if(editWidgetURI && editWidgetURI != '') {
        params['_contexteditWidget'] = '<' + editWidgetURI + '>';
    }
    swa.addEditorRow(queryGraphURI, bodyId, single, 'swa:ObjectEditorRow', predicateURI, params, appName);
};


// Helper of swa:AddPropertyBox
swa.addPropertyToSearchForm = function(id, propertyURI) {
    var loadable = $('#' + id + '-object');
    var uistate = loadable.attr('uistate');
    var params = uistate + '&_snippet=true&addProperty=<' + escape(propertyURI) + '>';
    $.get(swa.servlet, params, function(data) {
        loadable.append(data);
        swa.load(id);
    });
};


/**
 * Called when the user adds a new row to a subject widget.
 * @param queryGraphURI  the query graph URI
 * @param bodyId  the id of the widget's body
 * @param single  true to disable the add button when done
 * @param objectURI  the URI of the object
 * @param predicateURI  the URI of the predicate
 * @param appName  the current app name (optional)
 * @param editWidgetURI  the URI of the declared arg:editWidget (optional)
 */
swa.addSubjectEditorRow = function(queryGraphURI, bodyId, single, objectURI, predicateURI, appName, editWidgetURI) {
    var params = {
            object : '<' + objectURI + '>'
    };
    if(editWidgetURI && editWidgetURI != '') {
        params['_contexteditWidget'] = '<' + editWidgetURI + '>';
    }
    swa.addEditorRow(queryGraphURI, bodyId, single, 'swa:SubjectEditorRow', predicateURI, params, appName);
};


swa.browserCompatibilityMessage = "Your browser may be incompatible with this product.  Please check TopBraid Supported Platforms for supported browser versions.";


/**
 * Calls an edit handler and updates the UI to reflect the changes.
 * @param handlerName  the qname of the handler (becomes _viewClass)
 * @param params  arguments for the call - note this will be modified
 * @param errorCallback  an optional callback with one argument for error handling
 * @param progressTitle  an optional title for a progress dialog
 * @param urlParams  optional URL-encoded parameters to send to the server
 * @param callback  an optional callback when everything went normal
 * @returns  jqxhr promise object
 */
swa.callHandler = function(handlerName, params, errorCallback, progressTitle, urlParams, callback) {

    var successCallback = callback;

    params['_base'] = swa.queryGraphURI;
    params['_format'] = 'json';
    params['_snippet'] = true;
    params['_viewClass'] = handlerName;

    if (swa.server != '') {
        params['_server'] = escape(swa.server);
    }

    if (progressTitle) {
        var progressId = 'swa-progress-' + Math.random();
        params['_progressId'] = progressId;
        swa.openProgressMonitorDialog(progressId, progressTitle);
    }

    var serverURL = swa.server + swa.servlet;

    if (urlParams && urlParams != "") {
        serverURL += "?" + urlParams;
    }

    var $jqxhr = $.ajax({
        'url': serverURL,
        'method': 'get',
        'data': params
    });

    $.when(
    	$jqxhr
    ).done(function (data, textStatus, jqXHR) {
        swa.processEdits(data);

        if (successCallback) {
            successCallback();
        }

    }).fail(function (jqXHR, textStatus, errorThrown) {
        if (errorCallback) {
            errorCallback(errorThrown);
        }
        else {
            alert('Operation failed: ' + errorThrown);
        }
    });

    return $jqxhr;
};


/**
 * Executes a SPARQLMotion script on the server.
 * The script must be globally registered (using an .sms. file).
 * @param script  the qname of the script
 * @param params  the parameters
 * @param callback  a JavaScript expression that shall be executed when the script
 *                  finishes.  Can access the result of the script with the variable 'data'.
 */
swa.callSPARQLMotionScript = function(script, params, callback) {
    params['id'] = script;
    if(!params['_base'] && swa.queryGraphURI) {
        params['_base'] = swa.queryGraphURI;
    }
    $.get('sparqlmotion', params, function(data) {
        if(callback) {
            eval(callback);
        }
    });
};


// Used to determine if a change contains a new root-level object
// that requires a full tree refresh.
swa.changeRequiresTreeRefresh = function(change, treeId) {
    if(change.metadata && change.metadata.createdResource) {
        var property = $("#" + treeId).attr("swagenerictreeproperty");
        var inverse = $("#" + treeId).attr("swagenerictreeinverse");
        var resource = change.metadata.createdResource;
        if(inverse == "true") {
            var cs = change.changes[resource][property];
            if(cs) {
                return false;
            }
            else {
                return true;
            }
        }
        else {
            // Check if any parent points to the created resource
            for(var subjectURI in change.changes) {
                var cs = change.changes[subjectURI];
                if(cs[property] && $.inArray(resource, cs[property]) >= 0) {
                    return false;
                }
            }
            return true;
        }
    }
    else {
        // Check if any root node was deleted
        if(change.changes) {
            for(var subjectURI in change.changes) {
                var c = change.changes[subjectURI];
                if(c["-http://www.w3.org/1999/02/22-rdf-syntax-ns#type"]) {
                    var roots = $("#" + treeId).children("ul").children("li").filter('[resource="' + subjectURI + '"]');
                    if(roots.length) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
};

/**
 * Collect the resources that need to be deleted - loaded through a ui:loadable
 * @param  {String} the predicate URI
 * @param  subjectChanges  {Object} information regarding the nature of the change
 * @param  treeId  {String} the id of the tree being acted on
 * @param  nodeIds  {Object}
 */
swa.collectChangesForClassTree = function(change, treeId, nodeIds) {

    for (var subjectURI in change.changes) {
        var subjectChanges = change.changes[subjectURI];

        // Changed rdfs:subClassOf triples
        swa.collectAddedTreeNodes(rdfs.subClassOf, subjectChanges, treeId, nodeIds);
        swa.collectDeletedTreeNodes(rdfs.subClassOf, subjectChanges, treeId, nodeIds);
    }
};

/**
 * Collect the resources that need to be added
 * @param  predicateURI  {String} the predicate URI
 * @param  subjectChanges  {Object} information regarding the nature of the change
 * @param  treeId  {String} the id of the tree being acted on
 * @param  nodeIds  {Object}  the target object to add the IDs to (key=id, value=true)
 */
swa.collectAddedTreeNodes = function(predicateURI, subjectChanges, treeId, nodeIds) {

    var $tree = $('#' + treeId),
        added = subjectChanges[predicateURI],
        objectKey,
        objectURI,
        id;

    if (added) {

        for (objectKey in added) {

            objectURI = added[objectKey];

            $tree.find('li[data-resource="' + objectURI + '"]').each(function(index, node) {
                id = $(node).attr('id');
                nodeIds[id] = true;
            });
        }

        // This was wrong: this function is supposed to collect the values only, not do the actual update
        /* ensure there is something to refresh before calling refreshTreeNodes
        if (Object.keys(nodeIds).length > 0) {
            swa.refreshTreeNodes(treeId, nodeIds);
        }*/
    }
};


/**
 * Collect the resources that need to be deleted - loaded through a ui:loadable
 * @param  {String} the predicate URI
 * @param  subjectChanges  {Object} information regarding the nature of the change
 * @param  treeId  {String} the id of the tree being acted on
 * @param  nodeIds  {Object}  the target object to add the IDs to (key=id, value=true)
 */
swa.collectDeletedTreeNodes = function(predicateURI, subjectChanges, treeId, nodeIds) {

    var $tree = $('#' + treeId),
        deleted = subjectChanges['-' + predicateURI],
        objectKey,
        objectURI,
        id;

    if (deleted) {

        for (objectKey in deleted) {

            objectURI = deleted[objectKey];

            $tree.find('li[data-resource="' + objectURI + '"]').each(function(index, node) {
                id = $(node).attr('id');
                nodeIds[id] = true;
            });

        }
    }

    // This was wrong: this function is supposed to collect the values only, not do the actual update
    /* ensure there is something to refresh before calling refreshTreeNodes
    if (Object.keys(nodeIds).length > 0) {
        swa.refreshTreeNodes(treeId, nodeIds);
    }*/
};

swa.collectChangedPropertyConstraintTreeNodes = function(subjectURI, subjectChanges, treeId, nodeIds) {

	var propertyURI = "http://www.w3.org/ns/shacl#property";

    var $tree = $('#' + treeId),
        changes = subjectChanges[propertyURI],
        id;

    if(!changes) {
        changes = subjectChanges["-" + propertyURI];
    }

    if (changes) {

    	$tree.find('li[data-resource="' + subjectURI + '"]').each(function(index, node) {
            id = $(node).attr('id');
            nodeIds[id] = true;
        });

        /* ensure there is something to refresh before calling refreshTreeNodes
        if (Object.keys(nodeIds).length > 0) {
            swa.reloadTreeNodes(treeId, nodeIds);
        }*/
    }
};


swa.collectChangesForGenericTree = function(change, treeId, nodeIds) {

    var property = $("#" + treeId).attr("swagenerictreeproperty");
    var inverse = $("#" + treeId).attr("swagenerictreeinverse");

    for(var subjectURI in change.changes) {
        var subjectChanges = change.changes[subjectURI];

        if(inverse == "true") {
            swa.collectAddedTreeNodes(property, subjectChanges, treeId, nodeIds);
            swa.collectDeletedTreeNodes(property, subjectChanges, treeId, nodeIds);
        }
        else {

            var added = subjectChanges[property];
            if(added) {
                $('#' + treeId).find('li[data-resource="' + subjectURI + '"]').each(function(index, node) {
                    var id = $(node).attr('id');
                    nodeIds[id] = true;
                });
            }

            var deleted = subjectChanges["-" + property];
            if(deleted) {
                $('#' + treeId).find('li[data-resource="' + subjectURI + '"]').each(function(index, node) {
                    var id = $(node).attr('id');
                    nodeIds[id] = true;
                });
            }
        }
    }
};


/**
 * Programmatically closes and destroys the elements of a dialog that was previously
 * loaded through a ui:loadable.
 * @param loadId  the id of the loadable surrounding the dialog
 */
swa.closeDialog = function(loadId) {
    var div = $('#div-' + loadId);
    div.dialog("destroy");
    div.remove();
};


/**
 * Closes the currently open progress monitor dialog, if it exists.
 */
swa.closeProgressMonitorDialog = function() {
    if(swa.progressMonitorDialog) {
    	swa.progressMonitorDialog.programmatically = true;
        swa.progressMonitorDialog.dialog('close');
        swa.progressMonitorDialog = null;
    }
};


swa.clickKeyPropertyBox = function(id, hideCount) {
    var button = $("#" + id);
    var items = {
        "unchecked" : {
            name : "Do not show as column",
            icon : "unchecked",
            callback : function() {
                button.removeClass("swa-key-property-checked");
                button.removeClass("swa-key-property-count");
                button.addClass("swa-key-property-unchecked");
            }
        },
        "check" : {
            name : "Show as column",
            icon : "checked",
            callback : function() {
                button.addClass("swa-key-property-checked");
                button.removeClass("swa-key-property-count");
                button.removeClass("swa-key-property-unchecked");
            }
        }
    };
    if(!hideCount) {
        items["count"] = {
            name : "Show as a count column",
            icon : "count",
            callback : function() {
                button.removeClass("swa-key-property-checked");
                button.addClass("swa-key-property-count");
                button.removeClass("swa-key-property-unchecked");
            }
        }
    }
    $.contextMenu({
        items : items,
        selector: "#" + id,
    });
    button.contextMenu(true);
    button.contextMenu();
};


// Used by the swa:EditableGridGadget
swa.createCreateRowButton = function(gridId, resourceType, typeLabel, resourceSelectedEvent) {
    return {
        buttonicon: "swa-icon-create-resource",
        caption: "",
        cursor: "pointer",
        title: "Create " + typeLabel,
        onClickButton: function() {
            var loadId = gridId + "create-dialog";
            var params = {
                callback : "swa.createResource",
                label : "Create " + typeLabel,
                loadId : loadId,
                resourceSelectedEvent : resourceSelectedEvent,
                resourceType : "<" + resourceType + ">"
            };
            swa.loadModalDialog("swa:CreateResourceDialog", loadId, params, 680, 180);
        }
    };
};


// Used by the swa:EditableGridGadget if a custom create handler is present
swa.createCustomCreateRowButton = function(gridId, resourceType, typeLabel, createHandler) {
    return {
        buttonicon: "swa-icon-create-resource",
        caption: "",
        cursor: "pointer",
        title: "Create " + typeLabel,
        onClickButton: function() {
            var params = {
                _viewClass: createHandler,
                _base: swa.queryGraphURI,
                resourceType: '<' + resourceType + '>'
            };
            $.get("swp", params, function(data) {
                if(data.error) {
                    alert("Error: " + data.error);
                }
                else {
                    $("#" + gridId).trigger("reloadGrid");
                    var resourceURI = data.metadata.newResource.substring(1, data.metadata.newResource.length - 1);
                    swa.openEditResourceDialog(resourceURI);
                }
            });
        }
    };
};



// Used by the swa:EditableGridGadget
swa.createDeleteRowsButton = function(gridId, deleteHandler, canDeleteResourceFunction) {
    return {
        buttonicon: "swa-icon-delete-resource",
        caption: "",
        cursor: "pointer",
        position: "last",
        title: "Delete selected row(s)",
        onClickButton: function() {
            var sel = $("#" + gridId).jqGrid("getGridParam", "selarrrow");
            if(sel.length == 0) {
                alert("Please select at least one row.");
            }
            else {
                var list = "";
                for(var i = 0; i < sel.length; i++) {
                    if(list.length > 0) {
                        list += " ";
                    }
                    list += sel[i];
                }
                var params = {
                    _viewClass: "swa:CanDeleteResourcesService",
                    _base: swa.queryGraphURI,
                    resources: list
                };
                if(canDeleteResourceFunction && canDeleteResourceFunction != "") {
                    params['_contextswaCanDeleteResourceFunction'] = "<" + canDeleteResourceFunction + ">";
                }
                $.get("swp", params, function(data) {
                    if(data.error) {
                        alert("Error: " + data.error);
                    }
                    else {
                        if(confirm(data.message + " This will delete " + data.tripleCount + " statements.")) {
                            params["_viewClass"] = deleteHandler;
                            $.get("swp", params, function(data) {
                                if(data.error) {
                                    alert("Error: " + data.error);
                                }
                                else {
                                    swa.reloadGrid(gridId);
                                    for(var i = 0; i < sel.length; i++) {
                                        swa.handleResourceDeleted(sel[i], data);
                                    }
                                }
                            });
                        }
                    }
                });
            }
        }
    };
};


// Used by the swa:EditableGridGadget
swa.createEditRowsButton = function(gridId, resourceType, canDeleteResourceFunction) {
    return {
        buttonicon: "ui-icon-pencil",
        caption: "",
        cursor: "pointer",
        title: "View/Edit selected row(s)",
        onClickButton: function() {
            var resourceURIs = $("#" + gridId).jqGrid("getGridParam", "selarrrow");
            if(resourceURIs.length == 1) {
                var resourceURI = resourceURIs[0];
                swa.openEditResourceDialog(resourceURI);
            }
            else if(resourceURIs.length > 1) {
                var list = "";
                for(var i = 0; i < resourceURIs.length; i++) {
                    if(list.length > 0) {
                        list += " ";
                    }
                    list += resourceURIs[i];
                }
                var params = {
                    _viewClass: "swa:CanDeleteResourcesService",
                    _base: swa.queryGraphURI,
                    resources: list
                };
                if(canDeleteResourceFunction && canDeleteResourceFunction != "") {
                    params['_contextswaCanDeleteResourceFunction'] = "<" + canDeleteResourceFunction + ">";
                }
                $.get("swp", params, function(data) {
                    if(data.error) {
                        alert("Error: " + data.error);
                    }
                    else {
                        swa.openMultiResourceEditDialog(resourceURIs, resourceType);
                    }
                });
            }
        }
    };
};


// Used by the swa:ResultSetGrid
swa.createExportResultSetGridButton = function(data) {
    return {
        buttonicon: "ui-icon ui-icon-disk",
        caption: "",
        cursor: "pointer",
        title: "Export whole table as text",
        onClickButton: function() {
            if(data.length > 0) {
                var table = "";
                var first = data[0];
                for(var key in first) {
                    if(table.length > 0) {
                        table += "\t";
                    }
                    table += key.replace(/\t/g, " ");
                }
                table += "\n";
                for(var i = 0; i < data.length; i++) {
                    var row = data[i];
                    var r = "";
                    for(var key in row) {
                        var value = row[key];
                        if(value == null) {
                            value = "";
                        }
                        if(r.length > 0) {
                            r += "\t";
                        }
                        r += ("" + value).replace(/\t/g, " ");
                    }
                    table += r + "\n";
                }
                window.open(swa.servlet + "?_viewClass=swa:ExportGridCallback&data=" + encodeURIComponent(table));
            }
        }
    };
};


swa.createPropertyConstraint = function(treeId, resourceSelectedEvent) {
    var loadId = 'myCreatePropertyConstraintDialog' + swa.getRunningIndex();
    var params = {
        _base: '<' + swa.queryGraphURI + '>',
        loadId: '"' + loadId + '"'
    };
    var metadata = swa.getSelectedTreeNodeMetadata(treeId);
    if(!metadata) {
        alert("Please select a parent node in the tree");
    }
    else {
        var loadId = 'myParamDialog';
        var params = {
            _base: swa.queryGraphURI,
            loadId: loadId,
            resourceSelectedEvent: resourceSelectedEvent
        };
        if(metadata == "Class" || metadata == "Shape") {
            params.shape = swa.getSelectedTreeResource(treeId);
        }
        else {
            params.shape = swa.getSelectedTreeParentResource(treeId);
            params.predicate = swa.getSelectedTreeResource(treeId);
        }
        swa.loadModalDialog('swa:CreatePropertyConstraintDialog', loadId, params, 400, 180);
    }
};


swa.createPropertyConstraintWorker = function(shapeURI, predicate, blankNode, resourceSelectedEvent) {
    var params = {
        _base : swa.queryGraphURI,
        _viewClass : "swa:CreatePropertyConstraintService",
        blankNode : blankNode,
        predicate : predicate,
        shape : "<" + shapeURI + ">"
    };

    $.get(swa.servlet, params, function(data) {
        if(data.error) {
            alert('Operation failed: ' + data.error);
        }
        else {
            swa.processEdits(data, true);
            var resourceURI = data.metadata.createdResource;
            gadgets.Hub.publish(resourceSelectedEvent, resourceURI);
        }
    });
}


/**
 * Called when the dialog opened by a CreateResourceButton is OKed.
 * @param typeURI  the URI of the class to instantiate
 * @param resourceURI  the URI of the resource to create
 * @param label  the label of the new resource
 * @param labelLang  the (optional) language of the label
 * @param handlerURI  the URI of the create handler (SWP view class) to call on completion
 * @param contextResourceURI  an optional URI such as superclass, passed to the web service
 * @param resourceSelectedEvent  the name of an optional event to publish the new URI under when done
 * @param contextHolderId  the id of a DOM element that has an attribute "swacontext" that shall
 *                         be sent to the server too (needed for example by generic tree)
 */
swa.createResource = function(typeURI, resourceURI, label, labelLang, contextResourceURI, handlerURI, resourceSelectedEvent, contextHolderId) {
    if(typeURI.indexOf("-") == 0) {
        typeURI = typeURI.substring(1);
    }
    swa.createResourceHelper(typeURI, resourceURI, label, labelLang, contextResourceURI, handlerURI, resourceSelectedEvent, null, contextHolderId);
};


swa.createResourceHelper = function(typeURI, resourceURI, label, labelLang, contextResourceURI, handlerURI, resourceSelectedEvent, andThen, contextHolderId) {
    var metadata = {
        createdResource : resourceURI
    };
    var params = {
            'metadata' : JSON.stringify(metadata),
            'resourceType' : '<' + typeURI + '>',
            'uri' : '"' + resourceURI + '"',
            'labelLang' : labelLang
    };
    if(label && label.length > 0) {
        params.label = '"' + label + '"^^<http://www.w3.org/2001/XMLSchema#string>';
    }
    if(contextResourceURI) {
        params.contextResource = '<' + contextResourceURI + '>'
    }
    params['_base'] = swa.queryGraphURI;
    params['_format'] = 'json';
    params['_snippet'] = true;
    params['_viewClass'] = handlerURI ? handlerURI : "swa:CreateResourceHandler";

    var servletURL = swa.servlet;
    if(contextHolderId) {
        var ctx = $("#" + contextHolderId).attr("swacontext");
        if(ctx && ctx != "") {
            servletURL += "?" + ctx;
        }
    }

    $.get(servletURL, params, function(data) {
        if(data.error) {
            alert('Operation failed: ' + data.error);
        }
        else if(data.validationResults) {
            var msg = "Constraint violations.";
            alert(msg);
        }
        else {
            if(andThen) {
                andThen(resourceURI, data);
            }
            else {
                swa.processEdits(data, true);
            }
            if(resourceSelectedEvent) {
                swa.refreshTree();
                gadgets.Hub.publish(resourceSelectedEvent, resourceURI);
            }
        }
    });
};


/**
 * Called when the user clicks the Delete button on an editable form to confirm deletion of n triples.
 * @param resourceURI  the URI of the resource to delete
 */
swa.deleteResource = function(resourceURI) {

    var progressId = 'swa-delete-collect' + Math.random();
    swa.openProgressMonitorDialog(progressId, 'Collecting deletable statements for ' + resourceURI);

    // Call confirm handler
    var params = {
        _base : swa.queryGraphURI,
        _format : 'json',
        _progressId : progressId,
        _snippet : true,
        _viewClass : 'swa:ConfirmDeleteResourceHandler',
        resource : '<' + resourceURI + '>'
    };

    $.ajax({
        'url': swa.server + swa.servlet,
        'method': 'post',
        'data': params,
        'success': function (data, textStatus, jqXHR) {
            if (confirm(data.message + " This will delete " + data.tripleCount + " statements.")) {
                swa.closeProgressMonitorDialog();
                swa.actuallyDeleteResource(resourceURI);
            } else {
                swa.closeProgressMonitorDialog();
            }
        },
        'error': function (jqXHR, textStatus, errorThrown) {
            console.log(errorThrown);
        }
    });

};

/**
 * Called once a user confirms the deletion warning on an editable form.
 * @param resourceURI  the URI of the resource to delete
 */
swa.actuallyDeleteResource = function (resourceURI) {

    var progressId2 = 'swa-delete-resource' + Math.random();

    // Execute the actual deletion if confirmed
    var params2 = {
        _base : swa.queryGraphURI,
        _format : 'json',
        _progressId : progressId2,
        _snippet : true,
        _viewClass : 'swa:DeleteResourceHandler',
        resource : '<' + resourceURI + '>'
    };

    var $deletePromise = $.ajax({
        'url': swa.server + swa.servlet,
        'data': params2,
        'method': 'post',
        'success': function (data, textStatus, jqXHR) {
            swa.closeProgressMonitorDialog();
            swa.handleResourceDeleted(resourceURI, data);
        },
        'error': function (jqXHR, textStatus, errorThrown) {
            alert(errorThrown);
        }
    });

    swa.openProgressMonitorDialog(progressId2, 'Deleting statements for ' + resourceURI);

    $.when(
        $deletePromise
    ).done(function (data, textStatus, jqXHR) {
        swa.removeDeletedNodeFromVisibleTree(resourceURI);
        alert('Delete Successful');
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log(errorThrown);
    });

};

/**
 * Removes a node from a tree. This only updates the UI and does not actually delete the
 * node from a graph. Use swa.deleteResource for that instead
 * @param resourceURI  the URI of the resource to delete
 */
swa.removeDeletedNodeFromVisibleTree = function (resourceURI) {
    var $visibleTree = $('[treedataprovider]:visible'),
        $visibleJsTree = $visibleTree.jstree(true),
        nodeId = $visibleTree.find('li[data-resource="' + resourceURI + '"]').attr('id');

    if ($visibleJsTree !== false) {
        $visibleJsTree.delete_node(nodeId);
    }

};

/**
 * Called when the user clicks delete to delete a row from a widget.
 * This completely deletes the element with the given id.
 * The hidden fields to instruct the server that the given object
 * shall be deleted are kept, and moved under the parent of the row.
 * The function also makes sure that the add button is visible.
 * @param id  the id of the element to delete
 */
swa.deleteRow = function(id) {
    var row = $('#' + id);

    var pp = row.parent().parent().parent();
    pp.find('.swa-add-button-div').each(function(index, item) {
        $(item).removeClass('swa-display-none');
        $(item).addClass('swa-icon');
    });

    row.find('.swa-editor-hidden-field').appendTo(row.parent());
    row.remove();
};


/**
 * Makes a server callback to invoke ui:deleteSessionGraph for the given graph.
 * @param graphURI  the URI of the session graph to delete
 */
swa.deleteSessionGraph = function(graphURI) {
    var params = {
        _viewClass : 'swa:DeleteSessionGraphService',
        sessionGraph : '<' + graphURI + '>'
    };
    $.get(swa.servlet, params);
};


/**
 * Helper function similar to String.endsWith in Java.
 * @param str  the string to search in
 * @param suffix  the expected end
 * @returns true if str ends with suffix
 */
swa.endsWith = function(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};


/**
 * Called when the user executes a template call from the swa:TemplateCallDialog.
 * @param loadId  the loadId surrounding the form
 * @param templateGraphURI  the URI of the graph containing the template's definition
 */
swa.executeTemplateCall = function(loadId, templateGraphURI) {
    var formId = loadId + '-form';
    var params = {};
    $.each($('#' + formId).serializeArray(), function(_, kv) {
        params[kv.name] = kv.value;
    });
    //params['_base'] = ''; // 'http://uispin.org/ui#graph';
    $.post(swa.server + swa.servletURL('swpCreateParams'), params, function(data) {
        if(data && data.validationResults) {
            swa.updateFormErrors($('#' + formId), data.validationResults);
            swa.openSimpleValidationResultsDialog(data);
        }
        else {
            swa.updateFormErrors($('#' + formId), []);
            data.template = data.type;
            data.templateGraph = '<' + templateGraphURI + '>';
            delete data.type;
            swa.load(loadId + '-results', data);
        }
    });
};


/**
 * Called when the user executes a ResourceAction that does not have an onSelect
 * action but is declared as SWP element instead.
 * @param handlerName  the qname of the handler (ResourceAction)
 * @param resourceURI  the URI of the concept to clone
 */
swa.executeSWPResourceAction = function(handlerName, resourceURI) {
    swa.callHandler(handlerName, { resource : '<' + resourceURI + '>' });
};


/**
 * Runs the SPARQL query behind the Search form and produces a textual format.
 * @param formId  the id of the search form
 * @param searchGraph  the URI of the session graph to hold the RDF search
 * @param format  'csv', 'tsv', 'xml' or 'json'
 */
swa.exportSearchResults = function(formId, searchGraph, format) {
    var form = $('#' + formId);
    var params = swa.getSearchParamsFromForm(formId);
    params += "&searchGraph=" + searchGraph;
    $.ajax({
        'url': swa.servletURL('createSearchRDF'),
        'method': 'post',
        'dataType': 'text',
        'data': params,
        'success': function (data, textStatus, jqXHR) {
            // console.log('successful post');
            // console.log(data);
        },
        'error': function (jqXHR, textStatus, errorThrown) {
            console.log(errorThrown);
            // handle the error here...
        }
    });
    window.open(swa.server + 'getSearchResults?_format=' + format + '&' + params, '_blank');
};


swa.formHasDirtyFields = function(formId) {
    var dirtyFields = $('#'+formId).find('.swa-auto-complete-dirty');
    return dirtyFields.length > 0;
};


swa.getCookie = function(key, defaultValue) {
    var value = $.cookie(key);
    if(value != null) {
        return value;
    }
    else {
        return defaultValue;
    }
};


/**
 * Gets the URI of the resource currently displayed by a given form.
 * This uses a 'magic' attribute at the form's HTML element.
 * @param formId  the id of the form
 * @return the resource
 */
swa.getFormResourceURI = function(formId) {
    return $('#' + formId).attr('resource');
};


/**
 * Returns the current data item for given grid row.
 * @param gridObject  the grid object
 * @param rowId  the id of the row
 * @returns the data item
 */
swa.getGridDataItem = function(gridObject, rowId) {
    var page = $(gridObject).jqGrid('getGridParam', 'page');
    var rowsPerPage = $(gridObject).jqGrid('getGridParam', 'rowNum');
    var dataIndex = parseInt((page - 1) * rowsPerPage) + parseInt(rowId) - 1;
    var data = $(gridObject).jqGrid('getGridParam', 'data');
    return data[dataIndex];
};


/**
 * Gets all properties that are already used as widgets on a given form.
 * @param form  a jQuery form object
 * @returns an associative array in which the keys are the property URIs, values: true
 */
swa.getPropertiesUsedOnForm = function(form) {
    var result = {};
    form.find(".swa-property-label").each(function(index, element) {
        var id = $(element).attr('id');
        if(id && id.indexOf('property-label-') == 0) {
            var uri = id.substring(15);
            result[uri] = true;
        }
    });
    return result;
};


swa.getRunningIndex = function() {
    return swa.templateCallDialogCounter++;
};


swa.getSearchFormTypeSelect = function(formId) {
    return $("#" + formId).closest(".swa-window").find(".swa-search-form-type-select");
};


/**
 * Gets the string of parameters sent to the server when the user hits Search.
 * The algorithm eliminates fields that are not filled out, and their dependants.
 * @param formId  the id of the form to get the parameters from
 * @returns the param string
 */
swa.getSearchParamsFromForm = function(formId) {
    var form = $('#' + formId);
    var pairs = form.serializeArray();

    // Collect a set of all facets without a value
    var emptyIds = {};
    $.each(pairs, function() {
        if(this.value == undefined || this.value == '') {
            if(this.name.indexOf('regex') == 0 || this.name.indexOf('value') == 0) {
                emptyIds[this.name.substring(5)] = true;
            }
            else if(this.name.indexOf('contains') == 0) {
                emptyIds[this.name.substring(8)] = true;
            }
            else if(this.name.indexOf('min') == 0) {
                if(!swa.pairExists(pairs, 'max' + this.name.substring(3))) {
                    emptyIds[this.name.substring(3)] = true;
                }
            }
        }
    });

    // Build params string, dropping those entries related to the empty facets from above
    var params = "";
    var serialized = form.serialize();
    var split = serialized.split('&');
    split.forEach(function(entry) {
        var equals = entry.indexOf("=");
        if(equals > 0) {
            var varName = entry.substring(0, equals);
            var index = varName.indexOf('uniqueId');
            if(index <= 0 || !emptyIds[varName.substring(index)]) {
                if(params.length > 0) {
                    params += "&";
                }
                params += entry;
            }
        }
        else {
            // I don't think this can happen
            params += "&" + entry;
        }
    });

    // Append key properties from check boxes
    var keyPropertiesList = '';
    var index = 0;
    $.each(form.find('.swa-key-property-input'), function(idx, element) {
        if($(element).hasClass('swa-key-property-checked') || $(element).hasClass('swa-key-property-count')) {
            var value = $(element).attr('value');
            var subVar = $($(element).closest('.swa-nested-form')).attr('name');
            if(subVar == undefined) {
                params += '&keyProperty' + index + '=' + escape(value);;
            } else {
                params += '&keyProperty' + index + '=' + subVar + "~" + escape(value);
            }

            //if(index > 0) {
            //  keyPropertiesList += ' ';
            //}
            //keyPropertiesList += value;
            if($(element).hasClass('swa-key-property-count')) {
                params += "&keyProperty" + index + "Type=count";
            }
            index++;
        }
    });
    if(keyPropertiesList.length == 0) {
        $.each(form.find('.swaKeyPropertyHiddenField'), function(index, value) {
            var value = $(value).attr('value');
            if(keyPropertiesList.length > 0) {
                keyPropertiesList += ' ';
            }
            keyPropertiesList += value;
        });
    }
    if(keyPropertiesList.length > 0) {
        params += '&keyPropertiesList=' + escape(keyPropertiesList);
    }

    return params;

};


/**
 * Private low-level function to access the selected tree node
 * This seems to have changed in jsTree, now returning an array
 * @param {Object} tree  the tree element in a jQuery wrapper
 * @returns {String} the selected tree node's id or null
 */
swa.getSelectedTreeNode = function(tree) {
    var sel = tree.jstree(true).get_selected();
    return (sel.length > 0) ? sel[0] : null;
};

/**
 * Gets the metadata property from a selected node in a jstree for example "Class"
 * @param {String} treeId  the id of the tree
 * @returns {String} the node type or null
 */
swa.getSelectedTreeNodeMetadata = function(treeId) {
    var selectedNode = $('#' + treeId).jstree(true).get_selected(true)[0];
    return (selectedNode) ? selectedNode.data.metadata : null;
};


/**
 * Gets the URI of the parent of the currently selected resource in a given tree.
 * @param treeId  the id of the tree
 * @returns the URI or null if nothing is selected
 */
swa.getSelectedTreeParentResource = function(treeId) {

    var $tree = $('#' + treeId);
    var nodeURI = swa.getSelectedTreeNode($tree);
    var $selectedTreeNode = $tree.jstree(true).get_node(nodeURI);
    var parentId = $selectedTreeNode.parent;
    var parentNode = $tree.jstree(true).get_node(parentId);
    var selectedTreeNodeParentURI = parentNode.data.resource;

    return (selectedTreeNodeParentURI) ? selectedTreeNodeParentURI : null;
};


swa.pairExists = function(pairs, name) {
    for(var key in pairs) {
        var object = pairs[key];
        if(object.name == name && object.value && object.value != "") {
            return true;
        }
    }
    return false;
};

/**
 * Same as swa.getStorageValue, but casts the result into a Number if available.
 */
swa.getStorageNumber = function(key, defaultValue) {
    var value = swa.getStorageValue(key, defaultValue);
    if(value != null) {
        return Number(value);
    }
    else {
        return null;
    }
};


/**
 * Retrieves a value from the browser's localStorage.
 * See swa.setStorageValue for the reverse direction.
 * @param key  the key
 * @value defaultValue  the value to return as default
 */
swa.getStorageValue = function(key, defaultValue) {
    var value;
    if(localStorage) {
        value = localStorage.getItem(key);
    }
    else {
        value = $.cookie(key);
    }
    if(value == null) {
        return defaultValue;
    }
    else {
        return value;
    }
};


/**
 * @deprecated use swa.collectAddedTreeNodes combined with swa.refreshTreeNodes
 */
swa.handleAddedTreeNodes = function(predicateURI, subjectChanges, treeId) {
    var resultIds = {};
    swa.collectAddedTreeNodes(predicateURI, subjectChanges, treeId, resultIds);
    swa.refreshTreeNodes(treeId, resultIds);
};


/**
 * Called to update a class/property tree when a change event has been published.
 * @param change  the data object describing the change
 * @param treeId  the id of the tree to update
 */
swa.handleChangeForClassPropertyTree = function(change, treeId) {

    // exit if this tree isn't in view
    if ($('#' + treeId).is(':hidden')) {
        return;
    }

    swa.updateTreeLabels(treeId, change);

    var nodeIds = {};

    // Handle rdfs:subClassOf triples like the class tree does
    swa.collectChangesForClassTree(change, treeId, nodeIds);

    for(var subjectURI in change.changes) {
        var subjectChanges = change.changes[subjectURI];

        // Changed rdfs:domain triples
        swa.collectAddedTreeNodes(rdfs.domain, subjectChanges, treeId, nodeIds);
        swa.collectDeletedTreeNodes(rdfs.domain, subjectChanges, treeId, nodeIds);

        // Changed sh:property triples
        swa.collectChangedPropertyConstraintTreeNodes(subjectURI, subjectChanges, treeId, nodeIds);

        // Update all that have changed a SPIN constraint (might be a primary key)
        if(subjectChanges[spin.constraint] || subjectChanges["-" + spin.constraint]) {
            $('#' + treeId).find('li[data-resource="' + subjectURI + '"]').each(function(index, node) {
                var id = $(node).attr('id');
                nodeIds[id] = true;
            });
        }
    }

    swa.refreshTreeNodes(treeId, nodeIds);
};


/**
 * Called to update a class tree when a change event has been published.
 * @param change  the data object describing the change
 * @param treeId  the id of the tree to update
 */
swa.handleChangeForClassTree = function(change, treeId) {
    swa.updateTreeLabels(treeId, change);
    var nodeIds = {};
    swa.collectChangesForClassTree(change, treeId, nodeIds);
    swa.refreshTreeNodes(treeId, nodeIds);
};


/**
 * Called to update a generic tree when a change event has been published.
 * @param change  the data object describing the change
 * @param treeId  the id of the tree to update
 */
swa.handleChangeForGenericTree = function(change, treeId) {

    // Refresh all if a new resource was created that doesn't have a value for
    // the relationship shown in the tree
    if(swa.changeRequiresTreeRefresh(change, treeId)) {
        swa.refreshTree(treeId);
        return;
    }

    // Handle any other edits
    swa.updateTreeLabels(treeId, change);
    var nodeIds = {};
    swa.collectChangesForGenericTree(change, treeId, nodeIds);
    swa.refreshTreeNodes(treeId, nodeIds);
};


/**
 * Called to reload a grid if a change event has one of the displayed row
 * resources as its subject, or if a new resource been created.
 * @param change  the data object describing the change
 * @param gridId  the id of the grid to update
 */
swa.handleChangeForGrid = function(change, gridId) {

    // Check if a new resource has been added
    if(change.metadata && change.metadata.createdResource) {
        swa.reloadGrid(gridId);
        return;
    }

    // Check if one of the subjects is listed in the table
    var rowIds = $("#" + gridId).jqGrid("getDataIDs");
    for(var subjectURI in change.changes) {
        if($.inArray(subjectURI, rowIds) >= 0) {
            swa.reloadGrid(gridId);
            return;
        }
    }
};


/**
 * Handles a change to see if a given InstancesGridGadget needs to be reloaded.
 * The whole grid is reloaded if a new instance of the type or its sub-classes has
 * been created or deleted (as indicated by changes to rdf:type triples).
 * Future versions of this function could be smarter and only do partial updates
 * if labels have changed etc.
 * @param change  the change data object
 * @param resourceTypeURI  the URI of the type of instances being displayed
 * @param loadId  the loadable to reload
 */
swa.handleChangeForInstancesGrid = function(change, resourceTypeURI, loadId) {

    // Collect objects of all rdf:type triples that were added or deleted
    var types = {};
    for(var subjectURI in change.changes) {
        var subjectChanges = change.changes[subjectURI];
        var added = subjectChanges[rdf.type];
        if(added) {
            for(var objectKey in added) {
                var objectURI = added[objectKey];
                types[objectURI] = true;
            }
        }
        var deleted = subjectChanges["-" + rdf.type];
        if(deleted) {
            for(var objectKey in deleted) {
                var objectURI = deleted[objectKey];
                types[objectURI] = true;
            }
        }
    }

    // Concatenate those types into a long, space-separated string
    var typesList = "";
    for(var type in types) {
        typesList += " " + type;
    }

    if(typesList.length > 0) {

        // Ask server if any of those types is a subclass of resourceType
        var params = {
            _base : swa.queryGraphURI,
            _template : 'http://topbraid.org/swa#TypesHaveSuperClass',
            resourceType : resourceTypeURI,
            typesList : typesList.substring(1) // Ignore first ' '
        }
        $.post('template', params, function(data) {
            if(data['boolean'] == true) {
                swa.loadWithResource(loadId, 'resourceType', resourceTypeURI);
            }
        });
    }
};


/**
 * A helper that can be called from tree change handlers.
 * In a typical scenario, handlers walk through a change object to collect
 * all nodes that need refreshing.  Then it triggers a refresh.
 * @param change  the change object from the server
 * @param treeId  the tree id
 * @param nodeIds  the collection of node ids to refresh
 */
swa.handleChangeForTreeHelper = function(change, treeId, nodeIds) {

	// TODO: This function can likely be deleted

    var numChanges = 0;

    for (i in nodeIds) {
        numChanges++;
    }

    if (numChanges > 0) {
    	swa.refreshTreeNodes(treeId, nodeIds);
    }
};


/**
 * Called to trigger a reload of the form if one of the changes contains
 * the currently displayed resource of the form.
 * @param change  the data object describing the change
 * @param formId  the id of the form
 * @param windowId  the id of the surrounding window
 */
swa.handleChangeForSwitchableFormGadget = function(change, formId, windowId) {

    if ($('#' + formId).is(':hidden')) {
        return;
    }

    if(!change['formAlreadyReloaded-' + formId]) { // Don't do anything if the event was triggered by Save Changes button

        var resourceURI = swa.getFormResourceURI(formId);
        if(change.changes && change.changes[resourceURI]) { // If we have any change on the current subject
            swa.switchToViewForm(formId); // Trigger a reload
        }
        else {
            // Refresh any affected swa:NestedObjectViewers (after Revert operations in History mode)
            for(var subjectURI in change.changes) {
                if(subjectURI.indexOf("@") == 0) {
                    $(".swa-nested-object-viewer").each(function() {
                        if($(this).attr("blanknodeid") == "<" + subjectURI + ">") {
                            swa.load($(this).attr("id"));
                        }
                    });
                }
            }
        }

        if(change.metadata && change.metadata.createdResource) {
            var resourceURI = change.metadata.createdResource;
            if(resourceURI.indexOf("<") != 0) {
                resourceURI = "<" + resourceURI + ">";
            }
            // Reload form's window in editing mode
            var params = {
                editing : true,
                resource : resourceURI
            };
            swa.load(windowId, params);
        }
    }
};


/**
 * Used by ui:handle - do not call directly.
 * @param parentId  the id of the 'parent' node
 * @param uistate  the state of the UI
 * @param thenLoadId  the optional value of ui:thenLoadId
 */
swa.handleEvent = function(parentId, uistate, thenLoadId) {
    var params = uistate + '&_snippet=true';
    var parent = $('#' + parentId);
    var callback = null;
    if(thenLoadId) {
        callback = function() {
            swa.load(thenLoadId);
        };
    }
    parent.load(swa.server + swa.servlet, params, callback);
};


swa.handleResourceDeleted = function(resourceURI, data) {
    swa.processEdits(data);
};


/**
 * Generates a properly escaped selector for an id.
 * Note: unclear if this works, see http://mothereff.in/css-escapes#search_form%3Aexpression
 * @param str  the id of the element to escape
 * @returns the escaped Id, starting with '#'
 */
swa.idSelector = function(str) {
    return '#' + str.replace(/(:|\.)/g,'\\$1');
}


/**
 * Turns an input element with a given id into a jQuery auto-complete.
 * The actually selected resource will be returned to the server with
 * a hidden field that needs to be passed into this function as well.
 * @param id  the id of the visible input element
 * @param hiddenId  the id of the hidden field
 * @param link  the link for the server callback
 * @param onSelect  an optional handler if selected
 */
swa.initAutoComplete = function(id, hiddenId, link, onSelect) {

    link = swa.redirectLink(link);

    $('#' + id).autocomplete({
        change : function() {
            if(hiddenId && hiddenId != '') {
                var text = $('#' + id).val();
                if(text && text.length == 0) {
                    // Reset hidden field if main field gets emptied
                    $('#' + hiddenId).val('');
                }
            }
        },
        dataType : 'json',
        minLength : 0,
        position : {
            collision: "flip flip"
        },
        source : link,
        select : function(event, ui) {

            if(hiddenId && hiddenId != '') {
                $('#' + hiddenId).val('<' + ui.item.resource + '>');
                var label = ui.item.editLabel ? ui.item.editLabel : ui.item.label;
                $('#' + hiddenId).attr('swa-label', label);
                $('#' + id).removeClass('swa-auto-complete-dirty');
            }
            if(onSelect) {

                // become source and target params when merging nodes
                var resource = ui.item.resource;
                var label = ui.item.label;

                eval(onSelect);
            }
            if(ui.item.editLabel) {
                $('#' + id).val(ui.item.editLabel);
                event.preventDefault();
            }
        },
        open: function () {

        	var $autoCompleteDropdown = $('.ui-autocomplete.ui-front'),
        		$dialog = $('.ui-dialog:visible');

        	// if there is a dialog open, ensure the autocomplete dropdown z-index is heigher than the dialog box
        	// otherwise just ensure z-index is set higher than .ui-layout-resizer (2) from jQuery layout
        	if ($dialog.length > 0) {
        		$autoCompleteDropdown.css('z-index', parseInt($dialog.css('z-index')) + 1);
        	} else {
        		$autoCompleteDropdown.css('z-index', 3);
        	}
        }
    });
    if(hiddenId && hiddenId != '') {
        $('#' + id).keyup(function() {
            var hiddenLabel = $('#' + hiddenId).attr('swa-label');
            if(!hiddenLabel || hiddenLabel != $('#' + id).val()) {
                $('#' + id).addClass('swa-auto-complete-dirty');
            }
            else {
                $('#' + id).removeClass('swa-auto-complete-dirty');
            }
            if($("#" + id).val() == "") {
                $('#' + id).removeClass('swa-auto-complete-dirty');
                $('#' + hiddenId).val("");
            }
        });
    }

    $("#" + id + "-drop-down").click(function() {
    	if($($('#' + id).autocomplete('widget')).is(':visible')) {
        	$('#' + id).autocomplete("close");
    	}
    	else {
    		$('#' + id).autocomplete("search");
    		$("#" + id).focus();
    	}
    });
};


/**
 * Sets up a listener to a given input field so that whenever it changes
 * a new local name will be generated in the URI field.
 * Used by the CreateResourceDialog.
 * @param inputId  the id of the label input field
 */
swa.initCreateResourceLabelField = function(inputId) {
    $('#' + inputId).keyup(function() {

        // Note: finding the URI field by id 'uri-field' for some reason does not work
        //       Should be an argument really.
        var uriField = $('.swa-uri-field');
        var old = uriField.val();
        var sep = old.lastIndexOf('#');
        if(sep < 0) {
            sep = old.lastIndexOf('/');
        }
        if(sep < 0 && old.indexOf("urn:") == 0) {
            sep = old.lastIndexOf(':');
        }
        var label = $('#' + inputId).val().split(' ').join('_'); // Replace ' ' with '_'
        label = label.split("'").join('_'); // Replace ' with '_'
        var localName = encodeURIComponent(label);
        var ns = sep < 0 ? 'http://example.org/' : old.substring(0, sep + 1);
        var neo = ns + localName;
        uriField.val(neo);
    });
    swa.initCreateResourceLabelFieldEnter(inputId);
};


swa.initCreateResourceLabelFieldEnter = function(inputId) {
    $('#' + inputId).keydown(function(event) {
        if (event.which == 13) {
            $('#createResourceDialogOkButton').click();
        }
    });
};


/**
 * Sets up a listener to a given input field so that whenever it changes
 * the URI will be updated in the URI field based on a given uriStart
 * (usually from a declared primary key constraint).
 * @param inputId  the id of the label input field
 * @param uriStart   the start of the URIs
 */
swa.initCreateResourcePrimaryKeyField = function(inputId, uriStart) {

    // Update URI field when ID changes
    $('#' + inputId).keyup(function() {

        // Note: finding the URI field by id 'uri-field' for some reason does not work
        //       Should be an argument really.
        var uriField = $('.swa-uri-field');
        var id = $('#' + inputId).val();
        var encodedID = encodeURIComponent(id);
        uriField.val(uriStart + encodedID);
        if(id == "") {
            $("#createResourceDialogOkButton").attr("disabled", true);
        }
        else {
            $("#createResourceDialogOkButton").removeAttr("disabled");
        }
    });

    // Disable OK button until something is entered
    $(document).ready(function() { $("#createResourceDialogOkButton").attr("disabled", true) });
};


/**
 * Turns an input element with a given widget id into a jQuery datepicker.
 * @param id  the uid of the widget
 * @param altId  (optional) the id of the hidden widget
 */
swa.initDatePicker = function(id, altId) {

    if (!altId) {
        altId = 'new-' + id;
    }

    var eid = '#dateEditor' + id;

    $(eid).datetimepicker({
    	timepicker: false,
    	format: 'Y-m-d'
    });

    $(eid).change(function() {
        if ('' == $(eid).val()) {
        	// Work-around to bug: Make sure that hidden field is cleared if field is empty
            $('#' + altId).val('');
        }
        else {
        	$('#' + altId).val($(eid).val());
        }
    });
};

/**
 * Turns an input element with a given widget id into a datetimepicker.
 * @param id  the id of the input element
 * @param hiddenId  (optional) the id of the hidden widget
 */
swa.initDateTimePicker = function (id, hiddenId) {

    var eselector = '#dateTimeEditor' + id;
    var zid = 'timeZoneEditor' + id;
    if (!hiddenId) {
    	hiddenId = 'new-' + id;
    }

    $('#' + zid).change(function() {
    	swa.updateDateTimePickerHiddenField(eselector, zid, hiddenId);
    });

    $(eselector).datetimepicker({
    	format: "Y-m-d H:i:s"
    });
    $(eselector).change(function() {
        if ('' == $(eselector).val()) {
        	// Work-around to bug: Make sure that hidden field is cleared if field is empty
            $('#' + hiddenId).val('');
        }
        else {
        	swa.updateDateTimePickerHiddenField(eselector, zid, hiddenId);
        }
    });
};

swa.updateDateTimePickerHiddenField = function(eselector, zid, hiddenId) {
	var value = $(eselector).val().replace(' ', 'T');
	var zone = $('#' + zid).val();
	if(zone) {
		value += zone;
	}
	$('#' + hiddenId).val(value);
};

/**
 * Turns an input element with a given widget id into a timepicker.
 * @param id  the id of the input element
 */
swa.initTimePicker = function (id, hiddenId) {
	var $element = $('#timeEditor' + id);

	$element.datetimepicker({
		datepicker: false,
		format: 'H:i:s'
	});

	var altId = hiddenId ? hiddenId : 'new-' + id;

    $element.change(function() {
        if ('' == $element.val()) {
        	// Work-around to bug: Make sure that hidden field is cleared if field is empty
            $('#' + altId).val('');
        }
        else {
        	$('#' + altId).val($element.val());
        }
    });
};


swa.initDynamicEnumRangeAutoComplete = function(hiddenFieldId) {
    var id = hiddenFieldId + "-field";
    $('#' + id).autocomplete({
        change : function() {
            var text = $('#' + id).val();
            if(text && text.length == 0) {
                // Reset hidden field if main field gets emptied
                $('#' + hiddenFieldId).val('');
            }
        },
        dataType : 'json',
        minLength : 0,
        position : {
            collision: "flip flip"
        },
        select : function(event, ui) {
            $('#' + hiddenFieldId).val(ui.item.node);
            var label = ui.item.label;
            $('#' + hiddenFieldId).attr('swa-label', label);
            $('#' + id).removeClass('swa-auto-complete-dirty');
        }
        // source is set by the updateXY method
    });
    $('#' + id).keyup(function() {
        var hiddenLabel = $('#' + hiddenFieldId).attr('swa-label');
        if(!hiddenLabel || hiddenLabel != $('#' + id).val()) {
            $('#' + id).addClass('swa-auto-complete-dirty');
        }
        else {
            $('#' + id).removeClass('swa-auto-complete-dirty');
        }
    });
};


swa.initGridFooter = function(pagerId) {
    var pager = $("#" + pagerId);
    pager.addClass("ui-jqgrid ui-widget");
    pager.css("border-bottom-width", "0px");
    pager.css("border-bottom-left-radius", "0px");
    pager.css("border-bottom-right-radius", "0px");
    pager.css("border-left-width", "0px");
    pager.css("border-right-width", "0px");
    pager.css("border-top-color", "#b0b0b0");
    pager.css("min-height", "24px");
    pager.css("padding-top", "4px");
    pager.parent().parent().parent().append(pager);
    swa.relayout(pager.parent().parent());
};


/**
 * Initializes a given inline editor so that it reacts on mouse events.
 * @param id  the id of the inline editor
 */
swa.initInlineEditor = function(id) {
    var button = $("#" + id + "-button");
    var buttonCell = $("#" + id + "-button-cell");
    var main = $("#" + id);
    var editor = $("#" + id + "-editor");
    var editorParent = $("#" + id + "-editor-parent");
    var text = $("#" + id + "-text");
    var textParent = $("#" + id + "-text-parent");
    main.mouseenter(function() {
        if(!swa.inlineEditorIsEditing(id)) {
            main.addClass("swa-inline-editor-active");
            buttonCell.removeClass("swa-hidden");
        }
    });
    main.mouseleave(function() {
        if(!swa.inlineEditorIsEditing(id)) {
            main.removeClass("swa-inline-editor-active");
            buttonCell.addClass("swa-hidden");
        }
    });
    main.click(function() {
        if(!swa.inlineEditorIsEditing(id)) {
            var w = textParent.width();
            textParent.addClass("swa-display-none");
            button.removeClass("swa-inline-editor-button-edit");
            button.addClass("swa-inline-editor-button-ok");
            editorParent.removeClass("swa-display-none");
            editor.val(text.text());
            editor.width(w);
            editor.focus();
        }
    });
    button.click(function(event) {
        if(swa.inlineEditorIsEditing(id)) {
            swa.inlineEditorOk(id);
            event.stopPropagation();
        }
    })
};


/**
 * Called when a user cancels an active inline editor.
 */
swa.inlineEditorCancel = function(id) {
    var button = $("#" + id + "-button");
    var buttonCell = $("#" + id + "-button-cell");
    var editorParent = $("#" + id + "-editor-parent");
    var main = $("#" + id);
    var textParent = $("#" + id + "-text-parent");
    button.removeClass("swa-inline-editor-button-ok");
    button.addClass("swa-inline-editor-button-edit");
    buttonCell.addClass("swa-hidden");
    editorParent.addClass("swa-display-none");
    main.removeClass("swa-inline-editor-active");
    textParent.removeClass("swa-display-none");
};


swa.inlineEditorIsEditing = function(id) {
    var textParent = $("#" + id + "-text-parent");
    return textParent.hasClass("swa-display-none");
};


/**
 * Called when a user OKs an active inline editor.
 * Invokes the server side callback to perform the actual edit server-side
 * and then returns to view mode.
 */
swa.inlineEditorOk = function(id) {
    swa.inlineEditorCancel(id);
    var newValue = $("#" + id + "-editor").val();
    var url = $("#" + id).attr("updatelink") + "&newValue=\"\"\"" + encodeURIComponent(newValue) + "\"\"\"";
    $.get(url, function(data) {
        if(data.status == "error") {
            alert("Error: " + data.message);
        }
        else {
            $("#" + id + "-text").html(newValue);
            if(data.status == "warning") {
                alert("Warning: " + data.message);
            }
        }
    });
};


swa.inlineEditorTextAreaKeyDown = function(id, event) {
    if(event.keyCode == 27) { // Escape
        swa.inlineEditorCancel(id);
    }
};


swa.inlineEditorTextFieldKeyDown = function(id, event) {
    if(event.keyCode == 13) { // Enter
        swa.inlineEditorOk(id);
    }
    else if(event.keyCode == 27) { // Escape
        swa.inlineEditorCancel(id);
    }
};

swa.initNodeKindEditor = function(id) {
    $("#" + id + "-div > input").change(function() {
        var newField = $("[name='new-" + id + "']");
        var vs = [];
        if($("#BlankNode-" + id).is(":checked")) {
            vs.push("BlankNode");
        }
        if($("#IRI-" + id).is(":checked")) {
            vs.push("IRI");
        }
        if($("#Literal-" + id).is(":checked")) {
            vs.push("Literal");
        }
        if(vs.length == 0 || vs.length == 3) {
            newField.val(null);
        }
        else {
            var localName = vs[0];
            if(vs.length == 2) {
                localName += "Or" + vs[1];
            }
            var iri = "<http://www.w3.org/ns/shacl#" + localName + ">";
            newField.val(iri);
        }
    });
};


/**
 * Initializes jQuery UI tabs with support for lazy-loading and remembering the selected tab.
 */
swa.initTabs = function(id, storageKey) {

    var tabInitOptions,
        initialActiveTab = localStorage.getItem(storageKey) || 0,
        activeTabIndex;

    id = id || "tabs";

    if (window.location.hash) {
        // Find index of tab addressed by hash among the tab riders, e.g.:
        // $('#tabs a[href="#tabs-GeneralProjectTab"]').parent().index()
        var index = $("#" + id + ' a[href="' + window.location.hash + '"]').parent().index();
        if (index >= 0) {
            initialActiveTab = index;
        }
    }

    tabInitOptions = {
        // remember the last selected tab, otherwise just load the first tab
        active: initialActiveTab,
        // run this each time user selects a new tab
        activate : function(e, ui) {

            var $newPanel = ui.newPanel,
            key = storageKey + $newPanel.selector.slice(1);

            activeTabIndex = $(this).tabs('option', 'active');

            localStorage.setItem(storageKey, activeTabIndex);

            // we don't seem to be using this here, TODO: find out why this is needed
            var graph = swa.tabQueryGraphURIs[key];

            if(graph) {
                console.log('we used a graph and its value was: ' + graph);
                swa.queryGraphURI = graph;
            }

            if (!$newPanel.attr('loaded')) {
                swa.load($newPanel.attr('id'));
                $newPanel.attr('loaded', true);
            }

        },
        // load tab panel contents initially
        create: function (event, ui) {
            var activeTabId = ui.panel.selector,
                hashlessTabId = activeTabId.slice(1);

            $(this).find('.ui-tabs-nav').slick({
	            infinite: false,
	            slidesToScroll: 1,
	            variableWidth: true,
	            swipeToSlide: true,
	            accessibility: false,
	            speed: 300
            });

            swa.load(hashlessTabId);
            $(activeTabId).attr('loaded', true);

        }
    };

    $("#" + id).tabs(tabInitOptions);

};


/**
 * Turns a div created by swa:Tree into a jsTree.
 * @param id  {String} the id of the div
 * @param link  {String} the URL of the callback for the JSON data
 * @param onLoaded  {Function} the event handler for after the tree has been loaded
 * @param onSelect  {Function} the event handler for when the selection changes
 * @param onDoubleClick (depricated)  the event handler for double-clicks on a node
 * @param draggable  {Boolean} true to make the tree draggable
 * @param checkDropFunction {Function or false}  a function that shall be executed to verify a drag and drop
 *             attempt.  The function takes the same arguments as jsTree._get_move.
 *             The function may be null.
 * @param treeMoveHandler  {String} the server side SWP view that shall be called to execute the
 *             drop operation.  Must be a subclass of swa:TreeMoveHandlers.
 */
swa.initTree = function(id, link, onLoaded, onSelect, onDoubleClick, draggable, checkDropFunction, treeMoveHandler) {

    var validationFunction,
        $tree = $("#" + id);

    if (draggable && checkDropFunction) {
        validationFunction = checkDropFunction;
    } else if (draggable) {
        validationFunction = swa.isDefaultTreeManipulationAllowed;
    } else {
    	validationFunction = false;
    }

    link = swa.redirectLink(link);

    var jsTreePlugins = draggable ? ["dnd"] : [];

    if (swa.server != '') {
        link += '&_server=' + escape(swa.server);
    }

    var params = {
            "plugins" : jsTreePlugins,
            "core" : {
                "multiple": false,
                "animation": 0,
                "check_callback" : validationFunction,
                "themes": { "stripes" : false },
                "data": {
                    "dataType": "json",
                    "method": "get",
                    "contentType": "application/json",
                    "url": function (node) {
                        return link;
                    },
                    "data": function (node) {

                        var endPoint = (node.id === '#') ? '1' : node.id;

                        return {
                            'id': endPoint,
                            '_bypassCacheDummy': new Date().getTime()
                        }
                    },
                    "success": function (data) {

                    	// if the user requests more data than our back end can deliver
                    	// to the UI in a reasonable amount of time
                    	// TODO: don't hard code this max number, it should correspond to
                    	// whatever limit is set in swa:superClassOfLimited and swa:TreeDataProviderHelper
                    	if (data.length >= 1000) {

                    		$('.jstree-node:first > a').click();

					        var tour = new Tour({
					                "steps"   : [],
					                "storage": false,
					                "backdrop": true,
					                "orphan": true
					            });

					        tour.addStep({
					            "element": false,
					            "title": "Woah, That's a lot of data!",
					            "content": "The number of nodes you're working with is more than you'll want to wait for to load. For this reason only the first <strong>1000</strong> nodes are displayed in the tree component. Next is an alternative to using the tree for finding the data you're looking for.",
					            "placement": "auto bottom"
					        });

					        tour.addStep({
					            "element": '.swa-resource-actions-button',
					            "title": "Alternative 2: The NeighborGram&trade;",
					            "content": "Search for and navigate to any resource by using the NeighborGram&trade;. First, click the actions menu button, then select Display NeighborGram&trade;. From there, you can use the search box in the top left hand corner to search and explore your data.",
					            "placement": "auto top"
					        });

					        tour.init(true);
					        tour.start();

                    	}
                    }
                }
            }

        };


    $tree.jstree(params);

	if (draggable && treeMoveHandler) {

		$tree.on('move_node.jstree', function(event, data) {

			var parentURI =  $tree.jstree(true).get_node(data.parent).data.resource;
			var childURI = data.node.data.resource;
			var newChildIndex = data.position;
			var $oldParentNode = $tree.jstree(true).get_node(data.old_parent);
			var $newParentNode = $tree.jstree(true).get_node(data.parent);

			swa.handleTreeMove(id, parentURI, childURI, newChildIndex, $oldParentNode, $newParentNode, treeMoveHandler);
		});
	}

    if(onSelect) {
        $tree.on("select_node.jstree", function(event, data) {
        	if(!swa.bypassTreeSelectionEvent) {
        		var resource = data.node.data.resource;
            	eval(onSelect);
            }
        });
    }

    // apply custom js on load
    if(onLoaded) {
        $tree.on("loaded.jstree", function(event, data) {
            eval(onLoaded);
        });
    }
};

/**
 * Validates a jstree drag operation, and determines what happens when a user tries to modify the structure of the tree
 * @param operation  the type of operation being performed (move_node, copy_node, etc)
 * @param node  the node being acted on
 * @param parent  the parent node of the node being hovered over (seems inconsistant)
 * @param position  the position of the node within the tree
 * @param more  contains various information provided by the plugin that is invoking the check
 * @return Returning false prevents operations like create, rename, delete, move and copy, otherwise operation is allowed
 */
swa.isDefaultTreeManipulationAllowed = function (operation, node, parent, position, more) {
	var operationAllowed = true;

    switch (operation) {
        case 'move_node':

            // more.dnd is active while user is dragging (not on drop)
            if (more.dnd) {

                operationAllowed = (
                		swa.checkIfNodeIsDraggable(node) &&
                		swa.checkLandingPosIsInside(more) &&
                		!swa.checkIfDropNodeIsParent(more.ref, node)
                	);

                return operationAllowed;

            }

        break;
    }
};


/**
 * Validates a jstree drag operation, and determines what happens when a user tries to modify the structure of the tree
 * Used in place of swa.isDefaultTreeManipulationAllowed
 * @param operation  the type of operation being performed (move_node, copy_node, etc)
 * @param node  the node being acted on
 * @param parent  the parent node of the node being hovered over (seems inconsistant)
 * @param position  the position of the node within the tree
 * @param more  contains various information provided by the plugin that is invoking the check
 * @return Returning false prevents operations like create, rename, delete, move and copy, otherwise operation is allowed
 */
swa.isClassPropertyTreeManipulationAllowed = function (operation, node, parent, position, more) {
	var operationAllowed = true;

    switch (operation) {
        case 'move_node':

            // more.dnd is active while user is dragging (not on drop)
            if (more.dnd) {

                operationAllowed = (
                		swa.checkIfNodeIsDraggable(node) &&
                		swa.checkLandingPosIsInside(more) &&
                		!swa.checkIfDropNodeIsParent(more.ref, node) &&
                		swa.checkForPropertyTypes(more.ref, node)
                	);

                return operationAllowed;

            }

        break;
    }
};

/**
 * Helper for validating a jstree drag operation.
 * Prevents dragging property type nodes into other property type nodes
 * @param dropNode  {Object} the node you are hovering over and attempting to drop the draggable node into
 * @param currentNode  {Object} the node you are grabbing/dragging
 * @return {Boolean} false if you are trying to drag a node of type property into another node of type property
 */
swa.checkForPropertyTypes = function (dropNode, currentNode) {
	return (dropNode.data.metadata === 'Property' && currentNode.data.metadata === 'Property') ? false : true;
};


/**
 * Helper for validating a jstree drag operation. Returning false prevents the drag & drop operation
 * @param node  {Object} the node you are acting on
 * @return {Boolean} if the node is draggable
 */
swa.checkIfNodeIsDraggable = function (node) {
	return (node.data.draggable === true) ? true : false;
};


/**
 * Helper for validating a jstree drag operation.
 * @param dropNode  {Object} the node you are hovering over and attempting to drop the draggable node into
 * @param currentNode  {Object} the node you are grabbing/dragging
 * @return {Boolean} if you are attempting to drop a node into its immediate parent
 */
swa.checkIfDropNodeIsParent = function (dropNode, currentNode) {
	return (dropNode.id === currentNode.parent) ? true : false;
};


/**
 * Helper for validating a jstree drag operation.
 * more.pos can be either b (before) i (inside) a (after)
 * @param more  {Object} contains various information provided by the jstree plugin that is invoking the check
 * @return {Boolean} true if you are trying to drag a node into or ourside of another, false if moving around
 * at the same level of hierarchy
 */
swa.checkLandingPosIsInside = function (more) {
	return (more.pos === 'i') ? true : false;
};


/**
 * Helper for validating a jstree drag operation.
 * @param $tree  {Object} the jQuery object representing the tree
 * @param dropNode  {Object} the node you are hovering over and attempting to drop the draggable node into
 * @param parentNode  {Object} the parent node of the node you are dragging
 * @return {Boolean} true if the nodes drop location would be the same depth as the node's parent
 */
swa.dropNodeDepthSameAsParent = function ($tree, dropNode, parentNode) {
    return (swa.treeNodeDepth($tree, dropNode) === swa.treeNodeDepth($tree, parentNode));
};


/**
 * Helper for validating a jstree drag operation
 * @description  Checks if node depth would be the same after a drag and drop operation
 * @param $tree  {Object} the jQuery object representing the tree
 * @param $dragNode  {Object} the jstree object representing the tree node being drug
 * @param $dropNode  {Object} the jstree object representing the tree node being hovered over
 * @return {Boolean} true if the new node depth within the tree wouldn't change
 */
swa.checkTreeNodeDepthRemainsSame = function ($tree, $dragNode, $dropNode) {
    return (swa.treeNodeDepth($tree, $dragNode) === swa.treeNodeDepth($tree, $dropNode));
};


/**
 * Checks to see if a tree node is a root node
 * @param $tree  {Object} the jQuery object representing the tree
 * @param node  {Object} the jstree object representing the tree node
 * @return {Boolean} true if the node is at the top level of the tree (depth of 1)
 */
swa.treeNodeIsRoot = function ($tree, node) {
    return (swa.treeNodeDepth($tree, node) === 1);
};


/**
 * Gets the URI of the currently selected resource in a given tree.
 * @param treeId  the id of the tree
 * @returns the URI or null if nothing is selected
 */
swa.getSelectedTreeResource = function(treeId) {
	if ($('#' + treeId).jstree(true) === false) {
	    console.warn('Cannot get seleted tree resource because a jstree has not been initialized for #' + treeId);
	    return;
	}

    var selectedNode = $('#' + treeId).jstree(true).get_selected(true)[0];
    return (selectedNode) ? selectedNode.data.resource : null;
};

/**
 * Gets the ID of the currently selected resource in a given tree.
 * @param treeId  the id of the tree
 * @returns the ID or null if nothing is selected
 */
swa.getSelectedTreeResourceId = function (treeId) {
    var treeNodeId = $('#' + treeId).jstree(true).get_selected();
    return (treeNodeId.length) ? treeNodeId[0] : null;
};

/**
 * Selects a given node in a given tree.
 * Will expand if necessary, using a server-side shortest path algorithm.
 * Currently only works on the tree that was created last, but not with multiple trees on a page
 * @param treeId  the id of the tree
 * @param nodeURI  the URI of the resource to select
 * @param queryGraphURI  the result of calling ui:currentQueryGraph() or null
 */
swa.selectTreeNode = function(treeId, nodeURI, queryGraphURI) {

    if (!nodeURI) {
        return;
    }

    // nothing to do if the tree is hidden
    if ($('#' + treeId).is(':hidden')) {
        return;
    }

    var tree = $('#' + treeId),
    	$jstree = tree.jstree(true),
        dataProviderURI = tree.attr('treedataprovider'),
        rootURI = tree.attr('treeroot'),
        context = tree.attr("swacontext"),
        selectedNodeId = swa.getSelectedTreeNode(tree),
        queryGraphURI = (queryGraphURI) ? queryGraphURI : swa.queryGraphURI,
        serverURL = swa.server + swa.servlet,
        data,
        nodeToSelectLiId = tree.find('li[data-resource="' + nodeURI + '"]').attr('id'),
        $jqxhr;

    if (!dataProviderURI) {
        alert('Error: Active Tree (' + treeId + ') is missing a required treedataprovider attribute');
        return;
    }

    if (queryGraphURI === null) {
        alert('Error: queryGraphURI is null - cannot select tree node ' + nodeToSelect + ' at tree with id ' + treeId);
        return;
    }

    // Do nothing if it's already selected
    if (selectedNodeId) {
        if (selectedNodeId === nodeToSelectLiId) {
            return;
        }
    }

    // Load path to root from the server and then call helper function
    data = {
        _base: queryGraphURI,
        _viewClass: 'swa:TreeShortestPathCallback',
        dataProvider: '<' + dataProviderURI + '>',
        node: '<' + nodeURI + '>'
    };

    if (swa.server != '') {
        data._server = escape(swa.server);
    }

    if (rootURI) {
        data.root = '<' + rootURI + '>';
    }

    if (context && context !== '') {
        serverURL += "?" + context;
    }

    // check if nodes exist in the path which are not currently present
    // in the DOM (which means we need to expandToAndSelectTreeNode)
    function morePathNodesRequired (path) {
    	for (node in path) {
    		if (tree.find('[data-resource="' + path[node] + '"]').length === 0) {
    			return true;
    		}
    	}
    	return false;
    }

    $jqxhr = $.get(serverURL, data);

    $.when(
        $jqxhr
    ).done(function (path, textStatus, jxXHR) {

    	var pathNotEmpty = !jQuery.isEmptyObject(path);

    	// otherwise just select the node has it typically would have
        if (pathNotEmpty && morePathNodesRequired(path)) {

            swa.expandToAndSelectTreeNode(tree, path, 0);

        } else if (pathNotEmpty) {

        	$jstree.deselect_all();

        	// path is the full lineage of the node to the root of the tree
        	// so get the last item in the path and select it
        	var nodeInView = tree.find('[data-resource="' + path[path.length - 1] + '"]');
        	$jstree.select_node(nodeInView, true);

			var paneToScroll = tree.parent()[0],
				amountToScroll = tree.find('[id="' + nodeInView.attr('id') + '"]')[0].offsetTop;

			paneToScroll.scrollTop = amountToScroll;
        }
    });
};


swa.getSelectedTreeResourceOrError = function(treeId, error) {
    var resource = swa.getSelectedTreeResource(treeId);
    if(resource) {
        return resource;
    }
    else {
        return error;
    }
};


/**
 * Gets the depth of a given swa:Tree node.
 * @param $tree  {Object} jQuery object representing the tree
 * @param node  {Object} the jsTree object of the node
 * @returns  {Number} the node's distance from the root of the tree
 */
swa.treeNodeDepth = function($tree, node) {
    return $tree.jstree(true).get_node(node).parents.length;
};


/**
 * Checks if a given resource URI in a tree is a class.
 * This check is using the tree icon and therefore assumes that the
 * corresponding tree has been loaded already.
 * @param uri  the resource URI to check
 * @param treeId  the id of the tree to walk through
 * @returns true  if uri is a class, false if not a class or unknown
 */
swa.treeResourceIsClass = function(uri, treeId) {
    var treeMetadata = swa.getSelectedTreeNodeMetadata(treeId);
    return (treeMetadata === 'Class') ? true : false;
};


swa.isBrowserCompatible = function() {
    var compatible = false;
    var userAgent = navigator.userAgent;
    var chrome = userAgent.match(/Chrome\/\d+[.]/);
    var firefox = userAgent.match(/Firefox\/\d+[.]/);
    var msie = userAgent.match(/Trident\/\d+[.]/);
    var safari = userAgent.match(/Version\/\d+[.].*Safari\//);
    var agentString = null, slashIndex, dotIndex, version = null;
    if (chrome != null) {
        agentString = chrome[0];
    } else if (firefox != null) {
        agentString = firefox[0];
    } else if (msie != null) {
        agentString = msie[0];
    } else if (safari != null) {
        var safariStrings = safari[0].split(' ');
        agentString = safariStrings[0];
    }
    if (agentString != null) {
        slashIndex = agentString.indexOf('/');
        dotIndex = agentString.lastIndexOf('.');
        version = agentString.substring(slashIndex + 1, dotIndex);
    }
    if (version != null) {
        if (chrome != null) {
            compatible = Number(version) >= 25;
        } else if (firefox != null) {
            compatible = Number(version) >= 10;
        } else if (msie != null) {
            // Trident/5.0 = IE9
            compatible = Number(version) >= 5;
        } else if (safari != null) {
            compatible = Number(version) >= 6;
        }
    }
    return compatible;
};


/**
 * @deprecated see swa.handleAddedTreeNodes
 */
swa.handleDeletedTreeNodes = function(predicateURI, subjectChanges, treeId) {
    var nodeIds = {};
    swa.collectDeletedTreeNodes(predicateURI, subjectChanges, treeId, nodeIds);
    swa.refreshTreeNodes(treeId, nodeIds);
};


/**
 * Called when the user has completed a drag and drop in a tree.
 * Executes the handler specified by the tree, and rolls back the tree UI
 * if the operation failed for any reason.
 * @param treeId  the id of the tree
 * @param parentURI  the URI of the (new) parent resource
 * @param childURI  the URI of the (new) child resource
 * @param childIndex  the index that the new child shall have, pushing the other nodes down
 *                    (to the end if unset)
 * @param rollBack  a rollback object (see below)
 * @param treeMoveHandler  the SWP service that does the actual work on the data level
 */
swa.handleTreeMove = function(treeId, parentURI, childURI, newChildIndex, $oldParentNode, $newParentNode, treeMoveHandler) {

    var params = {
            parent : parentURI,
            child : '<' + childURI + '>'
    };

    if (newChildIndex == 0 || newChildIndex) {
        params["childIndex"] = newChildIndex;
    }

    var context = $("#" + treeId).attr("swacontext");

    swa.callHandler(treeMoveHandler, params, function(error) {
        alert(error);

        // only revert the nodes that matter
        // this still needs work, refresh_node doesn't seem to work
        // when the id's contain "<" and ">"

        // $("#" + treeId).jstree(true).refresh_node($oldParentNode);
        // $("#" + treeId).jstree(true).refresh_node($newParentNode);

        swa.refreshTree(treeId);

    }, null, context);
};

/**
 * Loads and opens a modal dialog via a callback to the server.
 * The prerequisite of this call is a (dummy) div that can hold the
 * dialog's element after they have been loaded.  From there, the
 * system will turn them into a dialog with given dimensions.
 * @param viewClass  the qname of the view class
 * @param loadId
 * @param params
 * @param width
 * @param height
 */
swa.loadModalDialog = function(viewClass, loadId, params, width, height, buttons) {
    params['_viewClass'] = viewClass;
    params['_snippet'] = true;
    if(!params['_base'] && swa.queryGraphURI) {
        params['_base'] = swa.queryGraphURI;
    }
    $('#swa-dialog-parent').load(swa.server + swa.servlet, params, function(data) {
        swa.openModalDialogHelper(loadId, width, height, buttons, true);
    });
};

//EVN-569 : to get rich text comments and link to concept plugin to work
swa.loadModalDialogComments = function(viewClass, loadId, params, width, height) {
    params['_viewClass'] = viewClass;
    params['_snippet'] = true;
    if(!params['_base'] && swa.queryGraphURI) {
        params['_base'] = swa.queryGraphURI;
    }

    //Append dynamic div to ui-layout-container to load concept popup into.
    $(".ui-layout-container").append("<div id='swa-dialog-parent-comments' style='visibility: none;'></div>");
    $('#swa-dialog-parent-comments').load(swa.server + swa.servlet, params, function(data) {
        swa.openModalDialogHelper(loadId, width, height, null, true);
    });
};


/**
 * Displays a progress dialog and then starts navigating to another page.
 * @param url  the URL to load
 * @param title  the title of the progress dialog
 */
swa.loadPageWithProgress = function(url, title) {
    var progressId = 'load-page-' + Math.random();
    swa.openProgressMonitorDialog(progressId, title);
    document.location.href = url + '&_progressId=' + progressId;
};


// Private
swa.loadPostProcessAll = function(e) {
    swa.loadPostProcess(e, 'north');
    swa.loadPostProcess(e, 'east');
    swa.loadPostProcess(e, 'south');
    swa.loadPostProcess(e, 'west');
    swa.loadPostProcess(e, 'center');
};


// Private function to make sure that the scrollbars are
// updated if a ui:loadable has been loaded into a layout pane
swa.loadPostProcess = function(e, pane) {
    // TODO: Test if this also works for panes that don't have a ui-layout-content
    if(e.hasClass('ui-layout-' + pane)) {
        e.parent().layout().initContent(pane);
    }
};


/**
 * Loads a SearchResultsGrid based on the selections in a form with
 * a given id.  Will replace the content of a given target element.
 * @param formId  the form id
 * @param targetId  the target id
 * @param onSelect  the value for onSelect of the generated grid
 * @param rowNumCookie  the rowNumCookie value to pass into the grid
 */
swa.loadSearchResultsGrid = function(formId, targetId, onSelect, rowNumCookie) {
    var params = swa.getSearchParamsFromForm(formId);
    swa.loadSearchResultsGridHelper(params, targetId, onSelect, rowNumCookie);
};


swa.loadSearchResultsGridHelper = function(params, targetId, onSelect, rowNumCookie) {
    var escaped = '&params=' + escape(params);
    if(onSelect) {
        escaped += '&onSelect=' + escape(onSelect);
    }
    swa.insertLoadingIndicator($('#' + targetId));
    params += '&_viewClass=swa:SearchResultsGrid&_snippet=true' + escaped;
    if(rowNumCookie) {
        params += '&rowNumCookie=' + rowNumCookie;
    }
    $.post(swa.server + swa.servlet, params, function(data) {
        $('#' + targetId).html(data);
        swa.loadPostProcessAll($('#' + targetId).parent());
    });
};


/**
 * Runs the SPARQL query behind the Search form and builds an array
 * consisting of the URIs of the matching resources.
 * Then it runs a callback function that takes that array and the id of the
 * selected type as its two arguments.
 * @param formId  the id of the search form
 * @param maxCount  the maximum number of matches before stopping with an error
 * @param callback  the callback to invoke once the search results came back
 */
swa.loadSearchResultsList = function(formId, maxCount, callback) {
    var form = $('#' + formId);
    var typeField = form.find('[name="type"]');
    var type = typeField.val();
    var params = form.serialize() + swa.serializeKeyProperties(form);
    if(maxCount && maxCount >= 0) {
        params += '&maxCount=' + maxCount;
    }
    $.post(swa.server + 'getSearchResults', params, function(data) {
        var rows = data.rows;
        if(maxCount && rows.length == maxCount) {
            alert('Too many search results: this operation is not supported for more than ' + maxCount + ' matches.');
        }
        else {
            var array = [];
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var uri = row.id;
                array[i] = uri;
            }
            callback(array, type);
        }
    });
}


/**
 * (Re)loads the content of a swa:Window with a given id.
 * Clients should use swa.load instead because it will automatically invoke the method below.
 * @param windowId  the id of the swa:Window to reload
 * @param args  name-value pairs of variables that shall be set when reloading
 * @param callback  an optional callback after loading
 */
swa.loadWindow = function(windowId, args, callback) {
    var $curWindow = $('#' + windowId);

    if($curWindow.hasClass("ui-layout-container")) {
        $curWindow.layout().destroy();
    }

    var uistate = $curWindow.attr('uistate');
    if(!uistate) {
        alert('Error: Invalid use of swa.reloadWindow: Missing uistate attribute at ' + windowId);
        return;
    }

    // Unsubscribe from any event this window has subscribed to before.
    swa.unsubscribeWindow(windowId);

    var params = $.deparam(uistate);
    if(args) {
        for(var key in args) {
            params['_scope' + key] = args[key];
        }
    }
    params['_snippet'] = true;

    // Replace everything but the head with a loading indicator
    $curWindow.children().each(function() {
        if(!$(this).hasClass("swa-header")) {
            $(this).remove();
        }
    });

    // the temporary loading gif
    var $loadingGif = $('<div class="swa-loading-indicator"></div>');
    $curWindow.append($loadingGif);

    jQuery.ajax({
        url: swa.servlet,
        type: "POST",
        dataType: "html",
        data: params,

        success: function (data, textStatus, jqXHR) {

            if (jqXHR.state() === 'resolved') {

                    jqXHR.done(function(r) {
                        responseText = r;
                    });

                    $loadingGif.remove();
                    var neo = $(jqXHR.responseText);
                    $curWindow.append(neo); // Insert all so that the scripts get executed too

                    // Move all children except header under new parent
                    $(neo).children().each(function() {
                        if($(this).hasClass("swa-header")) {
                            $(this).remove();
                        }
                        else {
                            $curWindow.append($(this));
                        }
                    });
                    neo.remove();
                }
        },

        error: function (jqXHR, textStatus, errorThrown) {
            $loadingGif.remove();
            $curWindow.append(errorThrown);
        },

        complete: function( jqXHR, status, responseText ) {

            swa.loadPostProcessAll($curWindow);
            if(callback) {
                callback.call();
            }
        }
    });

};


/**
 * Declares a given property to be the primary key for the class that is its rdfs:domain.
 * Any previous primary key for that class is deleted.
 * A dialog is used to enter a suitable URI start.
 */
swa.makePrimaryKey = function(propertyURI) {
    var loadId = "swaMakePrimaryKeyDialog";
    var params = {
        loadId : loadId,
        property : propertyURI,
        _snippet : true,
        _base : swa.queryGraphURI,
        _viewClass : "swa:MakePrimaryKeyDialog"
    }
    $('#swa-dialog-parent').load(swa.server + swa.servlet, params, function(data) {
        swa.openModalDialogHelper(loadId, 600, 200, [
            {
                text : "Ok",
                onclick : "swa.makePrimaryKeyOk('" + propertyURI + "');swa.closeDialog('" + loadId + "');"
            },
            {
                text : "Cancel",
                onclick : "swa.closeDialog('" + loadId + "')"
            }
        ]);
    });
};


swa.makePrimaryKeyOk = function(propertyURI) {
    var params = {
            property : propertyURI,
            uriStart : $("#uriStart").val(),
            _base : swa.queryGraphURI,
            _viewClass : "swa:SetPrimaryKeyService"
    };
    $.get(swa.servlet, params, function(data) {
        swa.processEdits(data, false);
    });
};


/**
 * Changes the location (URL) of the current browser window to the
 * URL of the uispin servlet with the default view of a given resource
 * and a given context graph
 * @param resourceURI  the URI of the resource to navigate to
 * @param queryGraphURI  the URI of the current query graph
 * @return false
 */
swa.navigateTo = function(resourceURI, queryGraphURI) {
    window.location = swa.server + swa.servlet + '?_base=' + escape(queryGraphURI) +
        '&_resource=' + escape(resourceURI);
};


/**
 * Opens a new tab or browser window with the URL of the uispin servlet
 * with the default view of a given resource and a given context graph
 * @param resourceURI  the URI of the resource to navigate to
 * @param queryGraphURI  the URI of the current query graph
 */
swa.navigateToInTab = function(resourceURI, queryGraphURI) {
    window.open(swa.server + swa.servlet + '?_base=' + escape(queryGraphURI) +
        '&_resource=' + escape(resourceURI));
};



// Helper for resource actions and similar drop downs
/**
 * Launches a contextMenu with some initial configs.
 * Triggered when selecting the gear button at the bottom of the center pane in an editor application
 * @param parentId  {String} the ID of the dom element we use when initializing contextMenu
 * @param data  {Object} an object of query params like _base, _viewClass, appName, resource, etc.
 * @param queryGraphURI  {String} doesn't look like this is used...
 * @param resourceURI  {String} the URI of the resource being edited
 * @param defaultCallback  {Function} alls swa.executeSWPResourceAction passing actionName and resourceURI as params
 * @param evalCallback  {Function} passes an expression to evaluate with js eval()
 */
swa.openActionsMenuHelper = function(parentId, data, queryGraphURI, resourceURI, defaultCallback, evalCallback) {

    var setUpContextMenu = function (items) {

            $.contextMenu({
                selector: '#' + parentId,
                items : items,
                callback: function(key, e) {

                    var b = e.commands[key];

                    if (b.actionJS) {
                        if(evalCallback) {
                            evalCallback(b.actionJS);
                        } else {
                            eval(b.actionJS);
                        }
                    } else if(defaultCallback) {
                        defaultCallback(b.actionName);
                    }
                },
                events: {
	                hide: function (options) {
	                	$.contextMenu('destroy');
	                }
                }

            });
        };


    $.ajax({
        'url': swa.server + swa.servlet,
        'method': 'get',
        'data': data,
        'success': function (data, textStatus, jqXHR) {
            var i,
                b,
                item,
                items = {};
            for (i = 0; i < data.length; i++) {
                b = data[i];
                item = {
                    actionJS: b.onSelect,
                    actionName : b.actionName,
                    name: b.label,
                    icon: b.iconClass
                };
                if (!b.enabled) {
                    item.disabled = true;
                }
                if (b.actionLocalName) {
                    item.className = 'test-' + b.actionLocalName;
                }
                items['item' + i] = item;
            };

            setUpContextMenu(items);

            $('#' + parentId).contextMenu();
        },
        'error': function (jqXHR, textStatus, errorThrown) {
            console.log(errorThrown);
        }
    });

};


/**
 * Called when the user clicks the drop down menu behind an auto-complete.
 * @param id  the id used by the auto-complete
 * @param typeURI  the type of instances to select
 * @param appName  the app name from the context
 */
swa.openAutoCompleteSelectMenu = function(id, typeURI, appName, menuFilterNode) {
    var params = {
        _base : swa.queryGraphURI,
        _viewClass : 'swa:AutoCompleteSelectMenuCallback',
        elementId : '"' + id + '"',
        type : '<' + typeURI + '>'
    };
    if(appName && appName != '') {
        params['_contextswaAppName'] = '"' + appName + '"';
    }
    if(menuFilterNode && menuFilterNode != '') {
        params['filterNode'] = "<" + menuFilterNode + ">";
    }
    swa.openActionsMenuHelper(id + "-menu", params, swa.queryGraphURI);
};


swa.onGenericTreePropertySelectionChange = function(value, resourceType, windowId) {
    var readOnly = value.charAt(0) == '!';
    if(readOnly) {
        value = value.substring(1);
    }
    var inverse = value.charAt(0) == '-';
    var property = inverse ? value.substring(1) : value;
    swa.loadWindow(windowId, {
        readOnly : readOnly,
        property : '<' + property + '>',
        inverse : inverse,
        resourceType : '<' + resourceType + '>'
    });
};


/**
 * Called when the user clicks on a swa:CreateResourceButton.
 * @param loadId  the id of the dialog to open
 * @param contextResource  the (optional) URI of a context resource, e.g. tree parent
 *                         or false to indicate that no contextResource is needed
 *                         or an error string starting with "Error: " to display
 *                         a dialog only
 * @param useAsType  true to use the contextResource as resourceType instead
 */
swa.openCreateResourceDialog = function(loadId, contextResource, useAsType) {

    if (contextResource && contextResource.indexOf('Error:') == 0) {
        alert(contextResource.substring(contextResource.substring(7)));
    } else {
        var params = { };
        if(contextResource != false && contextResource != null) {
        	contextResource = swa.wrappedURI(contextResource);
            if(useAsType) {
                params.resourceType = contextResource;
            }
            else {
                params.contextResource = contextResource;
            }
        }
        swa.openModalDialog(loadId, params, 680, 180, null, true);
    }
};


/**
 * Can be used to implement on-the-fly creation of instances for auto-complete fields.
 * Used by EVN Ontology Editor.
 * @param elementId  the id used by the auto-complete
 * @param typeURI  the URI of the resource type
 */
swa.openCreateResourceForAutoCompleteDialog = function(elementId, typeURI) {
    var loadId = 'myCreateResourceDialog' + swa.getRunningIndex();
    var params = {
        callback: "swa.openCreateResourceForAutoCompleteDialogHelper",
        loadId: '"' + loadId + '"',
        resourceType: '<' + typeURI + '>',
        _base: '<' + swa.queryGraphURI + '>'
    };
    swa.nextAutoCompleteElementId = elementId; // Ugly global hack
    swa.loadModalDialog('swa:CreateResourceDialog', loadId, params, 600, 180);
};

swa.nextAutoCompleteElementId = null;

swa.openCreateResourceForAutoCompleteDialogHelper = function(typeURI, resourceURI, label, labelLang, contextResourceURI, handlerURI, resourceSelectedEvent) {
    swa.createResourceHelper(typeURI, resourceURI, label, labelLang, contextResourceURI, "swa:CreateResourceHandler", resourceSelectedEvent, function(resourceURI) {
        swa.setAutoCompleteResource(swa.nextAutoCompleteElementId, resourceURI);
    });
};


/**
 * Called when the user opens up a drop down menu next to a search widget.
 * @param buttonId  the id of the button (to hold the menu)
 * @param elementId  the id of the div containing the current widget
 * @param typeURI  the URI of the resource type
 * @param predicateURI  the URI of the predicate
 * @param inverse  true if called from a subject widget
 * @param filterFunction  an optional filter function to pass into the service
 */
swa.openFacetSelectionMenu = function(buttonId, elementId, typeURI, predicateURI, inverse, filterFunction) {
    var params = {
        _base : swa.queryGraphURI,
        _viewClass : inverse ? 'swa:SubjectFacetWidgetsCallback' : 'swa:ObjectFacetWidgetsCallback',
        elementId : '"' + elementId + '"',
        resourceType : '<' + typeURI + '>',
        predicate : '<' + predicateURI + '>'
    };
    if(filterFunction && filterFunction != "") {
        params.filterFunction = '<' + filterFunction + '>';
    }
    swa.openActionsMenuHelper(buttonId, params, swa.queryGraphURI);
};


/**
 * Opens a modal dialog in which the user can enter arguments that will be passed
 * to an swa:EditHandler to perform changes based on those arguments.
 * The handler is assumed to be defined in the UI graph, i.e. a .ui. file in TopBraid.
 * @param title  the title of the dialog
 * @param handler  the qname or <...> URI of the handler
 * @param resourceURI  the selected resource or null
 */
swa.openHandlerDialog = function(title, handler, resourceURI) {

    var loadId = 'myParamDialog';
    var params = {
            callback: "swa.callHandler('" + handler + "', data, null, '" + title + "')",
            label: title,
            loadId: loadId,
            resourceType: handler,
            _base: '<' + swa.queryGraphURI + '>'
    };
    if(resourceURI) {
        params.callback = "data['resource']=\"<" + resourceURI + ">\";" + params.callback;
    }
    swa.loadModalDialog('swa:ParamsDialog', loadId, params, 600);
};


// Private
swa.openIndexLetterDialog = function(loadId, letter) {
    swa.load(loadId, { letter: '"' + letter + '"' }, function() {
        var div = $('#div-' + loadId);
        var title = div.attr('title');
        var options = {
                modal: true,
                title: title,
                width: 428,
                height: 330
            };
        div.dialog(options);
    });
};


/**
 * Loads and opens a modal dialog that has been inserted as a ui:loadable.
 * @param loadId  the ui:loadId of the dialog
 * @param params  the parameters to pass into the loadable
 * @param width  (optional) the width in pixels
 * @param height  (optional) the height in pixels
 */
swa.openModalDialog = function(loadId, params, width, height, buttons, remove) {
    swa.load(loadId, params, function() {
        swa.openModalDialogHelper(loadId, width, height, buttons, remove);
    });
};

// Private
swa.openModalDialogHelperDirect = function(id, width, height, buttons, remove) {

    var div = $(id);

    //EVN-569: get title of Concept being commented on.
    var titleDiv = $('#div-comments-dialog');
    var title = titleDiv.attr('title');

    var options = {
            modal: true,
            title: title
        };
    if(buttons) {
        options.buttons = buttons;
    }
    if(width) {
        options.width = width;
    }
    if(height) {
        options.height = height;
    }
    if(remove) {
        options.close = function() {
            $(this).remove();
        };
    }
    div.dialog(options);
}
// Private
swa.openModalDialogHelper = function(loadId, width, height, buttons, remove) {
    swa.openModalDialogHelperDirect('#div-'+loadId, width, height, buttons, remove);
};


swa.openMultiResourceEditDialog = function(resourceURIs, type) {
    var str = "";
    for (var i = 0; i < resourceURIs.length; i++) {
        if(i > 0) {
            str += " ";
        }
        str += resourceURIs[i];
    }
    var loadId = "multiResourceEditDialog";
    var params = {
        loadId : loadId,
        resourceURIs : "\"" + str + "\"",
        resourceType : type,
        '_base' : swa.queryGraphURI,
        '_snippet' : true,
        '_viewClass' : "swa:MultiResourceEditDialog"
    };
    $('#swa-dialog-parent').load(swa.server + swa.servlet, params, function(data) {
        swa.openModalDialogHelper(loadId, 600, 500, [
            {
                text : "Save Changes",
                onclick : "swa.submitForm('multiResourceEditForm', 'swpEdit', 'swa.closeDialog(\"" + loadId + "\");swa.showEditSuccess(data)')"
            }
        ]);
    });
};


/**
 * Runs the search on a given Search form and then passes them into a
 * given multi-resource edit dialog (that must have been inserted somewhere).
 * @param searchFormId  the id of the search form
 */
swa.openMultiResourceEditDialogFromSearchForm = function(searchFormId) {
    swa.loadSearchResultsList(searchFormId, 1000, function(resourceURIs, resourceType) {
        if(resourceURIs.length < 2) {
            alert('Search needs to return at least 2 items. Found ' + resourceURIs.length + ".");
        }
        else {
            var list = "";
            for(var i = 0; i < resourceURIs.length; i++) {
                if(list.length > 0) {
                    list += " ";
                }
                list += resourceURIs[i];
            }
            var params = {
                _viewClass: "swa:CanDeleteResourcesService",
                _base: swa.queryGraphURI,
                resources: list
            };
            $.post("swp", params, function(data) {
                if(data.error) {
                    alert("Error: " + data.error);
                }
                else {
                    swa.openMultiResourceEditDialog(resourceURIs, resourceType);
                }
            });
        }
    });
};


/**
 * Opens a ProgressMonitor dialog
 * @param progressId
 * @param message
 */
swa.openProgressMonitorDialog = function(progressId, title, message, noCancel) {

    var win = $('<div><div class="swa-progress-task" id="swaProgressTask">&nbsp;</div>' +
                '<div class="swa-progress-subtask" id="swaProgressSubTask">&nbsp;</div></div>'),
        cancelActionIsAllowed = !noCancel,
        buttons = {};

    swa.progressMonitorDialogId = progressId;

    if(cancelActionIsAllowed) {
        buttons.Cancel = function() {
            $(this).dialog('close');
        };
    }

    swa.progressMonitorDialog = $(win).dialog({
        'modal' : true,
        'title' : title,
        'width' : '600px',
        'buttons' : buttons,
        'close' : function() {
            $(this).remove();

            if(cancelActionIsAllowed && !swa.progressMonitorDialog.programmatically) {
                var params = {
                        _format : 'json',
                        _snippet : true,
                        _viewClass : 'swa:CancelProgressCallback',
                        id : progressId
                };

                $.ajax({
                    'url': swa.server + swa.servlet,
                    'method': 'get',
                    'data': params,
                    'success': function (data, textStatus, jqXHR) {
                        // console.log(data);
                    },
                    'error': function (jqXHR, textStatus, errorThrown) {
                        console.log(errorThrown);
                    }
                });
            }
        	swa.progressMonitorDialog.programmatically = false;
        }
    });

    eval(swa.updateProgressMonitorDialog(progressId));
};


/**
 * Loads and opens a context menu for an element with a given id.
 * The provided resourceGetter expression will be evaluated to retrieve
 * the currently selected resource, e.g. the selected tree node.
 * Then it makes a server call-back to retrieve all matching actions
 * for the selected resource (via a SPIN template).
 * @param parentId  the HTML id of the element to attach the menu to
 * @param resourceGetter  an expression that returns a resource URI, null for no menu
 * @param queryGraphURI  the URI of the current query graph
 * @param appName  the name of the current app (if any)
 * @param readOnly  true to only show actions allowed for read-only mode
 */
swa.openResourceActionsMenu = function(parentId, resourceGetter, queryGraphURI, appName, canDeleteResourceFunction, readOnly) {

    $.contextMenu('destroy', '#' + parentId);
    var resourceURI = eval(resourceGetter);
    if(resourceURI) {
        var data = {
            '_base' : queryGraphURI,
            '_viewClass' : 'swa:ResourceActionsCallback',
            'appName' : appName,
            'readOnly' : readOnly,
            'resource' : resourceURI
        };
        if(canDeleteResourceFunction && canDeleteResourceFunction != "") {
            data['_contextswaCanDeleteResourceFunction'] = "<" + canDeleteResourceFunction + ">";
        }
        swa.openActionsMenuHelper(parentId, data, queryGraphURI, resourceURI,
                function(actionName) {
                    swa.executeSWPResourceAction(actionName, resourceURI);
                },
                function (expr) {
                    eval(expr);
                }
        );
    }
};


/**
 * Opens a resource selection dialog for instances of a given type.
 * Currently simply shows an auto-complete, but future versions may also
 * have a tree with a grid of matching instances.
 * @param typeURI  the URI of the (base) type
 * @param callback  a JavaScript expression that is called on success. The variables
 *                  resource and label will be bound when this expression executes.
 * @param title  an optional title for the dialog
 */
swa.openResourceSelectionDialog = function(typeURI, callback, title) {
    var loadId = 'myParamDialog';
    var params = {
            callback: callback,
            dataGraph: '<' + swa.queryGraphURI + '>',
            loadId: loadId,
            resourceType: '<' + typeURI + '>',
            _base: swa.queryGraphURI
    };
    if(title) {
        params['label'] = title;
    }
    swa.loadModalDialog('swa:ResourceSelectionDialog', loadId, params, 400);
};

//EVN-569 : to get rich text comments and the link to concept plugin to work
swa.openResourceSelectionDialogComments = function(typeURI, callback, title) {

    var loadId = 'myParamDialog';
    var params = {
            callback: callback,
            dataGraph: '<' + swa.queryGraphURI + '>',
            loadId: loadId,
            resourceType: '<' + typeURI + '>',
            _base: swa.queryGraphURI
    };
    if(title) {
        params['label'] = title;
    }
    swa.loadModalDialogComments('swa:ResourceSelectionDialog', loadId, params, 400);
};

/**
 * Deprecated: use swa.openViewResourceDialog.
 *
 * Loads and then opens a dialog that was inserted into the current
 * document using swa:ResourceViewDialog.
 * @param loadId  the id of the loadable (same as arg:loadId of the swa:ResourceViewDialog)
 * @param resourceURI  the URI of the resource to display
 * @param width  (optional) the width in pixels
 * @param height  (optional) the height in pixels
 */
swa.openResourceViewDialog = function(loadId, resourceURI, width, height) {
    swa.load(loadId, { resource: '<' + resourceURI + '>' }, function() {
        swa.openModalDialogHelper(loadId, width, height);
    });
};


/**
 * Loads and opens a context menu with all valid SearchResultsActions.
 * @param parentId  the HTML id of the element to attach the menu to
 * @param formId  the id of the form (not used right now)
 * @param appName  the SWA application name
 */
swa.openSearchResultsActionsMenu = function(parentId, formId, appName, searchGraph) {
    $.contextMenu('destroy', '#' + parentId);
    var data = {
        '_base' : swa.queryGraphURI,
        '_viewClass' : 'swa:SearchResultsActionsCallback',
        appName : appName,
        searchGraph : searchGraph
    };
    swa.openActionsMenuHelper(parentId, data, swa.queryGraphURI, null, null,
            function(expr) {
                eval(expr);
            }
    );
};


/**
 * Opens a modal dialog in which the user can enter arguments of a given SPARQLMotion
 * service.  Ok will execute the SM service.
 * The script must be defined in a .sms. file that is also imported by a .ui. file,
 * so that the script is part of the globally registered SWP graphs.
 * The file may also have a double ending such as .sms.ui.ttl
 * @param title  the title of the dialog
 * @param script  the qname of the script (for sparqlmotion servlet)
 * @param callback  a JavaScript expression that shall be evaluated after the
 *                  script completed: can access the result of the script as 'data'.
 */
swa.openSPARQLMotionDialog = function(title, script, callback) {
    var loadId = 'myParamDialog';
    var params = {
            callback: "swa.callSPARQLMotionScript('" + script + "', data, '" + callback + "')",
            dataGraph: '<' + swa.queryGraphURI + '>',
            label: title,
            loadId: loadId,
            resourceType: script,
            _base: 'http://uispin.org/ui#graph'
    };
    swa.loadModalDialog('swa:ParamsDialog', loadId, params, 600);
};


swa.templateCallDialogCounter = 0;


/**
 * Opens a swa:TemplateCallDialog that can be used to execute available templates.
 * @param templates  the URI of a SPIN template that delivers the available templates
 * @param selectedResourceURI  the URI of a selected resource to pre-populate the argument forms (optional)
 * @param callback  a JS script that shall be called if the user selects a match in the results
 */
swa.openTemplateCallDialog = function(templates, treeDataProvider, selectedResourceURI, callback) {
    var loadId = 'templateCallDialog' + swa.templateCallDialogCounter++;
    var params = {
            callback: '"' + callback + '"',
            loadId: loadId,
            templates: '<' + templates + '>',
            treeDataProvider : '<' + treeDataProvider + '>',
            _base: swa.queryGraphURI,
            _viewClass: 'swa:TemplateCallDialog',
            _snippet: true
    };
    if(selectedResourceURI) {
        params.selectedResource = '<' + selectedResourceURI + '>';
    }
    $('#swa-dialog-parent').load(swa.server + swa.servlet, params, function(data) {
        var div = $('#div-' + loadId);
        var title = div.attr('title');
        var options = {
                modal: false,
                title: title,
                width: 600,
                height: 500
        };
        div.dialog(options);
    });
};


/**
 * Called when the user clicks on the selection button next to the drop down
 * of the template call dialog.
 * @param treeDataProvider  the URI of a TreeDataProvider for the tree
 * @param selectId  the id of the select that shall be updated when OK clicked
 */
swa.openTemplateSelectionDialog = function(treeDataProvider, selectId) {
    var loadId = 'myTemplateSelectionDialog';
    var params = {
            loadId: loadId,
            selectId : selectId,
            treeDataProvider : '<' + treeDataProvider + '>'
    };
    swa.loadModalDialog('swa:TemplateSelectionDialog', loadId, params, 700);
};


/**
 * Makes sure that all roots of a given tree are opened.
 * Can be used as callback arg:onLoaded.
 * @param treeId  the id of the tree to open
 */
swa.openTreeRoots = function(treeId) {

    var tree = $('#' + treeId);

    tree.children("ul").children("li").each(function(i, o) {
        var child = $(o);
        tree.jstree('open_node', child);
    });
};


/**
 * Opens an swa:EditResourceDialog for a given resource.
 * @param resourcURI  the URI of the resource to edit
 * @param title  (optional) the title of the dialog
 * @param width  (optional) the width of the dialog
 * @param height  (optional) the height of the dialog
 */
swa.openEditResourceDialog = function(resourceURI, title, width, height) {
    var loadId = 'swaTheEditResourceDialog';
    var params = {
            loadId: loadId,
            resource: (resourceURI.indexOf('<') == 0) ? resourceURI : '<' + resourceURI + '>',
            _base: swa.queryGraphURI,
            _snippet: true,
            _viewClass: 'swa:EditResourceDialog'
    };
    if(title) {
        params.title = title;
    }
    if(!width) {
        width = 620;
    }
    if(!height) {
        height = 500;
    }

    $('#swa-dialog-parent').load(swa.server + swa.servlet, params, function(data) {

        var okButton = {
                text : "OK",
                onclick : "swa.handleEditResourceDialogOk(\"" + loadId + "\");"
        };
        var cancelButton = {
                text : "Cancel",
                onclick : "swa.closeDialog(\"" + loadId + "\");"
        }
        var buttons = [ okButton, cancelButton ];
        swa.openModalDialogHelper(loadId, width, height, buttons, true);
    });
};


swa.handleEditResourceDialogOk = function(loadId) {
    var params = $('#form-' + loadId).serialize();
    var onSuccess = "swa.closeDialog(\"" + loadId + "\");";
    swa.submitEdits(params, onSuccess, null, "form-" + loadId);
};


/**
 * Opens an swa:ViewResourceDialog for a given resource with a button to switch to edit mode
 * (which in fact just opens a corresponding swa:EditResourceDialog).
 * @param resourcURI  the URI of the resource to edit
 * @param title  (optional) the title of the dialog
 * @param width  (optional) the width of the dialog
 * @param height  (optional) the height of the dialog
 */
swa.openSwitchableResourceDialog = function(resourceURI, title, width, height) {
    var loadId = 'swaTheViewResourceDialog';
    var params = {
            loadId: loadId,
            resource: (resourceURI.indexOf('<') == 0) ? resourceURI : '<' + resourceURI + '>',
            _base: swa.queryGraphURI,
            _snippet: true,
            _viewClass: 'swa:ViewResourceDialog'
    };
    if(title) {
        params.title = title;
    }
    if(!width) {
        width = 600;
    }
    if(!height) {
        height = 500;
    }

    $('#swa-dialog-parent').load(swa.server + swa.servlet, params, function(data) {

        var editButton = {
                text : "Edit",
                onclick : "var uri = $('#div-" + loadId + "').attr('resource'); swa.closeDialog(\"" + loadId + "\");swa.openEditResourceDialog(uri);"
        };
        var closeButton = {
                text : "Close",
                onclick : "swa.closeDialog(\"" + loadId + "\");"
        }
        var buttons = [ editButton, closeButton ];
        swa.openModalDialogHelper(loadId, width, height, buttons, true);
    });
};


swa.openSimpleValidationResultsDialog = function(data) {
    var str = "Validation Results:";
    $.each(data.validationResults, function(i, result) {
        var message = result.message;
        if(!message) {
            message = "(Missing violation message)";
        }
        str += "\n- " + message;
    });
    alert(str);
};


swa.openValidationResultsDialog = function(data, formId) {
    var loadId = "MyValidationDialog";
    var params = {
        dataGraph: swa.queryGraphURI,
        loadId: loadId,
        _base: "<" + data.sessionGraph + ">"
    };
    if(formId) {
        params.editFormId = formId;
    }
    if(data.violationsBlockEditing != true && formId) {
        params.canOK = true;
    }
    var buttons = [];
    if(params.canOK && !data.failed) {
    	buttons.push({
    		text : "Save Changes",
    		onclick : "swa.submitEditsFromValidationResultsDialog('" + formId + "');swa.closeDialog('" + loadId + "');"
    	});
    }
    buttons.push({
        text : params.canOK ? "Cancel" : "Close",
       	onclick : "swa.deleteSessionGraph('" + data.sessionGraph + "');swa.closeDialog('" + loadId + "');"
    });
	swa.loadModalDialog('swa:ValidationResultsDialog', loadId, params, 680, 400, buttons);
};


/**
 * Opens an swa:ViewResourceDialog for a given resource.
 * @param resourcURI  the URI of the resource to display
 * @param title  (optional) the title of the dialog
 * @param width  (optional) the width of the dialog
 * @param height  (optional) the height of the dialog
 */
swa.openViewResourceDialog = function(resourceURI, title, width, height) {
    var loadId = 'swaTheViewResourceDialog';
    var params = {
            loadId: loadId,
            resource: '<' + resourceURI + '>',
            _base: swa.queryGraphURI
    };
    if(title) {
        params.title = title;
    }
    if(!width) {
        width = 600;
    }
    if(!height) {
        height = 500;
    }
    swa.loadModalDialog('swa:ViewResourceDialog', loadId, params, width, height);
};


swa.overrideActiveTab = function(id, storageKey, tabName) {
    var index = $('#' + id + ' a[href="#' + id + '-' + tabName + '"]').parent().index();
    localStorage.setItem(storageKey, index);
};


/**
 * Called when the user clicks the Search button under the FormSearchGadget.
 * Converts the name-value pairs from the search form into a search:Search RDF instance
 * and then publishes an event to notify the result displays.
 * @param formId  the id of the search form
 * @param searchGraphURI  the session graph to write to
 * @param searchEvent  the search event to publish
 */
swa.performSearchFormSearch = function(formId, searchGraphURI, searchEvent) {
    if (swa.formHasDirtyFields(formId)) {
        alert("Please correct errors in the search form.");
    } else {
        var params = swa.getSearchParamsFromForm(formId);
        params += "&searchGraph=" + searchGraphURI;

        $.ajax({
            'url': swa.servletURL('createSearchRDF'),
            'method': 'post',
            'dataType': 'text',
            'data': params,
            'success': function (data, textStatus, jqXHR) {
                // console.log('successful post');
                // console.log(data);
                gadgets.Hub.publish(searchEvent, searchGraphURI);
            },
            'error': function (jqXHR, textStatus, errorThrown) {
                console.log(errorThrown);
                // handle the error here...
            }
        });
    }
};


/**
 * Called by the faceted search.
 * Copies the selected columns from a given search form into the search graph
 * and then triggers the search event (to update the grid).
 */
swa.performSearchUsingColumnsFromForm = function(searchGraph, search, formId, searchEvent) {
	var form = $("#" + formId);
	var keyProperties = "";
	$.each(form.find('.swa-key-property-input'), function(idx, element) {
		if($(element).hasClass('swa-key-property-checked') || $(element).hasClass('swa-key-property-count')) {
			var value = $(element).attr('value');
	        var subVar = $($(element).closest('.swa-nested-form')).attr('name');
	        if(subVar == undefined) {
	        	if(keyProperties.length > 0) {
	        		keyProperties += " ";
	        	}
	        	if($(element).hasClass('swa-key-property-count')) {
	        		keyProperties += "#";
	        	}
        		keyProperties += value.substring(1, value.length - 1);
	        }
		}
	});
	var params = {
		_viewClass : "swa:SetSearchKeyProperties",
		_base : searchGraph,
		search : "<" + search + ">",
		keyProperties : '"' + keyProperties + '"'
	};
	$.get(swa.servlet, params, function() {
		gadgets.Hub.publish(searchEvent, searchGraph);
	});
};


/**
 * Reacts on an event published by a trigger property to update an auto-complete
 * representing a dynamic enum range.
 * @param id  the id of the hidden field holding the actual value
 * @param subject  the subject resource
 * @param predicate  the predicate to get the values for
 * @param kind  "Edits" or "Search"
 * @param data  the data delivered by the event
 * @param triggerProperties  a space-separated list of URIs of properties that
 *                           shall trigger an update of the giben dynamic range
 */
swa.perhapsUpdateDynamicEnumRangeAutoComplete = function(id, subject, predicate, kind, data, triggerProperties) {
    // Using manual walkthrough of array - $.inArray did not work reliably
    var ts = triggerProperties.split(" ");
    var found = false;
    ts.forEach(function(entry) {
        if(entry == data.predicate) {
            found = true;
        }
    });
    if(found == true) {
        swa.updateDynamicEnumRangeAutoComplete(id, subject, predicate, kind);
    }
};


/**
 * Called when edits have been made.  Takes the server response JSON
 * as argument, and publishes it as an event "org.topbraid.swa.change"
 * to the event hub.
 * @param data  the data from the server
 * @param fromForm  true if this has been called from a form (which has
 *                  already been refreshed)
 */
swa.processEdits = function(data, fromForm) {
    // Publish edits as an event to the Hub
    gadgets.Hub.publish("org.topbraid.swa.change", data);
};


swa.promptLogMessage = function(params, onSuccess, servlet, formId) {

    var win = $('<div>' +
                '<div>Please enter a log message:</div>' +
                '<div><textarea id="swaLogMessageTextArea" rows="4" style="width:570px"/></div>' +
                '</div>');

    var dialog = $(win).dialog({
        'modal' : true,
        'title' : 'Saving Changes',
        'width' : '600px',
        'buttons': {
            'Ok' : function() {
                var message = $('#swaLogMessageTextArea').val();
                $(this).dialog('close');
                if(message != '') {
                    params += '&_logMessage=' + escape(message);
                }
                swa.submitEdits(params, onSuccess, servlet, formId);
            },
            'Cancel': function() {
                $(this).dialog('close');
            }
        },
        'close' : function() {
            $(this).remove();
        }
    });
};


/**
 * Can be called by edit widgets to publish an event so that other widgets
 * on the same form (or elsewhere) can update.
 * An example use case of this is dynamic enum ranges.
 * @param widgetId  the id of the widget DOM element that changed
 * @param subject  the URI of the subject on the search form
 * @param predicate  the URI of the predicate that changed
 */
swa.publishEditWidgetChangeEvent = function(widgetId, subject, predicate) {
    gadgets.Hub.publish("org.topbraid.swa.editWidgetChange", {
        "widgetId" : widgetId,
        "subject" : subject,
        "predicate" : predicate
    });
};


/**
 * Can be called by search facet (widgets) to publish an event so that other widgets
 * on the same form (or elsewhere) can update.
 * An example use case of this is dynamic enum ranges.
 * @param widgetId  the id of the widget DOM element that changed
 * @param subjectType  the URI of the type on the search form
 * @param predicate  the URI of the predicate that changed
 */
swa.publishSearchFacetChangeEvent = function(widgetId, subjectType, predicate) {
    gadgets.Hub.publish("org.topbraid.swa.searchFacetChange", {
        "widgetId" : widgetId,
        "subjectType" : subjectType,
        "predicate" : predicate
    });
};


/**
 * Makes sure that a link (generated with ui:createLink) redirects to the swa.servlet.
 * @param link  the link to redirect
 * @returns a new link
 */
swa.redirectLink = function(link) {
    // If necessary, make URL absolute
    if(link.indexOf('swp?') == 0) {
        return swa.servlet + link.substring(3);
    }
    else {
        return link;
    }
};


/**
 * Reloads a given tree completely
 * Or reloads any visible tree if given tree
 * can't be found
 * @param treeId  {String} the id of the tree
 */
swa.refreshTree = function(treeId) {
    if (typeof treeId != 'undefined') {
        $("#" + treeId).jstree(true).refresh();
    } else if ($('[treedataprovider]').length > 0) {
        $('[treedataprovider]:visible').jstree(true).refresh();
    }
};


/**
 * Reloads a given tree node (re-fetches its content from the server)
 * @param treeId  the id of the tree
 * @param nodeId  the (unescaped!) id of the tree node
 */
swa.reloadTreeNode = function(treeId, nodeId) {

    var $tree = $('#' + treeId).jstree(true),
        $nodeObj = $tree.get_node(nodeId);

    $tree.load_node($nodeObj);
};


/**
 * Reloads a number of nodes of a given tree.
 * @param treeId  the id of the tree to reload
 * @param nodeIds  an object where the keys are the ids of the nodes to load
 */
swa.reloadTreeNodes = function(treeId, nodeIds) {

    var nodeId;

    for (nodeId in nodeIds) {
        swa.reloadTreeNode(treeId, nodeId);
    }

};


/**
 * Refreshes a given tree node.
 * @param treeId  the id of the tree
 * @param nodeId  the (unescaped!) id of the tree node
 */
swa.refreshTreeNode = function(treeId, nodeId) {
    var $tree = $('#' + treeId).jstree(true),
        $nodeObj = $tree.get_node(nodeId);
    $tree.refresh_node($nodeObj);
};


/**
 * Refreshes a number of nodes of a given tree.
 * @param treeId  the id of the tree to refresh
 * @param nodeIds  an object where the keys are the ids of the nodes to refresh
 */
swa.refreshTreeNodes = function(treeId, nodeIds) {

    var nodeId;

    for (nodeId in nodeIds) {
        swa.refreshTreeNode(treeId, nodeId);
    }
};

/**
 * Refreshes a jqLayout
 * @param element  the jQuery wrapped DOM element for the layout container
 */
swa.relayout = function(element) {
    var layoutFunction = element.attr("layoutfunction");
    if(layoutFunction) {
        var layout = element.layout();
        layout.destroy();
        eval(layoutFunction + "()");
    }
    else {
        element.layout({ applyDefaultStyles: true }).resizeAll();
    }
}


swa.reloadDatatypeEditors = function() {
    var datatype = $(this).val();
    $(".swa-reload-on-datatype-change").each(function(index, element) {
        var id = $(element).attr("id");
        var params = {};
        if(datatype) {
            params.datatype = datatype;
        }
        swa.load(id, params);
    });
};


/**
 * Refreshes the content of the current page by re-running its most recent request.
 * @param gridId  the id of the grid to reload
 */
swa.reloadGrid = function(gridId) {
    $("#" + gridId).trigger("reloadGrid");
};


// private
swa.reloadSearchForm = function(loadId) {
    var data = {};
    swa.getSearchFormTypeSelect(loadId).each(function() {
        data.resourceType = '<' + $(this).val() + '>';
    });
    swa.load(loadId, data);
};


// private - called from menu items generated in swa:ObjectFacetWidgetsCallback
swa.replaceFacet = function(elementId, widgetURI) {
    $("#facetSelector-" + elementId).removeClass("swa-nested-form-facet-selector");
    swa.loadWithResource(elementId + '-loadable', 'selectedWidget', widgetURI);
};


/**
 * Imports a JS script into the header if it hasn't been imported before.
 * @param path  the path
 */
swa.requireJSLibrary = function(path) {
    if(!swa.importedFiles[path]) {
        swa.importedFiles[path] = true;
        $("head").append("<script src='" + path + "' type='text/javascript'/>");
    }
};


/**
 * Reloads the type switch of a search form with a given id, e.g.
 * if classes have been changed.
 * @param formId  the id of the form used when creating the swa:SearchForm
 * @param callback  an optional callback after loading
 */
swa.reloadSearchFormTypeSwitch = function(formId, callback) {
    var fun = null;
    if(callback) {
        fun = function() {
            eval(callback);
        }
    }
    swa.load(formId + "TypeSwitch", null, fun);
};


// private
swa.rememberLogMessageBoxStatus = function() {
    swa.logMessageBoxStatus = $('#logMessageBox').is(':checked');
};


swa.checkPostConfigChangeWarning = function() {
    if (swa.postConfigChangeWarning) {
        alert(swa.postConfigChangeWarning);
        swa.postConfigChangeWarning = null;
    }
};


swa.restartWarningOnChange = function(field, oldValue) {
    if (oldValue != '') {
        var newValue = $(field).val();
        if (oldValue != newValue) {
            swa.postConfigChangeWarning = 'A system restart will be required for this change to take effect.';
        } else {
            swa.postConfigChangeWarning = null;
        }
    }
};


swa.secureStorageWarningOnChange = function(field, oldValue) {
	var newValue = $(field).val();
	if (oldValue != newValue) {
		swa.postConfigChangeWarning = 'You must create a new secure storage file for this change to take effect.';
	} else {
		swa.postConfigChangeWarning = null;
	}
};


//private
swa.restoreLogMessageBoxStatus = function() {
    $('#logMessageBox').prop('checked', swa.logMessageBoxStatus ? 'checked' : null);
};

/**
 * Automatically resize a given jqGrid
 * @param paneDirection  this isn't used anymore and needs to be removed (pass null here for now)
 * @param paneElement  the DOM element for the pane that contains a jqGrid in a jQuery wrapper
 */
swa.resizeGrid = function(paneDirection, paneElement) {
    var gridId,
    gridArray = paneElement.find('[id*="gview_"]')

    // if any number of grids exist, iterate over them and resize accordingly
    if (gridArray.length > 0) {
        gridArray.each(function () {

            // get the id of the actual grid we init'd
            gridId = $(this).attr('id').split('_')[1];

             $('#' + gridId).jqGrid('resizeGrid');

        });
    }
};



/**
 * Programmatically "reverts" the edit of a given triple.
 * @param subjectURI
 * @param predicateURI
 * @param objectNode
 * @param deleted
 */
swa.revert = function(subjectNode, predicateURI, objectNode, deleted) {
    if(subjectNode.indexOf("<") != 0) {
        subjectNode = "<" + subjectNode + ">";
    }
    var params = {
            '_base' : swa.queryGraphURI,
            'resource-1' : subjectNode,
            'path-1' : '<' + predicateURI + '>'
    };
    if(deleted) {
        params['new-1'] = objectNode;
    }
    else {
        params['old-1'] = objectNode;
    }
    swa.submitEdits(params);
};


/**
 * Programmatically selects a given resource on a form.
 * Assumes that the given predicate is represented by a swa:URIResourceEditor.
 * May work incorrectly otherwise.
 * @param formId  the form id
 * @param predicateURI  the predicate to look for on the form
 * @param resourceURI  the URI of the resource
 * @param resourceLabel  the label of the resource
 */
swa.selectResourceOnForm = function(formId, predicateURI, resourceURI, resourceLabel) {
    $('#' + formId).find('[value="<' + predicateURI + '>"]').each(function() {
        var id = $(this).attr('name').substring(5);
        $('#new-' + id + '-field').val(resourceLabel);
        $('#new-' + id).val('<' + resourceURI + '>');
    });
};


/**
 * Private helper function - walks an array, expanding nodes along the way
 * @param $tree  jQuery object representing the tree
 * @param path  array of id's representing the shortest possible path from the root of the tree to the node that needs to be selected
 * @param index  an indexer that points to the current node in path
 */
swa.expandToAndSelectTreeNode = function ($tree, path, index) {

    var $jstree = $tree.jstree(true),
        i,
        nodeToSelect = '',
        nodeToExpand = '';

    $jstree.deselect_all();

    // if we are not at the end of the path, keep walking the array and opening nodes
    if (index < path.length - 1) {

        for (i = 0; i < index + 1; i++) {
            nodeToExpand += '<' + path[i] + '>';
            nodeToExpand += '::';
        }

        // manipulate the current path to create an ID in the format that is returned from the server
        var matchedId = nodeToExpand.split('::').reverse().join('::').slice(2) + '::1';

        // call recursively in the callback function after opening node completes
        // wait less than half a second to avoid race conditions
        setTimeout(function () {
            $jstree.open_node(matchedId, function () {
                swa.expandToAndSelectTreeNode($tree, path, index + 1);
            });
        }, 200);

    // we reached the end of the path, time to select
    } else {
        // reverse the array so we can programatically build
        // the id of the node we want to select/open
        // we do this because the id's assigned to each li
        // are reverse order from the path provided to this function
        path.reverse();

        for (i = 0; i < path.length; i++) {
            nodeToSelect += '<' + path[i] + '>';
            nodeToSelect += '::';
        }

        nodeToSelect += '1';

        $jstree.select_node(nodeToSelect, true);

        var domNodeToSelect = document.getElementById(nodeToSelect);

        setTimeout(function () {
        	if (domNodeToSelect !== null) {

        		var paneToScroll = $tree.parent()[0],
        			amountToScroll = $tree.find('[id="' + domNodeToSelect.getAttribute('id') + '"]')[0].offsetTop;

        		paneToScroll.scrollTop = amountToScroll;
        	}

        }, 500);

        // need to reload to ensure new children are visible
        $jstree.load_node(nodeToSelect);
    }
};


/**
 * Helper method used to add the key properties from the check boxes on the search
 * form to a URL.
 * @param form  the form
 * @returns the key properties string, starting with &
 */
swa.serializeKeyProperties = function(form) {
    var result = "";
    $.each(form.find('.swa-key-property-checked'), function(index, value) {
        var value = $(value).attr('value');
        result += '&keyProperty' + index + '=' + escape(value);
    });
    return result;
};


swa.servletURL = function(servletName) {
    if(swa.servlet != 'swp' && swa.endsWith(swa.servlet, '/swp')) {
        return swa.servlet.substring(0, swa.servlet.length - 3) + servletName;
    }
    else {
        return servletName;
    }
};


/**
 * Programmatically selects a given resource in a given auto-complete.
 * The label of the resource is loaded from the server based on its URI.
 * @param id  the id used by the auto-complete
 * @param resourceURI  the URI of the resource
 */
swa.setAutoCompleteResource = function(id, resourceURI) {

    var params = {
        _base : swa.queryGraphURI,
        _viewClass : 'swa:GetResourceLabel',
        resource : '<' + resourceURI + '>'
    };

    $.getJSON(swa.servlet, params, function(result) {

        var field = $('#' + id + '-field');
        field.val(result.label);
        field.removeClass('swa-auto-complete-dirty');

        var hiddenField = $('#' + id);
        hiddenField.val('<' + resourceURI + '>');

    });
};


/**
 * Programmatically selects a given class in the type selection above a given
 * search form.  Note that this function does not actually reload the search form.
 * @param formId  the form id used when the SearchForm was created
 * @param typeURI  the URI of the type to select
 */
swa.setSearchFormType = function(formId, typeURI) {
    swa.getSearchFormTypeSelect(formId).val(typeURI);
};


/**
 * Stores a value in the browser's localStorage.
 * See swa.getStorageValue for the reverse direction.
 * @param key  the key
 * @value value  the value
 */
swa.setStorageValue = function(key, value) {
    if(localStorage) {
        localStorage.setItem(key, value);
    }
    else {
        $.cookie(key, value);
    }
};


/**
 * Changes the title of an swa:Window.
 * @param windowId  the id of the window
 * @param title  the new title
 */
swa.setWindowTitle = function(windowId, title, subTitle) {
    $('#' + windowId + '-window-title').html(title);
    if(subTitle) {
        $('#' + windowId + '-window-subtitle').html(subTitle);
    }
};


/**
 * Changes the title of an swa:Window surrounding a given DOM element.
 * Does nothing if the parent does not exist.
 * @param childId  the id of the child
 * @param title  the new title
 */
swa.setWindowTitleIfExists = function(childId, title) {
    var window = $("#" + childId).closest(".swa-window");
    if(window) {
        var windowId = window.attr("id");
        if(windowId) {
            swa.setWindowTitle(windowId, title);
        }
    }
};


/**
 * Can be called after edits were handled to display the number of changed triples.
 * @param data  the JSON response with "added" and "deleted" attributes.
 */
swa.showEditSuccess = function(data) {
    alert("Added " + (data.added ? data.added : 0) +
            " and deleted " + (data.deleted ? data.deleted : 0) + " statements.");
};


/**
 * Displays the SPARQL query behind a Search form in a dialog.
 * @param formId  the id of the search form
 */
swa.showSearchQuery = function(formId) {
    var params = swa.getSearchParamsFromForm(formId);
    $.get('getSearchQuery?' + params, function(data) {
        var win = $('<div><pre id="queryDiv"></pre></div>');
        $(win.children()[0]).text(data.query);
        $(win).dialog({
            'modal' : true,
            'title' : 'SPARQL Query generated by Search Form',
            'width' : '800px',
            'buttons': {
                'OK': function() {
                    $(this).dialog('close');
                }
            }
        });
    });
};


/**
 * Used by submitForm, but can also be used to simulate form-like edits.
 * @param params  the params, like in the edit form
 * @param onSuccess  an optional call-back for after success
 * @param servlet  the servlet
 * @param formId  the id of the edit form
 * @param warningsAccepted  true if this has been called after warnings have been Ok'ed by the user
 */
swa.submitEdits = function(params, onSuccess, servlet, formId, warningsAccepted) {
    if(!servlet) {
        servlet = swa.servletURL('swpEdit');
    }
    if(warningsAccepted) {
        params += '&warningsAccepted=true';
        params += '&sessionGraph=' + encodeURIComponent(swa.validationSessionGraph);
        if(swa.validationSuggestions.length > 0) {
            var applySuggestions = "";
            for(var i = 0; i < swa.validationSuggestions.length; i++) {
                applySuggestions += swa.validationSuggestions[i] + " ";
            }
            params += '&applySuggestions=' + encodeURIComponent(applySuggestions);
        }
    }
    else {
        if(typeof params === 'object') {
            params.createSessionGraph = true;
        }
        else {
            params += '&createSessionGraph=true';
        }
    }
    $.post(swa.server + servlet, params, function(data) {
        if(data && (data.violations > 0 || data.warnings > 0)) {
            swa.updateFormErrors($('#' + formId), data.validationResults);
            swa.openValidationResultsDialog(data, formId);
        }
        else {

            if(onSuccess) {
                eval(onSuccess);
            }
            else if(formId) {
                if(data.labelChanges && data.rootResource && data.labelChanges[data.rootResource]) {
                    swa.switchToViewFormWithLabelChange(formId);
                }
                else {
                    swa.switchToViewForm(formId);
                }

                // Tell SwitchableFormGadget that it doesn't need to reload again on this event
                data['formAlreadyReloaded-' + formId] = true;
            }
            swa.processEdits(data, true);
        }
    });
};


swa.applySuggestion = function(suggestionNodeId, resultElementId) {
    swa.validationSuggestions.push(suggestionNodeId);
    $("#" + resultElementId).remove();
};


swa.callApplySuggestionService = function(suggestionNodeId, sessionGraph, dataGraph) {
    var params = {
        _base : dataGraph,
        _viewClass : "swa:ApplySuggestionService",
        sessionGraph : "<" + sessionGraph + ">",
        suggestion : suggestionNodeId
    };
    $.post(swa.servlet, params);
};


swa.submitEditsFromValidationResultsDialog = function(formId) {
    var params = $('#' + formId).serialize();
    var onSuccess = null;
    if("multiResourceEditForm" == formId) {
    	onSuccess = "swa.closeDialog('multiResourceEditDialog');swa.showEditSuccess(data)";
    }
    swa.submitEdits(params, onSuccess, null, formId, true);
};


/**
 * Submits a form and (by default) switches it to viewing mode when done.
 * On the server this also performs validation of constraints.
 * If at least one constraint violation or warning is found, the system will not
 * automatically accept the edits but instead display a dialog with suggestions
 * on how to fix the validation results.
 * If the server is configured to block on violations, this dialog will only have
 * a button to return to the form, discarding the edits.
 * Otherwise, the dialog has a button to Save the changes, which will call swa.submitEdits
 * again, with the warningsAccepted flag set to true.
 *
 * @param formId  the id of the form
 * @param servlet  the optional name of the servlet
 * @param onSuccess  a JS snippet that is called on success, if unset will switch form only
 */
swa.submitForm = function(formId, servlet, onSuccess) {
    if (swa.formHasDirtyFields(formId)) {
        alert("Please correct errors in the edit form.");
    } else {
        var params = $('#' + formId).serialize();
        if(swa.logMessageBoxStatus) {
            swa.promptLogMessage(params, onSuccess, servlet, formId);
        }
        else {
            swa.submitEdits(params, onSuccess, servlet, formId);
        }
    }
};


/**
 * Submits a search form, simulating a click on the Search button.
 * @param formId  the id of the form (arg:formId passed into the swa:FormSearchGadget)
 */
swa.submitSearchForm = function(formId) {
    $("#" + formId + "-search-button").trigger("click");
};


/**
 * Called by the swa:ParamsDialog when the user hits OK.
 * Submits the form to the server which either returns a JSON object with
 * name-value-pairs or a JSON with constraint violations.
 * Closes the dialog and calls a given function on success.
 * @param loadId  the dialog id
 * @param callback  a JavaScript expression that shall be called on success
 *                  (the variable data is bound to the result from the server)
 */
swa.submitParamsDialog = function(loadId, callback) {
    var formId = loadId + '-form';
    var params = {};
    $.each($('#' + formId).serializeArray(), function(_, kv) {
        params[kv.name] = kv.value;
    });
    //params['_base'] = ''; // 'http://uispin.org/ui#graph';
    $.post(swa.server + swa.servletURL('swpCreateParams'), params, function(data) {
        if(data && data.violations > 0) {
            swa.updateFormErrors($('#' + formId), data.validationResults);
            swa.openSimpleValidationResultsDialog(data);
        }
        else {
            swa.closeDialog(loadId);
            eval(callback);
        }
    });
};


swa.switchMultiGadgetWindow = function(parentId, childIndex) {
    // Note: this is setting the previously visible child to display:none
    //       and makes sure that the new focused child is the first child
    //       because the layout algorithm will use that one even if hidden.
    //       The parent (swa:BorderLayout or swa:FullScreenBorderLayout)
    //       has stored its relayout function in an attribute.
    // TODO: This totally resets the layout to the defaults - there may be
    //       a better way that preserves previous settings.
    var newChild = $("#" + parentId + "-child-" + childIndex);
    var layoutParent = newChild.parent();
    for(var i = 0; i < 10; i++) {
        var child = $("#" + parentId + "-child-" + i);
        if(i == childIndex) {
            child.removeClass("swa-display-none");
        }
        else {
            child.addClass("swa-display-none");
        }
        // child.css("display", i == childIndex ? "" : "none");
        if(i != childIndex && child.length > 0) {
            var c = child[0];
            layoutParent[0].removeChild(c);
            layoutParent[0].appendChild(c);
        }
    }
    swa.relayout(layoutParent);
};


// Private: called by the ViewForm when the user presses Edit
swa.switchToEditForm = function(formId) {
    $('#' + formId + '-actionsButton').css('visibility', 'hidden');
    $('#' + formId + '-editButton').css('visibility', 'hidden');
    $('#' + formId + '-historyModeBoxDiv').css('visibility', 'hidden');
    $('#' + formId + '-provenanceModeBoxDiv').css('visibility', 'hidden');
    swa.load(formId + '-loadable', { editing : true }, function() {
        $('#' + formId + '-editModeButtonBar').css('display', '');
    });
};


swa.switchToManchesterSyntaxEditor = function(elementId, typeURI) {
    var uid = elementId.substring(4);
    swa.load("swa-object-row-" + uid, { "editWidgetOverride" : "<http://topbraid.org/swa#ManchesterSyntaxEditor>" }, function() {
        $("#new-" + uid).focus();
    });
};


// Private: called by the ViewForm when the user presses Cancel or after submitting
swa.switchToViewForm = function(formId) {
    $('#' + formId + '-editModeButtonBar').css('display', 'none');
    var params = { editing : false };
    $('#' + formId + '-historyModeBox').each(function() {
        if($(this).is(':checked')) {
            params['viewModeName'] = '\"history\"';
        }
    });
    $('#' + formId + '-provenanceModeBox').each(function() {
        if($(this).is(':checked')) {
            params['viewModeName'] = '\"provenance\"';
        }
    });
    swa.load(formId + '-loadable', params, function() {
        $('#' + formId + '-actionsButton').css('visibility', '');
        $('#' + formId + '-editButton').css('visibility', '');
        $('#' + formId + '-historyModeBoxDiv').css('visibility', '');
        $('#' + formId + '-provenanceModeBoxDiv').css('visibility', '');
    });
};


// Can be overloaded to reload the area surrounding the form
swa.switchToViewFormWithLabelChange = function(formId) {
    swa.switchToViewForm(formId);
};


/**
 * Called when the user clicks on the open/close button in an openable
 * object, such as swa:Objects or swa:ObjectsEnum where openable=true.
 * @param bodyId  the id of the body to hide/show
 * @param buttonId  the id of the div with the button
 */
swa.toggleOpenableObject = function(bodyId, buttonId) {
    var button = $('#' + buttonId);
    var body = $('#' + bodyId);
    if(button.hasClass('ui-icon-triangle-1-s')) { // It's open
        button.removeClass('ui-icon-triangle-1-s');
        button.addClass('ui-icon-triangle-1-e');
        body.css('display', 'none');
    }
    else {
        button.removeClass('ui-icon-triangle-1-e');
        button.addClass('ui-icon-triangle-1-s');
        body.css('display', '');
    }
};

swa.updateCreateResourceDialog = function() {
    var val = $('#type-select').val();
    if(val.indexOf('-') == 0) {
        swa.loadWithResource("create-resource-dialog-body", "primaryKeyClass", val.substring(1));
    }
};


/**
 * Initializes an auto-complete field backed by a dynamic enum range.
 * Uses a special servlet which simulates the edits on the provided form
 * and then executes the SELECT query behind the spl:dynamicEnumRange.
 * @param id  the id of the hidden field holding the actual value
 * @param subject  the subject resource
 * @param predicate  the predicate to get the values for
 * @param kind  "Edits" or "Search"
 */
swa.updateDynamicEnumRangeAutoComplete = function(id, subject, predicate, kind) {
    var field = $("#" + id + "-field");
    var hidden = $("#" + id);
    var form = hidden.closest("form");
    var params = form.serialize();
    field.val(null);
    hidden.val(null);
    if(subject) {
        params += "&_subject=" + escape(subject);
    }
    params += "&_predicate=" + escape(predicate);
    $.post(swa.server + "swpGetDynamicEnumRangeFor" + kind, params, function(data) {
        field.autocomplete("option", "source", data);
        $.each(data, function(index, item) {
            if(item.selected) {
                field.val(item.label);
                hidden.val(item.node);
            }
        });
    });
};


/**
 * Called to write a virtual node into a hidden text field, based on input string and selected language
 * @param uid  the uid of the swa:ExactMatchStringFacet
 */
swa.updateExactMatchStringFacet = function(uid) {
    var str = $('#' + uid + '-text').val();
    if(str && str != '') {
        var lang = $('#' + uid + '-lang').val();
        var val = '"' + str + '"';
        if(lang && lang != '') {
            val += '@' + lang;
        }
        else {
            // Work-around to TDB bug (TDB does not handle untyped as typed literals).
            // Can be deleted in future versions, once TDB has been fixed/replaced.
            val += '^^<http://www.w3.org/2001/XMLSchema#string>';
        }
        $('#' + uid + '-hidden').val(val);
    }
    else {
        $('#' + uid + '-hidden').val('');
    }
};


/**
 * Displays or clears the error indicators on a given form, based
 * on an array of validation result (as produced by the SHACL/SPIN validation).
 * The implementation is quite naive and incomplete, and assumes that all
 * violations have the currently edited resource as its subject.
 * @param form  the id of the form containing the indicators
 * @param results  the validation results to display
 */
swa.updateFormErrors = function(form, results) {
    $(form).find('.swa-property-label').each(function(index, itemElement) {
        var item = $(itemElement);
        var e = false;
        $.each(results, function(i, result) {
            var predicate = result.predicate;
            if(predicate) {
                if(item.attr('id') == 'property-label-' + predicate.substring(1, predicate.length - 1)) {
                    e = true;
                    item.addClass('swa-error');
                    item.attr('title', result.message);
                }
            }
        });
        if(!e) {
            item.removeClass('swa-error');
            item.removeAttr('title');
        }
    });
};


/**
 * Called after edits to an swa:ManchesterSyntaxEditor - marks the field as valid or not
 * based on a service callback.
 * The callback is done with a delay so that fast-typing people don't overload the server.
 */
swa.updateSourceCodeEditor = function(uid, callback, subject, predicate) {

    var old = swa.updateTimeouts[uid];
    if(old) {
        clearTimeout(old);
    }

    swa.updateTimeouts[uid] = setTimeout(function() {

        delete swa.updateTimeouts[uid];

        var field = $("#new-" + uid);
        var params = {
            _base : swa.queryGraphURI,
            _viewClass : callback,
            text : field.val()
        };
        if(subject) {
        	params.subject = subject;
        }
        if(predicate) {
        	params.predicate = predicate;
        }
        $.get(swa.servlet, params, function(data) {
            if(data.error) {
                field.addClass("swa-auto-complete-dirty");
                field.attr("title", data.error);
            }
            else {
                field.removeClass("swa-auto-complete-dirty");
                field.removeAttr("title");
            }
        });
    }, 250);
};


/**
 * Called by a timer to fetch a progress update from the server, and then recursively
 * starts a new timer.
 */
swa.updateProgressMonitorDialog = function(progressId) {
    var params = {
    		_viewClass : 'swa:ProgressJSONCallback',
            id : progressId
        };

    $.ajax({
        'url': swa.server + swa.servlet,
        'method': 'get',
        'dataType': 'text',  // HK: Shouldn't this be application/json ?
        'data': params,
        'success': function (data, textStatus, jqXHR) {

        	if(typeof data === 'string') {
        		try {
        			data = JSON.parse(data);
        		}
        		catch(ex) {
        			data = null;
        		}
        	}

            if (data) {
                if (data.task) {
                    $('#swaProgressTask').html(data.task);
                    $('#swaProgressSubTask').html(data.subTask);
                } else {
                    $('#swaProgressTask').html('Please wait');
                    swa.insertLoadingIndicator($('#swaProgressSubTask'));
                }

                setTimeout("swa.updateProgressMonitorDialog('" + progressId + "')", 250);
            }
            else if (swa.progressMonitorDialogId == progressId) {
                swa.closeProgressMonitorDialog();
            }
        },
        'error': function (jqXHR, textStatus, errorThrown) {
            console.log(errorThrown);
        }
    });

};


//private
swa.updateSelectedTemplate = function(templateURI, selectId) {
    var option = $('[id="option-' + templateURI + '"]');
    option.attr('selected', 'selected');
    $('#' + selectId).change();
};


/**
 * Renames all nodes of a given Tree in response to an incoming change.
 * @param treeId  the id of the tree to update
 * @param change  the change (delivered by the server)
 */
swa.updateTreeLabels = function(treeId, change) {
    if(change.labelChanges) {
        var tree = $('#' + treeId);
        for(var key in change.labelChanges) {
            var newLabel = change.labelChanges[key];
            tree.find('li[data-resource="' + key + '"]').each(function(index, node) {
                var c = $(node).children("a").contents();
                c[c.length - 1].nodeValue = newLabel;
            });
        }
    }
};


/**
 * DEACTIVATED: unknown from where this is/was used
 *
 * Validates a form and updates the errors.
 * @param form  the id of the form
 * @returns false to stop further processing
 *
swa.validateForm = function(form) {
    var params = $(form).serialize();
    $.getJSON(swa.server + swa.servletURL('swpEdit') + '?validateOnly=true&' + params, function(data) {
        if(data.violations > 0) {
            swa.updateFormErrors(form, data.validationResults);
        }
        else {
            swa.updateFormErrors(form, []);
        }
    });
    return false;
};*/


/**
 * Wraps a given URI or bnode id ("@...") with angular brackets.
 * @param  uri  the URI or null
 * @return the wrapped URI or null if uri is null
 */
swa.wrappedURI = function(uri) {
	if(uri) {
		return "<" + uri + ">";
	}
	else {
		return uri;
	}
};


// Deep linking
// See http://stackoverflow.com/questions/1844491/intercepting-call-to-the-back-button-in-my-ajax-application-i-dont-want-it-to

swa.hash = null;

swa.checkHash = function() {
    if (window.location.hash != swa.hash) {
        swa.hash = window.location.hash;
        if(swa.hash.length > 1) {
            // Work around Firefox bug: http://stackoverflow.com/questions/1703552/encoding-of-window-location-hash
            var href = window.location.href;
            var hashIndex = href.indexOf('#');
            var rawHash = hashIndex > 0 ? href.substring(hashIndex + 1) : href;
            var resourceURI;
            if(rawHash.indexOf(':') > 0) {
                resourceURI = rawHash; // Already decoded (Firefox page reload)
            }
            else {
                resourceURI = decodeURIComponent(rawHash);
            }
            gadgets.Hub.publish(swa.deepLinkingEvent, resourceURI);
        }
    }
};


/**
 * Sets up deep linking to synchronize the data payload of a given event with the hash part
 * of the window (browser bar) location.  This function should be called at most once.
 * @param event  the name of the event to publish and subscribe to
 * @param panel  the panel to show if a location has been given
 */
swa.initDeepLinking = function(event, panel) {

    swa.deepLinkingEvent = event;

    // Wait until any outstanding tree initialization callbacks have finished, then start updating
    $(document).one("ajaxStop", function() {
        setInterval(swa.checkHash, 100);
    });

    // Always remember resource from event in hash
    gadgets.Hub.subscribe(event, function(event, data) {
        window.location.hash = '#' + encodeURIComponent(data);
        swa.hash = window.location.hash;
    });

    if(panel) {
    	var hash = window.location.hash;
    	if(hash && hash.length > 1) {
    		var container = $(document.body);
    		container.layout().open(panel);
    	}
    }
};


// Facets support -------------------------------------------------------------


swa.getSummarySearchPageSize = function(id) {
    return parseInt($("#" + id + "-pageSize").val());
};


swa.openAutoCompleteFacetedSearchDialog = function(elementId, typeURI) {
    var loadId = 'myFacetedSearchDialog' + swa.getRunningIndex();
    var params = {
        callback: "swa.setAutoCompleteResource('" + elementId + "', resource)",
        loadId: '"' + loadId + '"',
        type: '<' + typeURI + '>',
        _base: '<' + swa.queryGraphURI + '>'
    };
    swa.loadModalDialog('swa:SelectionFacetedSearchDialog', loadId, params, 1000, 600);
};


/**
 * Displays a faceted search dialog based on a given Search form.
 * @param formId  the id of the search form
 */
swa.openDerivedFacetedSearchDialog = function(formId, resourceSelectedEvent) {
    var searchGraphURI = $('#' + formId).attr('searchGraph');
    var params = swa.getSearchParamsFromForm(formId);
    params += "&searchGraph=" + searchGraphURI;
    $.ajax({
        'url': swa.servletURL('createSearchRDF'),
        'method': 'post',
        'dataType': 'text',
        'data': params,
        'success': function (data, textStatus, jqXHR) {
            var loadId = 'myFacetedSearchDialog';
            var params = {
                    baseSearchGraph: '<' + searchGraphURI + '>',
                    loadId: '"' + loadId + '"',
                    resourceSelectedEvent: resourceSelectedEvent,
                    _base: '<' + swa.queryGraphURI + '>'
            };
            swa.loadModalDialog('swa:DerivedFacetedSearchDialog', loadId, params, 1000, 600);
        },
        'error': function (jqXHR, textStatus, errorThrown) {
            console.log(errorThrown);
            // handle the error here...
        }
    });
};


swa.reloadSummarySearchResults = function(id, startIndex, searchGraph) {
    var params = {
        pageSize : swa.getSummarySearchPageSize(id),
        searchGraph : "<" + searchGraph + ">",
        startIndex : startIndex
    };
    var sortField = $("#" + id + "-sortField").val();
    if(sortField && sortField != "") {
        params.sortProperty = "<" + sortField + ">";
    }
    swa.load(id, params);
};


swa.toggleTwiddle = function(twiddleId) {
    var body = $('#' + twiddleId + '-body');
    var icon = $('#' + twiddleId + '-twiddle-icon');
    if(body.css('display') == 'none') {
        body.css('display', '');
        icon.removeClass('swa-facets-icon-chevron-up');
        icon.addClass('swa-facets-icon-chevron-down');
    }
    else {
        body.css('display', 'none');
        icon.addClass('swa-facets-icon-chevron-up');
        icon.removeClass('swa-facets-icon-chevron-down');
    }
};


// Charts support -------------------------------------------------------------

swa.displayChartFromSearch = function(formId) {
    var params = swa.getSearchParamsFromForm(formId);
    $.get('getSearchQuery?chartFriendly=true&' + params, function(data) {
        var loadId = "chartBuilderDialog" + swa.getRunningIndex();
        if($("body").hasClass("ui-layout-container")) {
            var params = {
                queryString : data.query
            };
            swa.openGadgetWindow("swa:ChartBuilderGadgetWindow", params, "south");
        }
        else {
            var params = {
                _base: '<' + swa.queryGraphURI + '>',
                loadId : '"' + loadId + '"',
                queryString : data.query
            };
            swa.loadModalDialog("swa:ChartBuilderDialog", loadId, params, 640, 500);
        }
    });
};


swa.openChartQueryEditorDialog = function(id, queryString) {
    var loadId = "chartQueryEditorDialog" + swa.getRunningIndex();
    var str = queryString.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    var params = {
        id : id,
        loadId : loadId,
        queryString : str
    }
    swa.loadModalDialog("swa:ChartQueryEditorDialog", loadId, params, 540, 480);
};


swa.reloadChartPanel = function(id, queryString) {
    var chartClass = $("#select" + id).val();
    if(chartClass) {
        // Here we decode < and > characters that the SWP code replaced with &lt; and &gt;
        // to work around jQuery's bug where it tries to close HTML tags when > is encountered.
        var str = queryString.replace(/\n/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
        var params = {
                chartClass : "<" + chartClass + ">",
                queryString : '"' + str.replace(/"/g, '\\"') + '"'
        };
        swa.load("load" + id, params);
    }
};


// Class Diagram support ------------------------------------------------------

swa.initClassDiagram = function(id, subClassEdges, associationEdges) {

    // $("#" + id).children(".swauml-class-node").draggable({ containment: "parent" });

    var g = new dagre.graphlib.Graph({
        multigraph : true
    });
    g.setGraph({});
    g.setDefaultEdgeLabel(function() { return {}; });
    $("#" + id).children(".swauml-class-node").each(function(index, e) {
        var rs = e.getClientRects();
        var width = rs[0].width;
        var height = rs[0].height;
        var iri = $(e).attr("about");
        g.setNode(iri, { width: width, height: height });
    });

    $.each(subClassEdges, function(index, e) {
        g.setEdge(e.superClass, e.subClass, {}, "subClass-" + e.superClass + " " + e.subClass);
    });

    $.each(associationEdges, function(index, e) {
        var label = $("#" + id).children("[about=\"label " + e.sourceClass + " " + e.targetClass + " " + e.predicate + "\"]");
        var rs = label[0].getClientRects();
        var width = rs[0].width;
        var height = rs[0].height;
        var name = e.predicate + " " + e.sourceClass + " " + e.targetClass;
        g.setEdge(e.sourceClass, e.targetClass, {
            predicate : e.predicate,
            width : width,
            height : height
        }, name);
    });

    dagre.layout(g);

    var offset = 20;
    var maxX = 40;
    var maxY = 40;
    g.nodes().forEach(function(v) {
        var node = g.node(v);
        var nodeElement = $("#" + id).children("[about=\"" + v + "\"]");
        nodeElement.css("left", offset + node.x - node.width / 2);
        nodeElement.css("top", offset + node.y - node.height / 2);
        maxX = Math.max(maxX, offset + node.x + node.width / 2 + offset);
        maxY = Math.max(maxY, offset + node.y + node.height / 2 + offset);
    });

    g.edges().forEach(function(e) {
        var edge = g.edge(e);
        var origin = edge.points[0];
        var points = "";
        $.each(edge.points, function(index, element) {
            points += "" + (offset + edge.points[index].x) + "," + (offset + edge.points[index].y) + " ";
        });
        if(edge.predicate) {
            var lineElement = $("#" + id).find("[about=\"" + e.v + " " + e.w + " " + edge.predicate + "\"]");
            lineElement.attr("points", points);
            var labelElement = $("#" + id).find("[about=\"label " + e.v + " " + e.w + " " + edge.predicate + "\"]");
            labelElement.css("left", offset + edge.x - edge.width / 2);
            labelElement.css("top", offset + edge.y - edge.height / 2);
            maxX = Math.max(maxX, offset + edge.x + edge.width / 2 + offset);
            maxY = Math.max(maxY, offset + edge.y + edge.height / 2 + offset);
        }
        else {
            var lineElement = $("#" + id).find("[about=\"" + e.v + " " + e.w + "\"]");
            lineElement.attr("points", points);
        }
    });

    $("#" + id).css("height", maxY + "px");
    $("#" + id).css("width", maxX + "px");
};



// Maps support ---------------------------------------------------------------


// Keys are the ?ids, values are the Map objects
swa.googleMaps = {};

// Keys are the ?ids, values are arrays of Marker objects
swa.googleMapMarkers = {};

// Keys are the ?ids, values the ?searchGraph URIs
swa.googleMapSearchGraphs = {};

// Timer jobs
swa.googleMapUpdating = {};


swa.initGoogleMap = function(id, searchGraph) {
    if(false && navigator.geolocation) { // Disabled because it does not work consistently on FF
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude;
            var long = position.coords.longitude;
            swa.initGoogleMapWithPosition(id, searchGraph, lat, long);
        }, function(error) {
            swa.initGoogleMapWithPosition(id, searchGraph, -34.397, 150.644);
        });
    }
    else {
        swa.initGoogleMapWithPosition(id, searchGraph, -34.397, 150.644);
    }
};


swa.initGoogleMapWithPosition = function(id, searchGraph, lat, long) {
    var mapOptions = {
        center: new google.maps.LatLng(lat, long),
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    swa.googleMaps[id] = new google.maps.Map(document.getElementById(id), mapOptions);
    swa.googleMapMarkers[id] = {};
    google.maps.event.addListener(swa.googleMaps[id], 'bounds_changed', function() {
        if(!swa.googleMapUpdating[id]) {
            swa.googleMapUpdating[id] = true;
            setTimeout(function() {
                swa.googleMapUpdating[id] = false;
                swa.updateMapMarkers(id);
            }, 1000);
        }
    });
};


swa.removeGoogleMapMarkers = function(id) {
    var markers = swa.googleMapMarkers[id];
    if(markers) {
        for (var resource in markers) {
            markers[resource].setMap(null);
        }
    }
};


swa.updateMapMarkers = function(id) {
    var searchGraph = swa.googleMapSearchGraphs[id];
    if(searchGraph) {
        var map = swa.googleMaps[id];
        var bounds = map.getBounds();
        var params = {
            maxLat : bounds.getNorthEast().lat(),
            minLat : bounds.getSouthWest().lat(),
            maxLong : bounds.getNorthEast().lng(),
            minLong : bounds.getSouthWest().lng(),
            searchGraph : "<" + searchGraph  + ">"
        };
        swa.load(id + '-loadable', params);
    }
};


// Windowing/Layout support ---------------------------------------------------


/**
 * Closes a window that was previously opened (using swa.openGadgetWindow).
 * This will remove any direct parent div if that is left with only one additional
 * child (and make that child take the closed window's place in the layout).
 * @param id  the id of the window to close
 */
swa.closeWindow = function(id) {
    swa.unsubscribeWindow(id);
    var parent = $("#" + id).parent();
    if(parent.hasClass("swa-gadget-window-layout-panel")) {
        parent.layout().destroy();
        $("#" + id).remove();
        var center = parent.children(".ui-layout-center");
        var newParent = parent.parent();
        var oldPane = swa.getLayoutPane(parent);
        parent[0].removeChild(center[0]);
        newParent[0].appendChild(center[0]);
        newParent[0].removeChild(parent[0]);
        center.removeClass("ui-layout-center");
        center.addClass("ui-layout-" + oldPane);
        swa.relayout(newParent);
    }
    else {
        throw "swa.closeWindow is only supported for windows opened with swa.openGadgetWindow()";
    }
};


/**
 * Loads a window with of a given type using provided arguments and then inserts that window
 * into a given pane of the provided parent, or the innermost center pane of the application.
 * @param windowClass  the qname of the window class to load (e.g. "swa:GenericTreeGadgetWindow")
 * @param params  the arguments passed into the servlet to load the window. May include things
 *                like window id, title and sub-title depending on the actual window class.
 *                The window id actually does not need to be specified explicitly.
 * @param pane  the pane to insert the new window into ("west", "east", "north" or "south")
 * @param parent  the parent jQuery element or null for the default center container
 */
swa.openGadgetWindow = function(windowClass, params, pane, parent) {

    if(!parent) {
        parent = swa.getCenterPane();
    }

    if(!params) {
        params = {};
    }

    params._base = swa.queryGraphURI;
    params._snippet = true;
    params._viewClass = windowClass;
    params.layoutPanel = '"' + pane + '"';
    if(!params.id) {
        params.id = '"gadgetWindow_' + swa.getRunningIndex() + '"';
    }
    if(!params.resourceSelectedEvent && swa.deepLinkingEvent) {
        params.resourceSelectedEvent = "\"" + swa.deepLinkingEvent + "\"";
    }

    var servlet = swa.servlet;
    var context = $(document.body).attr("uicontext");
    if(context && context != "") {
        servlet += "?" + context;
    }

    $.post(servlet, params, function(data) {

        // Create new div with the same layout position
        var div = $("<div class=\"swa-gadget-window-layout-panel\"></div>");
        var oldPane = swa.getLayoutPane(parent);
        if(!oldPane) {
            throw "Parent pane does not declare a suitable layout pane as its class";
        }
        div.addClass("ui-layout-" + oldPane);
        div.css("width", parent.css("width"));
        div.css("height", parent.css("height"));
        div.css("position", parent.css("position"));
        div.css("left", parent.css("left"));
        div.css("top", parent.css("top"));

        // Move (old) parent under new div and reset its layout pane to "center"
        var container = parent.parent()[0];
        $(container).layout().destroy();
        container.removeChild(parent[0]);
        div[0].appendChild(parent[0]);
        parent.removeClass("ui-layout-" + oldPane);
        parent.addClass("ui-layout-center");

        container.appendChild(div[0]);

        // Insert new window into its new div parent
        var window = $(data);
        div.append(window);

        swa.relayout($(container));
        div.layout({ applyDefaultStyles: true }).resizeAll();
    });
};


/**
 * Gets the innermost "center" pane of the application.
 * Starting at the body, this walks recursively into all elements with class
 * "ui-layout-center".
 */
swa.getCenterPane = function() {
    var container = $(document.body);
    for(;;) {
        var child = container.children(".ui-layout-center");
        if(child.length == 1) {
            container = child;
        }
        else {
            return container;
        }
    }
};


/**
 * Gets the layout pane (e.g. "center") of a given element.
 * @param element  the element to get the pane of
 */
swa.getLayoutPane = function(element) {
    var dirs = [
        "center", "north", "south", "west", "east"
    ];
    for(var i = 0; i < dirs.length; i++) {
        if($(element).hasClass("ui-layout-" + dirs[i])) {
            return dirs[i];
        }
    }
    return null;
};


/**
 * Applies an existing view to the body for print purposes
 * @param viewId  the id of the element who's content you have to print
 */
swa.printView = function (viewId) {
	var $content = $('#' + viewId).html(),
		$body = $('body');

	if ($body.attr('layoutfunction') !== undefined) {
		// destory the jQuery layout so you can scroll
		$body.layout().destroy();
	}

	$body.html($content);

	$body.prepend(
		'<h1 class="swa-hidden-print-element">' +
		'<a onclick="window.location.reload();">Refresh This Page to Go Back</a>' +
		'<br><span>Or</span><br>' +
		'<a onclick="window.print();">Print</a>' +
		'</h1>'
		);
};


// Some global initialization code for jQuery ---------------------------------

var beforeUnloadCalled = false;

$().ready(function(){

    $(window).on('beforeunload', function() {
        beforeUnloadCalled = true;
    });

    // Force charset=UTF-8 to be used - otherwise non-unicode characters will fail
    // on Chrome and tomcat on Windows (JIRA EVN-160)
    $.ajaxSettings.contentType = "application/x-www-form-urlencoded; charset=UTF-8";

    // Global error handling
    $(document).ajaxError(function(event, request, settings, error) {
        if('abort' != error && !beforeUnloadCalled) {
            if (error != undefined && error) {
                if(typeof error === 'string' || error instanceof String) {
                    var start = error.indexOf('Summary: [');
                    if(start > 0) {
                        var end = error.indexOf(']', start);
                        if(end > start) {
                            error = error.substring(start + 10, end);
                        }
                    }
                }
            }
            alert('Server Interaction Error: ' + error + '\n\nIf you believe this is an unexpected error, you may want to contact the system administrator and/or refresh your browser before continuing.');
        }
    });
});


/**
* An associative array where the values are the ids of swa:Windows and the keys
* are subscriptions, as returned by the subscribe call.
*
*/
swa.eventsRegistry = {};


/**
* Registers a subscription so that it can be unsubscribed later.
* @param sub  the subscription id (results of subscribe call)
* @param windowId  the id of the window (or null)
* @param ownerId  the id of an owner DOM element (or null)
*/
swa.registerSubscription = function(sub, windowId, ownerId) {
    if(windowId && windowId != '') {
        swa.eventsRegistry[sub] = windowId;
    }
    if(ownerId && ownerId != '') {
        $("#" + ownerId).on("remove", function () {
            gadgets.Hub.unsubscribe(sub);
        });
    }
};


/**
* Unsubscribes all subscriptions associated with a given swa:Window.
* @param windowId  the id of the window to unsubscribe
*/
swa.unsubscribeWindow = function(windowId) {
    $.each(swa.eventsRegistry, function(index, value) {
        if(value == windowId) {
            gadgets.Hub.unsubscribe(index);
            delete swa.eventsRegistry[index];
        }
    });
};

swa.setLocalSearchSubtitle = function(windowId) {
    $('#' + windowId + '-window-subtitle').html(swa.searchMemoryModel ? '(Within ExploreSpace)' : '');
};


/**
* Inspects the user agent to detect the os type
* @returns  {String} the os platform or null
*/
swa.detectOsType = function () {
	var ua = navigator.userAgent,
		osType;

	if (ua.indexOf('Macintosh') !== -1) {
		osType = 'mac';
	} else if (ua.indexOf('Linux') !== -1) {
		osType = 'linux';
	} else if (ua.indexOf('Windows') !== -1) {
		osType = 'win';
	} else {
		osType = null;
	}

	return osType;
};

// Simulates an OpenSocial container
var gadgets = {

    // gadgets.Hub can be used for inter-gadget eventing, see
    // http://opensocial-resources.googlecode.com/svn/spec/2.5/Core-Gadget.xml#interGadgetEventing
    Hub : OpenAjax.hub
};


