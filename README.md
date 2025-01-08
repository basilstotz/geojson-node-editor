# geojson-node-editor
A node editor for OSM with GeoJSON ( https://en.wikipedia.org/wiki/GeoJSON ,https://geojson.org )  input. This project is in a very early stage: Only use it with the OSM-sandbox (https://master.apis.dev.openstreetmap.org).

The editor has two components:
* A browser based application (geojson-node-editor in this repo) to upload a diffential GeoJSON file.
* A command line application (geojson-diff in this repo) to generate the diffential GeoJSON-file using a standard GeoJSON file (for example from a geoJSON export at https://overpass-turbo.eu ) and a second GeoJSON file with your changes.


#### geojson-diff
 ```
$ geojson-diff --help
usage: geojson-diff <overpass_geojson> [<new_geojson> [diff_geojson]]
       if the second arg is not given or "-", the new file is read from stdin
       if the third arg is not given the output goes to stdout
```
The app in written in JavaScript and needs a Node installation in order to run. 
