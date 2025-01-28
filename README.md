# geojson-node-editor
A node editor for OSM with GeoJSON input. This project is in a very early stage: Only use it with the OSM-sandbox (https://master.apis.dev.openstreetmap.org).

It can only **create or edit tags in already existant nodes**. This means, it
* can not work on ways or relations
* can not create or delete nodes.

The editor has two components:

#### geojson-node-editor

Is a browser based application to upload a changeset to OSM using a special "diffential" GeoJSON file as input.


#### geojson-diff

Is a command line application to generate this differential GeoJSON-file using two GeoJSON files:
- a GeoJSON file reflecting the current state on OSM (for example from a geoJSON export at https://overpass-turbo.eu )
- and a second GeoJSON file which is the first one plus your edits.
  
It then calculates the differential GeoJSON file only containing

- the features which have changed tags
- and these features only contain the tags which have changed.



 ```
$ geojson-diff --help
usage: geojson-diff <overpass_geojson> [<new_geojson> [diff_geojson]]
       if the second arg is not given or "-", the new file is read from stdin
       if the third arg is not given the output goes to stdout
```
The app in written in JavaScript and needs a Node installation in order to run. 


###### Hint

There is an api and a commandline tool to automatize overpass queries

https://www.npmjs.com/package/query-overpass

