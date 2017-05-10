<?xml version="1.0" encoding="utf-8" ?>
<xsl:transform
  xmlns:adms    = "http://www.example.org/ns/adms#"
  xmlns:cc      = "http://creativecommons.org/ns#"
  xmlns:dcat    = "http://www.w3.org/ns/dcat#"
  xmlns:dcterms = "http://purl.org/dc/terms/"
  xmlns:foaf    = "http://xmlns.com/foaf/0.1/"
  xmlns:org     = "http://www.w3.org/ns/org#"
  xmlns:owl     = "http://www.w3.org/2002/07/owl#"
  xmlns:rdf     = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:rdfs    = "http://www.w3.org/2000/01/rdf-schema#"
  xmlns:schema  = "http://schema.org/"
  xmlns:sh      = "http://www.w3.org/ns/shacl#"
  xmlns:sioc    = "http://rdfs.org/sioc/ns#"
  xmlns:skos    = "http://www.w3.org/2004/02/skos/core#"
  xmlns:vann    = "http://purl.org/vocab/vann/"
  xmlns:voaf    = "http://labs.mondeca.com/vocab/voaf#"
  xmlns:vs      = "http://www.w3.org/2003/06/sw-vocab-status/ns#"
  xmlns:wdrs    = "http://www.w3.org/2007/05/powder-s#"
  xmlns:xhv     = "http://www.w3.org/1999/xhtml/vocab#"
  xmlns:xsl     = "http://www.w3.org/1999/XSL/Transform"
  xmlns:xsd     = "http://www.w3.org/2001/XMLSchema"
  xmlns         = "http://www.w3.org/1999/xhtml"

  version="1.0"
>

  <xsl:output method="html"
              doctype-public="html"
              media-type="text/html"
              indent="yes" />

  <xsl:param name="l">
    <xsl:text>en</xsl:text>
  </xsl:param>
<!--
  <xsl:param name="fc">
    <xsl:text>http://inspire.ec.europa.eu/featureconcept/featureconcept.en.rdf</xsl:text>
  </xsl:param>
-->
  <xsl:template name="substring-after-last">
    <xsl:param name="string" />
    <xsl:param name="delimiter" />
    <xsl:choose>
      <xsl:when test="contains($string, $delimiter)">
        <xsl:call-template name="substring-after-last">
          <xsl:with-param name="string" select="substring-after($string, $delimiter)" />
          <xsl:with-param name="delimiter" select="$delimiter" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$string" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="local-name-from-expanded-name">
    <xsl:param name="string" />
    <xsl:choose>
      <xsl:when test="contains($string, '#')">
        <xsl:value-of select="substring-after($string, '#')"/>
      </xsl:when>
      <xsl:when test="contains($string, '/')">
        <xsl:call-template name="substring-after-last">
          <xsl:with-param name="string" select="$string"/>
          <xsl:with-param name="delimiter" select="'/'"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$string" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="range-list">
    <xsl:choose>
      <xsl:when test="sh:datatype|sh:or|sh:xone|sh:and">
        <xsl:for-each select="sh:datatype">
          <xsl:choose>
            <xsl:when test="@rdf:resource">
              <code><xsl:value-of select="@rdf:resource"/></code>
            </xsl:when>
          </xsl:choose>
        </xsl:for-each>
        <xsl:for-each select="sh:or/*/sh:datatype">
          <xsl:choose>
            <xsl:when test="@rdf:resource">
              <code><xsl:value-of select="@rdf:resource"/></code><xsl:text> | </xsl:text>
            </xsl:when>
          </xsl:choose>
        </xsl:for-each>
      </xsl:when>
      <xsl:otherwise>
        <em>undefined</em>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="class_list">

    <xsl:for-each select="rdf:RDF/sh:NodeShape">

    <xsl:variable name="local_name">
      <xsl:call-template name="local-name-from-expanded-name">
        <xsl:with-param name="string" select="@rdf:about" />
      </xsl:call-template>
    </xsl:variable>
<!--
    <xsl:if test="substring($local_name,1,1) = translate(substring($local_name,1,1),'abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ')">
-->
<!--
    <li>
      <a href="#{$local_name}">
        <var>
          <xsl:value-of select="$local_name"/>
        </var>
      </a>
    </li>
-->
    <li>
      <a href="#{$local_name}">
        <var>
<!--
          <xsl:value-of select="dcterms:identifier"/>
-->
          <xsl:value-of select="rdfs:label"/>
        </var>
      </a>
    </li>
<!--
    </xsl:if>
-->
    </xsl:for-each>

  </xsl:template>

  <xsl:template name="class_definitions">

    <xsl:for-each select="rdf:RDF/sh:NodeShape">

    <xsl:variable name="definition" select="skos:definition/@rdf:resource"/>

    <xsl:variable name="local_name">
      <xsl:call-template name="local-name-from-expanded-name">
        <xsl:with-param name="string" select="@rdf:about" />
      </xsl:call-template>
    </xsl:variable>
<!--
    <xsl:if test="substring($local_name,1,1) = translate(substring($local_name,1,1),'abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ')">
-->
    <h2 id="{$local_name}">Class <em><xsl:value-of select="rdfs:label"/></em></h2>
<!--
    <table class="term" id="{$local_name}">
-->
<!--
    <table class="term" id="{dcterms:identifier}">
-->
    <table class="term">
<!--
      <thead>
        <tr>
          <th colspan="2">Term&#xa0;Name:
            <var>
              <xsl:value-of select="$local_name"/>
            </var>
          </th>
        </tr>
      </thead>
-->
      <tbody>
        <tr>
          <th>Type&#xa0;of&#xa0;Term</th>
          <td>Class</td>
        </tr>
        <tr>
          <th>Status</th>
          <td>
            <xsl:choose>
              <xsl:when test="vs:term_status and normalize-space(vs:term_status) != ''">
                <xsl:choose>
                  <xsl:when test="normalize-space(vs:term_status) = 'unstable'">
                    <strong><xsl:value-of select="vs:term_status"/></strong>
                  </xsl:when>
                  <xsl:when test="normalize-space(vs:term_status) = 'testing'">
                    <em><xsl:value-of select="vs:term_status"/></em>
                  </xsl:when>
                  <xsl:when test="normalize-space(vs:term_status) = 'stable'">
                    <span><xsl:value-of select="vs:term_status"/></span>
                  </xsl:when>
                  <xsl:otherwise>
                    <em><xsl:value-of select="vs:term_status"/></em>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:when>
              <xsl:otherwise>
                <em>unknown</em>
              </xsl:otherwise>
            </xsl:choose>
          </td>
        </tr>
        <tr>
          <th>QName</th>
          <td>
            <code><xsl:value-of select="dcterms:identifier"/></code>
          </td>
        </tr>
        <tr>
          <th>URI</th>
          <td>
            <code>
              <xsl:value-of select="sh:targetClass/@rdf:resource"/>
            </code>
          </td>
        </tr>
        <tr>
          <th>Shape URI</th>
          <td>
            <code>
              <xsl:value-of select="@rdf:about"/>
            </code>
          </td>
        </tr>
<!--
        <tr>
          <th>Label</th>
          <td>
            <xsl:value-of select="rdfs:label"/>
          </td>
        </tr>
-->
<!--
        <tr>
          <th>Label @xx</th>
          <td>Where possible, provide natural language labels for the term in other languages xx</td>
        </tr>
-->

        <xsl:for-each select="rdfs:subClassOf">
        <tr>
          <th>Subclass&#xa0;of</th>
          <td><code><xsl:value-of select="@rdf:resource"/></code></td>
        </tr>
        </xsl:for-each>

        <xsl:for-each select="rdfs:isDefinedBy">
        <tr>
          <th>Is&#xa0;defined&#xa0;by</th>
          <td><a href="{@rdf:resource}" target="_blank"><xsl:value-of select="@rdf:resource"/></a></td>
        </tr>
        </xsl:for-each>

        <tr>
          <th>Definition</th>
          <td>
<!--
            <xsl:copy-of select="rdfs:comment"/>
-->
            <xsl:for-each select="rdfs:comment/child::node()|rdfs:comment/child::text()">
              <xsl:copy-of select="."/>
            </xsl:for-each>
          </td>
        </tr>
<!--
        <tr>
          <th>Definition @xx</th>
          <td>Where possible, provide definitions in additional languages</td>
        </tr>
-->
        <xsl:if test="vann:usageNote">
          <tr>
            <th>Usage&#xa0;Note</th>
            <td>
<!--
              <xsl:value-of select="vann:usageNote"/>
-->
              <xsl:for-each select="vann:usageNote/child::node()|vann:usageNote/child::text()">
                <xsl:copy-of select="."/>
              </xsl:for-each>
            </td>
          </tr>
        </xsl:if>
        <xsl:if test="rdfs:seeAlso">
          <tr>
            <th>See&#xa0;also</th>
            <td>
<!--
              <xsl:value-of select="rdfs:seeAlso"/>
-->
              <xsl:for-each select="rdfs:seeAlso/@rdf:resource">
                <a href="{.}"><xsl:value-of select="."/></a>
              </xsl:for-each>
            </td>
          </tr>
        </xsl:if>
      </tbody>
    </table>
<!--
    </xsl:if>
-->
    </xsl:for-each>

  </xsl:template>


  <xsl:template name="property_list" >

  <xsl:for-each select="rdf:RDF/sh:PropertyShape">

    <xsl:variable name="local_name">
      <xsl:call-template name="local-name-from-expanded-name">
        <xsl:with-param name="string" select="@rdf:about" />
      </xsl:call-template>
    </xsl:variable>
<!--
    <xsl:if test="substring($local_name,1,1) = translate(substring($local_name,1,1),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')">
-->
<!--
    <li>
      <a href="#{$local_name}">
        <var>
          <xsl:value-of select="$local_name"/>
        </var>
      </a>
    </li>
-->
    <li>
      <a href="#{$local_name}">
        <var>
<!--
          <xsl:value-of select="dcterms:identifier"/>
-->
          <xsl:value-of select="rdfs:label"/>
        </var>
      </a>
    </li>
<!--
    </xsl:if>
-->
    </xsl:for-each>

  </xsl:template>

  <xsl:template name="property_definitions" >

  <xsl:for-each select="rdf:RDF/sh:PropertyShape">

    <xsl:variable name="local_name">
      <xsl:call-template name="local-name-from-expanded-name">
        <xsl:with-param name="string" select="@rdf:about" />
      </xsl:call-template>
    </xsl:variable>
<!--
    <xsl:if test="substring($local_name,1,1) = translate(substring($local_name,1,1),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')">
-->
    <h2 id="{$local_name}">Property <em><xsl:value-of select="rdfs:label"/></em></h2>
<!--
    <table class="term" id="{$local_name}">
-->
<!--
    <table class="term" id="{dcterms:identifier}">
-->
    <table class="term">
<!--
      <thead>
        <tr>
          <th colspan="2">Term&#xa0;Name:
            <var>
              <xsl:value-of select="$local_name"/>
            </var>
          </th>
        </tr>
      </thead>
-->
      <tbody>
        <tr>
          <th>Obligation</th>
          <xsl:choose>
            <xsl:when test="sh:severity/@rdf:resource = 'http://www.w3.org/ns/shacl#Violation'">
              <td>Mandatory</td>
            </xsl:when>
            <xsl:when test="sh:severity/@rdf:resource = 'http://www.w3.org/ns/shacl#Warning'">
              <td>Recommended</td>
            </xsl:when>
            <xsl:when test="sh:severity/@rdf:resource = 'http://www.w3.org/ns/shacl#Info'">
              <td>Optional</td>
            </xsl:when>
            <xsl:otherwise>
              <td><em>unknown</em></td>
            </xsl:otherwise>
          </xsl:choose>
        </tr>
        <tr>
          <th>Type&#xa0;of&#xa0;Term</th>
          <td>Property</td>
        </tr>
        <tr>
          <th>Status</th>
          <td>
            <xsl:choose>
              <xsl:when test="vs:term_status and normalize-space(vs:term_status) != ''">
                <xsl:choose>
                  <xsl:when test="normalize-space(vs:term_status) = 'unstable'">
                    <strong><xsl:value-of select="vs:term_status"/></strong>
                  </xsl:when>
                  <xsl:when test="normalize-space(vs:term_status) = 'testing'">
                    <em><xsl:value-of select="vs:term_status"/></em>
                  </xsl:when>
                  <xsl:when test="normalize-space(vs:term_status) = 'stable'">
                    <span><xsl:value-of select="vs:term_status"/></span>
                  </xsl:when>
                  <xsl:otherwise>
                    <em><xsl:value-of select="vs:term_status"/></em>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:when>
              <xsl:otherwise>
                <em>unknown</em>
              </xsl:otherwise>
            </xsl:choose>
          </td>
        </tr>
        <tr>
          <th>QName</th>
          <td>
            <code><xsl:value-of select="dcterms:identifier"/></code>
          </td>
        </tr>
        <tr>
          <th>URI</th>
          <td>
            <code>
              <xsl:value-of select="sh:path/@rdf:resource"/>
            </code>
          </td>
        </tr>
        <tr>
          <th>Shape URI</th>
          <td>
            <code>
              <xsl:value-of select="@rdf:about"/>
            </code>
          </td>
        </tr>
<!--
        <tr>
          <th>Label</th>
          <td>
            <xsl:value-of select="rdfs:label"/>
          </td>
        </tr>
-->
<!--
        <tr>
          <th>Label @xx</th>
          <td>Where possible, provide natural language labels for the term in other languages xx</td>
        </tr>
-->
        <xsl:for-each select="rdfs:subPropertyOf">

<!--        <xsl:if test="rdfs:range">-->
        <tr>
          <th>Subproperty of</th>
          <td>
            <code><xsl:value-of select="@rdf:resource"/></code>
          </td>
        </tr>
        </xsl:for-each>

        <xsl:for-each select="owl:inverseOf">

<!--        <xsl:if test="rdfs:range">-->
        <tr>
          <th>Inverse of</th>
          <td>
            <code><xsl:value-of select="@rdf:resource"/></code>
          </td>
        </tr>
        </xsl:for-each>

        <xsl:if test="rdfs:domain">
        <tr>
          <th>Domain</th>
          <td>
            <code><xsl:value-of select="rdfs:domain/@rdf:resource"/></code>
          </td>
        </tr>
        </xsl:if>

        <tr>
          <th>Range</th>
          <td>
            <xsl:call-template name="range-list"/>
          </td>
        </tr>

        <xsl:if test="rdfs:subPropertyOf">
        <tr>
          <th>Subproperty&#xa0;of</th>
          <td><code><xsl:value-of select="rdfs:subPropertyOf/@rdf:resource"/></code></td>
        </tr>
        </xsl:if>

        <xsl:for-each select="rdfs:isDefinedBy">
        <tr>
          <th>Is&#xa0;defined&#xa0;by</th>
          <td><a href="{@rdf:resource}" target="_blank"><xsl:value-of select="@rdf:resource"/></a></td>
        </tr>
        </xsl:for-each>

        <tr>
          <th>Definition</th>
          <td>
<!--
            <xsl:value-of select="rdfs:comment"/>
-->
            <xsl:for-each select="rdfs:comment/child::node()|rdfs:comment/child::text()">
              <xsl:copy-of select="."/>
            </xsl:for-each>
          </td>
        </tr>
<!--
        <tr>
          <th>Definition @xx</th>
          <td>Where possible, provide definitions in additional languages</td>
        </tr>
-->
        <xsl:if test="vann:usageNote">
          <tr>
            <th>Usage&#xa0;Note</th>
            <td>
<!--
              <xsl:value-of select="vann:usageNote"/>
-->
              <xsl:for-each select="vann:usageNote/child::node()|vann:usageNote/child::text()">
                <xsl:copy-of select="."/>
              </xsl:for-each>
            </td>
          </tr>
        </xsl:if>
        <xsl:if test="rdfs:seeAlso">
          <tr>
            <th>See&#xa0;also</th>
            <td>
<!--
              <xsl:value-of select="rdfs:seeAlso"/>
-->
              <xsl:for-each select="rdfs:seeAlso/@rdf:resource">
                <a href="{.}"><xsl:value-of select="."/></a>
              </xsl:for-each>
            </td>
          </tr>
        </xsl:if>
      </tbody>
    </table>
<!--
    </xsl:if>
-->
    </xsl:for-each>

  </xsl:template>

  <xsl:template match="/">

    <xsl:param name="uri" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/@rdf:about"/>
    <xsl:param name="title" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/rdfs:label"/>
    <xsl:param name="version" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/owl:versionInfo"/>
    <xsl:param name="creationDate" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:created"/>
    <xsl:param name="issueDate" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:issued"/>
    <xsl:param name="lastModifiedDate" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:modified"/>
    <xsl:param name="date" select="$lastModifiedDate"/>
    <xsl:param name="preferredNamespace" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/vann:preferredNamespaceUri"/>
    <xsl:param name="preferredPrefix" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/vann:preferredNamespacePrefix"/>
    <xsl:param name="abstract" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:abstract"/>
    <xsl:param name="documentation" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/wdrs:describedby/rdf:Description/@rdf:about"/>
    <xsl:param name="uml" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/foaf:depiction/rdf:Description" />
    <xsl:param name="documentationTitle" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#']/wdrs:describedby/rdf:Description/dcterms:title"/>
    <xsl:param name="methodology" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:conformsTo/*/@rdf:about"/>
    <xsl:param name="methodologyTitle" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:conformsTo/*/dcterms:title"/>
    <xsl:param name="forum" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:relation/sioc:Forum/@rdf:about"/>
    <xsl:param name="forumTitle" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:relation/sioc:Forum/dcterms:title"/>
    <xsl:param name="licence" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:license/rdf:Description/@rdf:about"/>
    <xsl:param name="licenceTitle" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:license/rdf:Description/dcterms:title"/>
    <xsl:param name="latestDocUri" select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/@rdf:about"/>
    <xsl:param name="thisDocUri" select="$uri"/>

    <html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
      <head>
        <meta charset="utf-8" />
        <title>
          <xsl:value-of select="$title" />
        </title>
<!-- Include the HTML5 Shim to handle older browsers -->
<!--[if lt IE 9]>
     <script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>
<![endif]-->
        <meta name="viewport" content="width=device-width" />
        <meta charset="utf-8" />
        <link rel="canonical" href="{$latestDocUri}" />
        <link rel="license" href="{$licence}" />
        <xsl:for-each select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:hasFormat/rdf:Description">
          <xsl:choose>
            <xsl:when test="dcat:mediaType = 'text/html'">
              <link rel="self" href="{@rdf:about}" type="{dcat:mediaType}" title="{rdfs:label}" />
            </xsl:when>
            <xsl:otherwise>
              <link rel="alternate" href="{@rdf:about}" type="{dcat:mediaType}" title="{rdfs:label}" />
            </xsl:otherwise>
          </xsl:choose>
        </xsl:for-each>

<!--
        <link href="http://www.w3.org/StyleSheets/TR/base.css" rel="stylesheet" type="text/css" title="base W3C /TR styles" />
        <style type="text/css">
          table.term {
            width:100%;
            border-collapse:collapse;
            margin-bottom:2em;
          }
          table.term th, table.term td {
            padding: 0.2em 0.5em;
          }
          table.term th {
            text-align:left;
            padding-left:0;
          }
          table.term tbody th {
            width:8em;
          }
          table.term thead th {
            color: #005A9C;
          }
          section#generator {
            margin:1em 0;
            border-top: 1px solid #999;
          }

          section#generator p {
            text-align:right;
            font-style:italic;
          }
          ul.summaryList {
            list-style-type:none;
            display:block;
            width: 90%;
            margin: 0 auto;
            border: 1px solid black;
            padding: 1em;
            background-color: #ccc;
          }
          ul.summaryList li {
            display:inline-block;
            margin: 0 0.3em;
            line-height:1.5em;
          }
          figure {
            display:block;
            text-align:center;
          }
          figcaption {
            display:block;
            font-style: italic;
            font-size: smaller;
            font-weight: bold;
            margin:0.5em 0;
          }
        </style>
-->

<link type="text/css" rel="stylesheet" href="https://bootswatch.com/readable/bootstrap.css"/>
    <link type="text/css" rel="stylesheet" href="http://getbootstrap.com/assets/css/docs.min.css"/>
    <!-- HTML5 shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!--[if lt IE 9]>
      <script src="https://bootswatch.com/bower_components/html5shiv/dist/html5shiv.js"></script>
      <script src="https://bootswatch.com/bower_components/respond/dest/respond.min.js"></script>
    <![endif]-->
    <script type="text/javascript" src="https://code.jquery.com/jquery-1.11.3.min.js"></script>
    <script src="https://bootswatch.com/bower_components/bootstrap/dist/js/bootstrap.min.js"></script>
    <script src="http://getbootstrap.com/assets/js/docs.min.js"></script>
    <script type="text/javascript">
      $('html').css('visibility','hidden');
      $(document).ready(function() {
        $('head').append('<style type="text/css">@media all { #notes dl dt { text-align:left; } #references dt { width:3em;font-weight:normal;float:left;text-align:right; } #references dd { margin-left:4em; } } @media screen { .popover a, .tooltip a { overflow-wrap:break-word;word-break:break-all; } #references dt:target { border-left:solid 3px #f00;color:#aa6708; } #references dt:target, #references dt:target + dd { color:#aa6708; } } @media print { .tooltip, .popover, .print-version, .print-version + dd { visibility:hidden;display:none; } a:not([href^="#"]):after { content:" (" attr(href) ")"!important; } #notes .URL + dd a[href]:after, #references > dl > dd a[href]:after { content: none!important; } dt { page-break-after:avoid; } figure { page-break-inside:avoid; } article section p, article section li, article section dd { text-align:justify;hyphens:auto; } #references > dl > dd > a[href] { word-break:break-all;hyphens:manual; } }</style>');
        setRefNr();
//        addToc();
        $('body').addClass('row-fluid').attr('role', 'document');
        $('article').addClass('bs-docs-container clearfix container main').attr('role', 'main');
        $('article > header').addClass('page-header');
        $('article > header > dl').addClass('lead');
        $('article > header > dl').addClass('dl-horizontal');
        $('article > header > dl > dt').addClass('text-muted');
        $('article section').addClass('bs-docs-section');
        $('table').addClass('table');
        $('figure').addClass('figure');
        $('figure img').addClass('figure-img img-fluid');
        $('figcaption').addClass('figure-caption text-center');
        $('#glance ul').addClass('list-inline');
        $('#notes').addClass('small');
        $('#notes dl').addClass('dl-horizontal');
        $('#notes dt').addClass('text-muted');
        $('#notes .event').prepend('<span class="glyphicon glyphicon-home" style="margin-right:1em;"></span>');
        $('#notes .URL').prepend('<span class="glyphicon glyphicon-globe" style="margin-right:1em;"></span>');
        $('#notes .last-modified').prepend('<span class="glyphicon glyphicon-edit" style="margin-right:1em;"></span>');
        $('#notes .print-version').prepend('<span class="glyphicon glyphicon-print" style="margin-right:1em;"></span>');
        $('#disclaimer').addClass('bs-callout bs-callout-warning small');
        $('a').not('[href^="#"]').each( function () { $(this).attr('title', $(this).attr('href')); } );
        $('pre:has(code)').addClass('highlight');
        $('.example').addClass('bs-example');
        $('footer').addClass('container-fluid');
        $('[data-toggle="popover"]').each( function() { var $container = $(this); $container.popover({ container : $container , delay : { show : 0 , hide : 1000 } }); } );
        $('[data-toggle="tooltip"]').tooltip( { placement : "auto bottom" } );
        $('html').css('visibility','visible');
      } );
      function setRefNr() {
        var refItemList = '#references > *';
        $('#references > dl > dt').each(function( index ) {
          var refnr = index + 1;
          var html = $($(this).next('dd')).html();
          var text = $($(this).next('dd')).text().replace(/(\r\n|\n|\s+)/gm," ").trim();
          $(this).text('[' + refnr + ']');
          $('a[href=#' + $(this).attr('id') + ']').text( refnr ).attr('title', '' ).wrap('<span></span>');
          $('span:has(a[href=#' + $(this).attr('id') + '])').attr('title', '' ).attr('data-toggle', 'popover' ).attr('data-content', html ).attr('type', 'button' ).attr('data-placement', 'auto' ).attr('data-original-title','Reference').attr('data-html','true').attr('data-trigger','hover focus');
        } );
      }
      function addToc() {
        $('body').prepend('<nav id="sidetoc"></nav>');
        $('body').addClass('row-fluid').attr('role', 'document');
        $('nav').addClass('bs-docs-sidebar table-of-contents main-menu container hidden-print hidden-sm hidden-xs col-md-3').attr('role', 'complementary').attr('data-spy', 'affix');
        $('article').addClass('col-md-8 col-md-offset-3');
        $('nav#sidetoc').append('<ul><li class="navbar-header navbar-brand" style="float:none;">Contents</li></ul>');
        $('article > section :header').each( function() {
          var id = $(this).parent('section').attr('id');
          var parentid = $(this).parent('section').parent('section').attr('id');
          var text = $(this).text();
          var subsections = '';
          if ($(this).parent('section:has(section)')) {
            subsections = '<ul></ul>';
          }
          var tocitem = '<li><a href="#' + id + '">' + text + '</a>' + subsections + '</li>';
            if (parentid != undefined) {
              $('li:has(a[href=#' + parentid + ']) > ul').append(tocitem);
            }
            else {
              $('nav > ul').append(tocitem);
            }
        } );
        $('nav > ul').addClass('bs-docs-sidenav');
        $('nav ul').addClass('nav');
      }
    </script>

      </head>
      <body>
      <article>
        <header id="docHeader">
<!--
          <a href="http://joinup.ec.europa.eu/">
            <img src="joinup.png" alt="European Commission Joinup" id="branding" width="262" height="78" />
          </a>
-->
          <hgroup>
            <h1 id="docTitle">
              <xsl:value-of select="$title" />
            </h1>
            <h2 id="versionHeader">
              <xsl:value-of select="$version" /><xsl:text> - </xsl:text>
              <time datetime="{$date}">
                <xsl:value-of select="$date" />
              </time>
            </h2>
          </hgroup>
          <dl id="versionLinks">
<!--            <dt>This version:</dt>
            <dd>
              <a href="{$thisDocUri}"><xsl:value-of select="$thisDocUri"/></a>
            </dd> -->
            <dt>Latest version:</dt>
            <dd>
              <a href="{$latestDocUri}"><xsl:value-of select="$latestDocUri"/></a>
            </dd>
<!--            <dt>Previous version:</dt>
            <xsl:choose>
              <xsl:when test="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/xhv:prev">
            <dd>
              <a href="{rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/xhv:prev/@rdf:resource}"><xsl:value-of select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/xhv:prev/@rdf:resource"/></a>
            </dd>
              </xsl:when>
              <xsl:otherwise>
            <dd>None</dd>
              </xsl:otherwise>
            </xsl:choose> -->
<!--
         <dt>Alternative Representations</dt>
         <dd>This document is also available as <a href="">@@@XML@@@</a> and <a href="">@@@RDF@@@</a>.</dd>
-->
            <dt>Editor:</dt>
            <xsl:for-each select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:creator">
              <dd>
                <xsl:choose>
                  <xsl:when test="foaf:homepage/@rdf:resource">
                    <a href="{foaf:homepage/@rdf:resource}"><xsl:value-of select="foaf:name"/></a>
                  </xsl:when>
                  <xsl:when test="foaf:workplaceHomepage/@rdf:resource">
                    <a href="{foaf:workplaceHomepage/@rdf:resource}"><xsl:value-of select="foaf:name"/></a>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:value-of select="foaf:name"/>
                  </xsl:otherwise>
                </xsl:choose>
                <xsl:choose>
                  <xsl:when test="schema:affiliation or org:memberOf">
                    <xsl:variable name="orguri" select="normalize-space(org:memberOf/@rdf:resource)"/>
                    <xsl:text>, </xsl:text>
                    <xsl:choose>
                      <xsl:when test="$orguri != '' and //*[@rdf:about = $orguri]/foaf:homepage/@rdf:resource">
                        <a href="{//*[@rdf:about = $orguri]/foaf:homepage/@rdf:resource}"><xsl:value-of select="//*[@rdf:about = $orguri]/foaf:name"/></a>
                      </xsl:when>
                      <xsl:when test="org:memberOf//foaf:homepage/@rdf:resource">
                        <a href="{org:memberOf//foaf:homepage/@rdf:resource}"><xsl:value-of select="org:memberOf//foaf:name"/></a>
                      </xsl:when>
<!-- Kept for backward compatibility -->
                      <xsl:when test="schema:affiliation//foaf:homepage/@rdf:resource">
                        <a href="{schema:affiliation//foaf:homepage/@rdf:resource}"><xsl:value-of select="schema:affiliation//foaf:name"/></a>
                      </xsl:when>
                      <xsl:otherwise>
                        <xsl:value-of select="schema:affiliation//foaf:name"/>
                      </xsl:otherwise>
                    </xsl:choose>
                  </xsl:when>
                  <xsl:otherwise>
                    Independent
                  </xsl:otherwise>
                </xsl:choose>
              </dd>
            </xsl:for-each>

            <dt>Author:</dt>
            <xsl:for-each select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/foaf:maker">
              <dd>
                <xsl:choose>
                  <xsl:when test="foaf:homepage/@rdf:resource">
                    <a href="{foaf:homepage/@rdf:resource}"><xsl:value-of select="foaf:name"/></a>
                  </xsl:when>
                  <xsl:when test="foaf:workplaceHomepage/@rdf:resource">
                    <a href="{foaf:workplaceHomepage/@rdf:resource}"><xsl:value-of select="foaf:name"/></a>
                  </xsl:when>
                  <xsl:when test="foaf:page/@rdf:resource">
                    <a href="{foaf:page/@rdf:resource}"><xsl:value-of select="foaf:name"/></a>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:value-of select="foaf:name"/>
                  </xsl:otherwise>
                </xsl:choose>
                <xsl:choose>
                  <xsl:when test="schema:affiliation or org:memberOf">
                    <xsl:variable name="orguri" select="normalize-space(org:memberOf/@rdf:resource)"/>
                    <xsl:text>, </xsl:text>
                    <xsl:choose>
                      <xsl:when test="$orguri != '' and //*[@rdf:about = $orguri]/foaf:homepage/@rdf:resource">
                        <a href="{//*[@rdf:about = $orguri]/foaf:homepage/@rdf:resource}"><xsl:value-of select="//*[@rdf:about = $orguri]/foaf:name"/></a>
                      </xsl:when>
                      <xsl:when test="org:memberOf//foaf:homepage/@rdf:resource">
                        <a href="{org:memberOf//foaf:homepage/@rdf:resource}"><xsl:value-of select="org:memberOf//foaf:name"/></a>
                      </xsl:when>
<!-- Kept for backward compatibility -->
                      <xsl:when test="schema:affiliation//foaf:homepage/@rdf:resource">
                        <a href="{schema:affiliation//foaf:homepage/@rdf:resource}"><xsl:value-of select="schema:affiliation//foaf:name"/></a>
                      </xsl:when>
                      <xsl:otherwise>
                        <xsl:value-of select="schema:affiliation//foaf:name"/>
                      </xsl:otherwise>
                    </xsl:choose>
                  </xsl:when>
<!--
                  <xsl:otherwise>
                    Independent
                  </xsl:otherwise>
-->
                </xsl:choose>
              </dd>
            </xsl:for-each>

          </dl>
<!-- <p>Please refer to the <a href="">@@@errata@@@</a> for this document.</p>-->

          <p>This document is also available in the following formats:
          <xsl:for-each select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:hasFormat/rdf:Description">
            <xsl:if test="dcat:mediaType != 'text/html'">
              <a rel="alternate" href="{@rdf:about}" title="{rdfs:label}"><xsl:value-of select="dcat:mediaType"/></a><xsl:text> </xsl:text>
            </xsl:if>
          </xsl:for-each>
          </p>


        </header>

        <section id="copyright">
          <p><xsl:value-of select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:rights//*[name() = 'rdfs:label' or name() = 'odrs:copyrightNotice']"/>. This vocabulary is published under the
            <span xmlns:cc="http://creativecommons.org/ns#" about="{rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:license/rdf:Description/cc:attributionURL/@rdf:resource}">
              <a rel="cc:attributionURL" property="cc:attributionName" href="{rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:license/rdf:Description/cc:attributionURL/@rdf:resource}"><xsl:value-of select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:license/rdf:Description/cc:attributionName"/></a> /
              <a rel="license" href="{$licence}"><xsl:value-of select="$licenceTitle"/></a>
            </span>
          </p>
        </section>

        <hr title="Separator for top matter" />

        <section id="abstract">
          <header>
            <h1 >Abstract</h1>
          </header>

<xsl:for-each select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:abstract/child::node()|rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/dcterms:abstract/child::text()">
                <xsl:copy-of select="."/>
              </xsl:for-each>

        </section>

        <section id="status">
          <header>
            <h1>Status of this document</h1>
            <p>
              <em>This section describes the status of this document at the time of its publication. Other documents may supersede it.</em>
            </p>
          </header>

          <p>This document was produced by the
            <a href="{rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/foaf:maker/foaf:page/@rdf:resource}"><xsl:value-of select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/foaf:maker/foaf:name"/></a>, following the
            <a href="{$methodology}"><xsl:value-of select="$methodologyTitle"/></a>.
          </p>


<p>This document has been reviewed by representatives of the Member States of the European Union, <abbr title="Public Sector Information">PSI</abbr> publishers, and by other interested parties.</p>
<p>Publication of this Final Draft does not imply endorsement by the European Commission or its representatives.</p>
<p>This is a draft document and may be updated, replaced or made obsolete by other documents at any time. It is inappropriate to cite this document as other than work in progress.</p>
<p>The Working Group will seek further endorsement by the Member State representatives in the ISA Coordination Group or the Trusted Information Exchange Cluster.</p>

          <p>Comments on the vocabulary are invited via the
            <a href="https://joinup.ec.europa.eu/asset/adms/topic/public-comments-adms-specification-v08">forum</a>.
          </p>

        </section>

        <xsl:variable name="classes">
          <xsl:call-template name="class_definitions"/>
        </xsl:variable>
        <xsl:variable name="properties">
          <xsl:call-template name="property_definitions"/>
        </xsl:variable>

        <section role="main">
          <header id="toc">
            <h1>Table of Contents</h1>
            <nav>
              <ul>
                <li>
                  <a href="#intro">Introduction</a>
                </li>
                <li>
                  <a href="#namespace">Namespace</a>
                </li>
                <li>
                  <a href="#schemas">Conceptual schemas</a>
                </li>
                <li>
                  <a href="#glance">Vocabulary Terms at a Glance</a>
                </li>
<xsl:if test="normalize-space($classes) != ''">
                <li>
                  <a href="#classes">Classes</a>
                </li>
</xsl:if>
<xsl:if test="normalize-space($properties) != ''">
                <li>
                  <a href="#properties">Properties</a>
                </li>
</xsl:if>
                <li>
                  <a href="#conformance">Conformance Statement</a>
                </li>
              </ul>
            </nav>
          </header>

          <h1 id="intro">Introduction</h1>
          <p>The <xsl:value-of select="$title" /> was developed under the European
          Commission's <a href="http://ec.europa.eu/isa/">ISA Programme</a>. This is the namespace document, generated
          from the associated RDF schema. Full documentation is provided in the
          <a href="{$documentation}"><xsl:value-of select="$documentationTitle"/></a>
          specification document itself. This includes background information,
          use cases, the conceptual model and full definitions for all terms used.</p>

          <h1 id="namespace">Namespace</h1>


<p>The URI for this vocabulary is</p>
<pre><xsl:value-of select="$preferredNamespace"/></pre>
<p>When abbreviating terms the suggested prefix is</p>
<pre><xsl:value-of select="$preferredPrefix"/></pre>
<p>Each class or property in the vocabulary has a URI constructed by appending a term name to the vocabulary URI. For example:</p>
<pre><xsl:value-of select="/rdf:RDF/rdfs:Class/@rdf:about"/></pre>

<xsl:if test="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/voaf:reliesOn/@rdf:resource">
<p>The <xsl:value-of select="$title" /> includes terms defined in the following namespaces:</p>
<ul>
<xsl:for-each select="rdf:RDF/*[name() = 'owl:Ontology' or rdf:type/@rdf:resource = 'http://www.w3.org/2002/07/owl#Ontology']/voaf:reliesOn/@rdf:resource">
<li><code><xsl:value-of select="."/></code></li>
</xsl:for-each>
</ul>
</xsl:if>


          <section id="schemas">

            <header>
              <h1>Conceptual schemas</h1>
            </header>

          <xsl:for-each select="$uml">
            <figure>
              <a href="{$uml/@rdf:about}" title="Click to see full size"><img src="{$uml/@rdf:about}" alt="{$uml/rdfs:label}" width="100%" /></a>
              <figcaption><xsl:value-of select="$uml/rdfs:label"/></figcaption>
            </figure>
          </xsl:for-each>
          </section>



<!--<p>Provide a summary table or tables of the vocabulary terms. Distinguish between concepts and relationships/properties (RDF classes and proedicates).</p>-->
          <section id="glance">
            <header>
              <h1>Vocabulary Terms at a Glance</h1>
            </header>
            <dl>
<xsl:if test="normalize-space($classes) != ''">
              <dt>Classes (<xsl:value-of select="count(/rdf:RDF/sh:NodeShape)"/>):</dt>
              <dd>
                <ol class="summaryList">
                <xsl:call-template name="class_list"/>
                </ol>
              </dd>
</xsl:if>
<xsl:if test="normalize-space($properties) != ''">
              <dt>Properties (<xsl:value-of select="count(/rdf:RDF/sh:PropertyShape)"/>):</dt>
              <dd>
                <ol class="summaryList">
                <xsl:call-template name="property_list"/>
                </ol>
              </dd>
</xsl:if>
            </dl>
          </section>



<xsl:if test="normalize-space($classes) != ''">
          <h1 id="classes">Classes</h1>
          <p>This section provides the formal definition of each class in the vocabulary.</p>
<!--
          <xsl:apply-templates select="rdf:RDF/owl:Class|rdf:RDF/rdfs:Class|rdf:RDF/rdf:Description"/>
-->
          <xsl:call-template name="class_definitions"/>

</xsl:if>
<xsl:if test="normalize-space($properties) != ''">
          <h1 id="properties">Properties</h1>
<!--
          <xsl:apply-templates select="rdf:RDF/rdf:Property|rdf:RDF/rdf:Description"/>
-->
          <xsl:call-template name="property_definitions"/>
          <h1 id="conformance">Conformance Statement</h1>
          <p>A conformant implementation of this vocabulary MUST understand all vocabulary terms defined in this document.</p>
</xsl:if>

        </section> <!-- end of main section -->

        <footer id="generator">
        <p>Document generated from the RDF schema using <a href="rdf2html0.8.4.xsl">this XSLT</a></p>
        </footer>

        </article>
      </body>
    </html>

  </xsl:template>


</xsl:transform>
