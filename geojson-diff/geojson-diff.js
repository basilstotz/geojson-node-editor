#!/usr/bin/env node

const fs = require('fs');

let outFile;

let geoOld;
let geoNeu;
let geoOldIndexed={};


let block = [ ];
let deprecated= [ ];
let geoFilter = { key: "addr:town", value: "Springfield" }

////////////////////////////////////////////////////////////

function read(name){
    return fs.readFileSync(name,{encoding:'utf8', flag:'r'});
}

function write(name,data){
    fs.writeFileSync(name,data,{encoding:'utf8', flag:'w'});
}


function clone(x){
    return JSON.parse(JSON.stringify(x))
}

function stderr(text){
    process.stderr.write(text+"\n")
}

function isBlocked(key){
    ans=false;
    for(let i=0;i<block.length;i++){
	let k=block[i];
	if(key.startsWith(k)){
	    ans=true;
	    continue
	}
    }
    return ans
}

function isDeprecated(key){ 
    ans=false;
    for(let i=0;i<deprecated.length;i++){
	let k=deprecated[i];
	if(key==k){
	    ans=true;
	    continue
	}
    }
    return ans
}

function writeList(list){
    ans=list.join(" ");
    return "\""+ans+"\"";
}

function usage(){
    stderr( "usage: geojson-diff <old_geojson> [<new_geojson> [out_geojson]]");
    stderr( "       if the second arg is not given or \"-\", the new file is read from stdin");
    stderr( "       if the third arg is not given the output goes to stdout");
            process.exit(0)  
}

///////////////////////////////////////////////////////////////////////

/*
function processGeojson(geoIn){

    var geoOut={ type: "FeatureCollection", features: [] };

    geoIn.features.forEach(
	(feature) => { geoOut.features.push(reduce(feature)) }
    );
}
*/


function processGeojson(geoOld,geoNew){

    let ok;

    let numNeu=geoNeu.features.length;
    let numAlt=geoOld.features.length;

    //check for same size
    if(numAlt!=numNeu){
	stderr("the files have a different number of features")
	process.exit(1)
    }else{
	stderr(numAlt+" features loaded");
    }
    
    // make index by id
    for(let i=0;i<geoOld.features.length;i++){
	let feature=geoOld.features[i];
	geoOldIndexed[feature.properties.id]=feature;
    }

    let geoOut = { type: "FeatureCollection", features: [] }; 
    let num=0;
    
    for(let i=1;i<geoNew.features.length;i++){

	let newFeature=geoNew.features[i];
	let oldFeature=geoOldIndexed[newFeature.properties.id];
        let outFeature = clone(newFeature);
		
	let newTags=newFeature.properties.tags;
	let oldTags=oldFeature.properties.tags;
	let outTags=outFeature.properties.tags;

	//if(newTags[geoFilter.key]&&newTags[geoFilter.key]==geoFilter.value){
        if(newTags["addr:town"]&&newTags["addr:town"]=="Springfield"){

	    num++;
	    
	    //check for missing id
	    if(newFeature.id!=oldFeature.id){
		stderr(" files have different count of nodes");
		process.exit(1)
	    }

	    //check for same version
	    if(newFeature.properties.meta.version!=oldFeature.properties.meta.version){
		stderr(" files have different versions id="+newFeature.properties.id);
		process.exit(1)
	    }

	    //check for node only
	    if(newFeature.properties.type!="node"){
		stderr("only nodes are allowed");
		process.exit(1)
	    }


	    // check for missing tags
	    for(const [key,val] of Object.entries(oldTags)){
		if(!newTags[key]){
		    stderr("missing tag \""+key+"\" in newGeojon in id="+newFeature.properties.id);
		    process.exit(1)
		}
	    }


	    // apply changes
	    for(const [key,val] of Object.entries(newTags)){
		//if(key!="elevation"){
		   if(oldTags[key]){
		       if(oldTags[key]==newTags[key]){
			   delete outTags[key]
		       }else{
			   outTags[key]=val;
		       }
		   }else{
		       outTags[key]=val
		   }
	    }

	    // delete blocked tags
	     for( const [key,val] of Object.entries(outTags)){
		 if(isBlocked(key)){
		     delete outTags[key]	
		 }    
	     }

	    let l=Object.keys(outTags).length;
	    
	   //https://github.com/osm-nz/osm-nz.github.io/blob/main/src/pages/upload/createOsmChangeFromPatchFile.ts#L217

	   // prepare for output
	   if(l>0){
	       // mark deprecated tags for removal
	       let oldTagArray=Object.keys(oldTags);
	       for(let i=0;i<oldTagArray.length;i++){
		   let key=oldTagArray[i];
		   if(isDeprecated(key)){
		      outTags[key]="🗑️'"
		   }
	       }
	       // cleanup
	       let properties=outFeature.properties
	       delete properties.pictures_url_prefix
	       delete properties.pictures
	       delete properties.project
	       delete properties.beautify

	     if(i==1000){
		 stderr(JSON.stringify(oldTags,null,2));
		 stderr(JSON.stringify(newTags,null,2));
		 stderr(JSON.stringify(outTags,null,2));
		 stderr(JSON.stringify(outFeature,null,2));
	     }

	       geoOut.features.push(outFeature);

	   }
	    
	}// if
    }// for 

    stderr("blocked tags are "+writeList(block))
    stderr("deprecated tags are "+writeList(deprecated))
    stderr(geoOut.features.length+" features in the changeset");

    if(outFile==""){
        process.stdout.write(JSON.stringify(geoOut,null,2)+'\n');
    }else{
	try {
	    write(outFile,JSON.stringify(geoOut,null,2))
	} catch (e) {
	    stderr(" "+e);
	    process.exit(1);
	}
    }	
}

///////////////////////////////////////////////////////////

var text;

if(process.argv[4]){
    outFile= process.argv[4]
}else{
    outFile="";
}

if(process.argv[2]){
    if(process.argv[2]=="--help"){
	usage()
    }else{
	try {
	    text=read(process.argv[2])
	} catch (e) {
	    stderr(" "+e);
	    process.exit(1);
	}
	try {
	    geoOld=JSON.parse(text);
	} catch (e) {
	    stderr(" "+e);
	    process.exit(1);
	}
    }
}else{
    usage()
}

if(process.argv[3]&&process.argv[3]!="-"){
    try {
	text=read(process.argv[3])
    } catch (e) {
	stderr(" "+e);
	process.exit(1);
    }
    try {
	geoNeu=JSON.parse(text);
    } catch (e) {
	stderr(" "+e);
	process.exit(1);
    }
    processGeojson(geoOld,geoNeu);
}else{
    var chunks = '';

    process.stdin.on('readable', () => {
      let chunk;
      while (null !== (chunk = process.stdin.read())) {
	  chunks+=chunk;
      }
    });

    process.stdin.on('end', () => {
	geoNeu=JSON.parse(chunks)
	processGeojson(geoOld,geoNeu)
    });
}

