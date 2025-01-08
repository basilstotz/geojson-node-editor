#!/bin/sh

cat $1 | beautify | geojson-diff $1 
