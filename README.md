# geojson-node-editor
A node editor for OSM with GeoJSON input. This project is in a very early stage: Only use it with the OSM-sandbox (https://master.apis.dev.openstreetmap.org).

The editor has two components:
* A browser based application (geojson-node-editor in this repo) to upload a changeset to OSM using a special diffential GeoJSON file.
* A command line application (geojson-diff in this repo) to generate this special diffential GeoJSON-file using a standard GeoJSON file (for example from a geoJSON export at https://overpass-turbo.eu ) and a second GeoJSON file with your changes. It then calculates a differential GeoJSON file only containing
  - the features which have changed tags
  - and these features only contain the tags which have changed.


#### geojson-diff
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

