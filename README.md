# DCAT-AP SHACL constraint definitions
The Application Profiles (AP) offered here represent a set of integrity constraints used to check the physical and logical correctness or rationality of a certain dataset. The SHACL specifications for DCAT Application Profile. 

[The rules of thumb page](https://github.com/SEMICeu/dcat-ap_shacl/wiki/Rules-of-Thumb) offers insights into how the shapes were created. 

# The Source Structure

* ./shacl folder contains the latest version of the official DCAT-AP shacl expression
* ./resources folder contains the latest version of the controlled vocabularies required by dcat-ap-mdr-vocabularies.shapes.rdf. Note that in order to validate for controlled vocabularies, all of them need to be loaded as part of the data graph.
* ./test folder contsins rdf unit tests that can be executed with Free version of TopBraid Composer. Currently they offer partial coverage for DCAT-AP and more unit tests shall be created from real data
* ./dev folder contains experiemntal, in progress work or other sources

# Usage Notes
 Currently we focus on developping validation constraints for RDF data expressed as data shapes in SHACL Language ([2016-08-14 Standard Release](https://www.w3.org/TR/2016/WD-shacl-20160814/)). Note that SHACL is still an evolving draft and is not yet a standard specification. To execute these shape files use our wrapper available on [GitHub](https://github.com/HerbertKoch/shacl-cl) which is using [TopQuadrant's implementation of SHACL API](https://github.com/TopQuadrant/shacl) as it was in Dec 2016 (a version still implementing August 2016 SHACL specification).