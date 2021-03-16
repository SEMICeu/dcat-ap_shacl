Archiving note: the shacl definitions are part of DCAT-AP specifications.

# DCAT-AP SHACL constraint definitions
The Application Profiles (AP) offered here represent a set of integrity constraints used to check the physical and logical correctness or rationality of a certain dataset. The SHACL specifications for DCAT Application Profile. 

[The rules of thumb page](https://github.com/SEMICeu/dcat-ap_shacl/wiki/Rules-of-Thumb) offers insights into how the shapes were created. 

# The Source Structure

* ./shacl folder contains the latest version of the official DCAT-AP shacl expression
* ./resources folder contains the latest version of the controlled vocabularies required by dcat-ap-mdr-vocabularies.shapes.rdf. Note that in order to validate for controlled vocabularies, all of them need to be loaded as part of the data graph.
* ./test folder contsins rdf unit tests that can be executed with Free version of TopBraid Composer. Currently they offer partial coverage for DCAT-AP and more unit tests shall be created from real data. 
* ./dev folder contains experiemntal in progress work or other sources. For example shapeview.ui.ttlx can be used to generate the DCAT-AP HTML documentation from its SHACL implementation. 
* ./documentation folder contains the static HTML generated automatically using the SWP technology. The source code for generating this document is in ./dev/shapeview.app

# The scope of the current release

* *dcat-ap.shapes.ttl* validates instance shapes with respect to:
  * o	cardinality constraints, both for properties that have a minimum occurrence greater or equal to than *1* (for example, there needs to be at least one occurrence of the mandatory property title of a Dataset) and properties that have an explicit maximum occurrence (for example, there can be a maximum of one licence for a Distribution)
  * o	restrictions concerning ranges (expressed as sh:nodeKind) of properties to avoid that properties, irrespective of whether they are mandatory, recommended or optional, are provided that violate range declarations.

* *dcat-ap-mandatory-classes.shapes.ttl* validates that data includes the mandatory classes. 

* *dcat-ap-mdr-vocabularies.shapes.ttl* validates that values of a property are taken from the mandatory controlled vocabularies

# Usage Notes 
To execute these shape files you can use [shacl-cl tool](https://github.com/HerbertKoch/shacl-cl) build on top of [TopQuadrant's implementation of SHACL API](https://github.com/TopQuadrant/shacl) or any other implementation of the SHACL standard.
