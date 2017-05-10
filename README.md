# DCAT-AP SHACL constraint definitions
The SHACL specifications for DCAT Application Profile. 
Please see [the rules of thumb](./rules.md)

# The Source Structure

* ./shacl folder contains the latest version of the official DCAT-AP shacl expression
* ./resources folder contains the latest version of the controlled vocabularies required by dcat-ap-mdr-vocabularies.shapes.rdf. Note that in order to validate for controlled vocabularies, all of them need to be loaded as part of the data graph.
* ./test folder contsins rdf unit tests that can be executed with Free version of TopBraid Composer. Currently they offer partial coverage for DCAT-AP and more unit tests shall be created from real data
* ./dev folder contains experiemntal, in progress work or other sources
