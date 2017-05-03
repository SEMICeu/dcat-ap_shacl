# Rule of thumb for creating shape definition
Below are described a set of rules on how to transform the document expressing an application profile into SHACL language.

## Severity levels (to be discussed) 
Currently SHACL defines three severity levels: *Violation*, *Warning* and *Info*. We reuse these levels and assign *Violation* to *Mandatory* propeorties and classes, *Warning* to *Recommended* and *Info* to *Optional*.
Nevertheless we could define our own set of severity levels stating exactly what we mean i.e. *Mandatory*, *Recommended* and *Optional*. 

## Creating class SHACL constraints
Anatomy of an AP class constraint:

* class name
* "requirement" level (mandatory, recommended or optional)

### On integration of SHACL and OWL
The SHACL shape can be created as an individual entity having its own URI or it can be created as an extension of a class definition inheriting the class URI. Of course this principle works only for the shapes whose target is a class. The code below is an example of a shape separated from its target class definition

     <http://data.europa.eu/r5r#Catalogue>
          rdf:type sh:Shape ;
          sh:targetClass dcat:Catalog .

while this code below is an example of a shape that blends into the class definition

    dcat:Catalog
      rdf:type sh:Shape . # which is also an rdfs:Class or owl:Class

The example above demonstrates how SHACL can be embedded into the OWL definitions. This pattern however does not apply to specifying the class "requirement" level because the targets of such shape will be all instances of a class and not a specific node corresponding to the class definition. In essence the difference is in the target scope i.e. *sh:targetNode* vs *sh:targetClass*. So the above blending is useful for property constraints applied to instances of a class (which constitute the most part of the AP specifications). 

### On specifying the class "requirement" level
Each class in AP is given a "requirement" level ranging from mandatory to optional.  In order to specify it use the following SHACL boilerplate involving the inverse path relation on rdf:type property which essentially states that there shall be at least one usage of rdf:type  property with ex:Person in object position. 

      ex:PersonCountShape
       a sh:NodeShape ;
       sh:targetNode ex:Person ;
       sh:property [
           sh:path [ sh:inversePath rdf:type ] ;
           sh:minCount 1 ;
       ] .

This boilerplate is mentioned [here](https://lists.w3.org/Archives/Public/public-rdf-shapes/2017Apr/0024.html) and [here](https://www.w3.org/wiki/SHACL/Examples). 

## Creating property SHACL constraints
Anatomy of an AP property constraint:

* class name
* property name
* “requirement” level (mandatory, recommended or optional)
* range class/datatype(s)
* range controlled list of values (in some cases)
* min cardinality
* max cardinality

For the best control over the  constraint checking each part of the property constraint specification shall be considered as a separate SHACL shape. The merging criteria for these atomic shapes shall is the severity level of the constraint violation.  For example if the property dct:description of the dcat:Catalogue class is mandatory with cardinality 1..n then the min-max cadinality constraints can be merged into one shape with a violation severity level. However the property dct:language which is an recommended property with cardinality 0..n has to split into two shapes: one shape with violation severity level checking the class of the range values, requiring them to be of dct:LinguisticSystem type and the second shape with warning severity level checking that the property is used at least once. 

## creating distinct URI for property constraints (to be discussed)
We would advise against creation of distinct URIS for each property constraint but instantiate them in place as blank nodes. Doing so would decrease the management overhead and will allow easy split or merge of constraints. The down side of this practice is that each constraint will not be identifiable via a URI, nevertheless other identification mechanisms are implemented anyway through descriptive properties sh:name, sh:message, sh:description and other generic ones such as rdfs:label, rdfs:comment etc. 

discouraged approach

      <http://data.europa.eu/r5r#Catalogue>
      rdf:type sh:NodeShape ;
      sh:property <http://data.europa.eu/r5r#catalogue-dataset> ;
    .  
    
      <http://data.europa.eu/r5r#catalogue-dataset>
       rdf:type sh:PropertyShape ;
       sh:severity sh:Info ;
       sh:minCount "1" ;
       sh:path dcterms:description ;
     .

encouraged approach

    <http://data.europa.eu/r5r#Catalogue>
      rdf:type sh:Shape ;
      sh:property [
          sh:predicate dcterms:description ;
          sh:minCount 1 ;
          sh:severity sh:Violation ;
        ] ;
    .
## shape metadata
* *sh:message* content stating in natural language what exactly is the reason for the exception being triggered. The text shall be continuing the sentence *"This exception is raised because ..."*. This message will be used in the validation reports.
* *sh:description*, *sh:name*, *sh:severity*. These properties will be used in the validation reports.
* Optionally rdfs:label, rdfs:comment, vann:usageNote etc. 


## Rule of thumb for cardinality and severity association
Formal definitions used below are first order logic combined with binary mathematical operators.  
The formulas are split into two parts: the left side of the formula represents a conditional selector and the right side represents the SHACL constraint definition. 
The binary mathematical operators (=,<,>,<=,>=) have priority over the logical operators (^ (and), or(v) ). Additionally the following functions are used:

* any p: a universal cuantifier scoped to all propoerties associated to a class and level of "urgency" (mandatory, recommended, optional)
* *minAp* and *maxAp*: are functions returning the minimum and maximum cardinality constraints associated to a certain propeorty in the DCAT-AP specification document
* *minConstr* and *maxConstr*: are functions returning the minimum and maximum cardinality constraints associated to a certain property in the SHACL formulation. 
* "*"" represents infinite

### mandatory properties
* cardinality constraints are defined as in the specification
* severity levels for mandatory properties are set to violation

        any p ^ minAp(p) ^ maxAp(p) : minConstr(p)=minAp(p) ^ minConstr(p)=maxAp(p) ^ Violation

### recommended properties
* min and max cardinality constraints are defined as distinct constraints because of different severity levels 
* only max cardinality constraints that are not infinite (*, n) are selected
* severity levels for max cardinality constraints are set to violation
* if a min cardinality constraint is greater than one (which is unlikely) then set that to violation and merge with the max-cardinality constraint definition
* all properties that have zero min cardinality constraint are defined as min one SHACL constraints with severity set to warning
 
        any p ^ minAp(p)>0 v maxAp(p)<* : minConstr(p)=minAp(p) ^ maxConstr(p)=maxAp(p) ^ Violation

        any p minAp(p)=0 :  minConstr(p)=1 ^ Warning

### optional properties (same as for recommended but with *info* severity)
* min and max cardinality constraints are defined as distinct constraints because of different severity levels 
* only max cardinality constraints that are not infinite (*, n) are selected
* severity levels for max cardinality constraints are set to violation
* if a min cardinality constraint is greater than one (which is unlikely) then set that to violation and merge with the max-cardinality constraint definition
* all properties that have zero min cardinality constraint are defined as min one SHACL constraints with severity set to info 

        any p ^ minAp(p)>0 v maxAp(p)<* : minConstr(p)=minAp(p) ^ maxConstr(p)=maxAp(p) ^ Violation

        any p minAp(p)=0 :  minConstr(p)=1 ^ Info

## permissive datatype constraints (need to research how to allow multiple datatype and class ranges)
dct:Catalogue must have maximum one release date but the date can be expressed as xsd:dateTime or xsd:date. Research how to allow multiple ranges.

A straight forward approach would be as Andrea Perego suggests, using sh:or operator such as: 

        sh:or (
          [ sh:datatype xsd:date ] 
          [ sh:datatype xsd:dateTime ]
        );

## Validating predicate objects belonging to a controlled list

Simple example: 
The object of dcat:theme must be one of the concepts in http://publications.europa.eu/mdr/authority/data-theme/. 

Or more complex:

The object of dct:spatial must be either one of the concepts in any of the concept schemes http://publications.europa.eu/mdr/authority/country/,  http://publications.europa.eu/mdr/authority/place/, http://publications.europa.eu/mdr/authority/continent/ or http://sws.geonames.org/, or else a set of coordinates expressed as WKT literal of GML literal.

Andrea Perego suggests using sh:pattern propeorty for verifying the URIs structure. For my experince I can report that this operator is very slow as it checks the URIs against a regex. A more viable sollution would be to ask whether the propeorty object belongs to a certain concept scheme, i.e. whether it has for example a skos:inScheme <http://publications.europa.eu/mdr/authority/country/> statement. 