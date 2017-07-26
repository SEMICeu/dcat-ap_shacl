# DCAT-AP SHACL constraint definitions
The Application Profiles (AP) offered here represent a set of integrity constraints used to check the physical and logical correctness or rationality of a certain dataset. The SHACL specifications for DCAT Application Profile. 

[The rules of thumb page](https://github.com/SEMICeu/dcat-ap_shacl/wiki/Rules-of-Thumb) offers insights into how the shapes were created. 

# The Source Structure

* ./shacl-latest folder contains the latest version of the official DCAT-AP shacl expression
* ./shacl-201608 folder contains the version of the official DCAT-AP shacl expression in SHACL dialect from August 2016. 
* ./resources folder contains the latest version of the controlled vocabularies required by dcat-ap-mdr-vocabularies.shapes.rdf. Note that in order to validate for controlled vocabularies, all of them need to be loaded as part of the data graph.
* ./test-201608 folder contsins rdf unit tests that can be executed with Free version of TopBraid Composer. Currently they offer partial coverage for DCAT-AP and more unit tests shall be created from real data. They are associated to shacl-201608 implementation. Not test units exist yet for the  the latest implementation. 
* ./dev folder contains experiemntal in progress work or other sources. For example shapeview.ui.ttlx can be used to generate the DCAT-AP HTML documentation from its SHACL implementation. 
* ./documentation folder contains the static HTML generated automatically using the SWP technology. The source code for generating this document is in ./dev/shapeview.app

# Te scope of the current release

* *dcat-ap.shapes.ttl* validates instance shapes with respect to:
  * o	cardinality constraints, both for properties that have a minimum occurrence greater or equal to than *1* (for example, there needs to be at least one occurrence of the mandatory property title of a Dataset) and properties that have an explicit maximum occurrence (for example, there can be a maximum of one licence for a Distribution)
  * o	restrictions concerning ranges (expressed as sh:nodeKind) of properties to avoid that properties, irrespective of whether they are mandatory, recommended or optional, are provided that violate range declarations.

* *dcat-ap-mandatory-classes.shapes.ttl* validates that data includes the mandatory classes. 

* *dcat-ap-mdr-vocabularies.shapes.ttl* validates that values of a property are taken from the mandatory controlled vocabularies

# Usage Notes for ./shacl-201608
 Currently we focus on developping validation constraints for RDF data expressed as data shapes in SHACL Language ([2016-08-14 Standard Release](https://www.w3.org/TR/2016/WD-shacl-20160814/)). Note that SHACL is still an evolving draft and is not yet a standard specification. To execute these shape files use our wrapper available on [GitHub](https://github.com/HerbertKoch/shacl-cl) which is using [TopQuadrant's implementation of SHACL API](https://github.com/TopQuadrant/shacl) as it was in Dec 2016 (a version still implementing August 2016 SHACL specification).
