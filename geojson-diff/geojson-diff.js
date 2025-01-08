#!/usr/bin/env node

const fs = require('fs');

let outFile;

let geoOld;
let geoNeu;
let geoOldIndexed={};


const block = [ "speierlingproject:line","elevation","addr:" ];
const deprecated= [ "source" ];
const geoFilter= [
    { key: "addr:town", val: "Münchenstein" },
    { key: "propagation" }
];

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

function checkGeojson(geoOld,geoNew){

    let ok=true;
    
    //check for same size
    let numNeu=geoNeu.features.length;
    let numAlt=geoOld.features.length;
    if(numAlt!=numNeu){
	stderr("the files have a different number of features")
	ok=false
    }

    /*
    // make index by id
    let indexed={};
    for(let i=0;i<geoOld.features.length;i++){
	let feature=geoOld.features[i];
	geoOldIndexed[feature.properties.id]=feature;
    }
    */
    
    for(let i=1;i<geoNew.features.length;i++){

	let ok=true;
	
	// checks on features
	const newFeature=geoNew.features[i];
	const oldFeature=geoOld.features[i];
	//let oldFeature=geoOldIndexed[newFeature.properties.id];

	if(newFeature.id!=oldFeature.id){
	    stderr("the ids do not match");
	    ok=false
	}


	//checks on properties
	const oldProperties=oldFeature.properties;
	const newProperties=newFeature.properties;
	

	if(oldProperties.type!="node"){
	    stderr("only nodes are allowed");
	    ok=false
	}
	

	//checks on meta
	const oldMeta=oldProperties.meta;
	const newMeta=newProperties.meta;
	
	let metaOk=true;
	const metaKeys= [ "timestamp", "version", "changeset","user","uid" ]
	for( const key of metaKeys){
	    if( !(oldMeta[key]&&newMeta[key]) ){
		metaOk=false;
	    }else{
		if(oldMeta[key]!=newMeta[key])metaOk=false;
	    }	
	}    
        if(!metaOk){
		stderr("metas are not complete or differ");
		ok=false
	}	    
    
        

	// check for missing tags
	const oldTags=oldProperties.tags;
	const newTags=newProperties.tags;
	
	for(const [key,val] of Object.entries(oldTags)){
	    if(!newTags[key]){
		stderr("missing tag \""+key+"\" in newGeojon in id="+newFeature.properties.id);
		//ok=false
	    }
	}
	
    }
    return ok
}

function cleanupFeature(feature){
    
    let allow;
    
    // cleanup feature
    allow=[ "type","id","properties","geometry" ];
    for( const key of Object.keys(feature)){
	if(!allow.includes(key)){
	    delete feature[key]
	}
    }
    // cleanup properties
    let properties=feature.properties;
    allow=[ "type","id","tags","meta" ];
    for( const key of Object.keys(properties)){
	if(!allow.includes(key)){
	    delete properties[key]
	}
    }
    return feature
}

function diffsGeojson(geoOld,geoNew){

    
    // make index by id
    for(let i=0;i<geoOld.features.length;i++){
	let feature=geoOld.features[i];
	geoOldIndexed[feature.properties.id]=feature;
    }

    let geoOut = { type: "FeatureCollection", features: [] }; 
    let numOut=0;
    
    for(let i=1;i<geoNew.features.length;i++){

	let newFeature=geoNew.features[i];
	let oldFeature=geoOldIndexed[newFeature.properties.id];
        let outFeature = clone(newFeature);
		
	let newTags=newFeature.properties.tags;
	let oldTags=geoOldIndexed[newFeature.properties.id].properties.tags;
	let outTags=outFeature.properties.tags;


	//numOut++;
	if( !(oldFeature["deny"]||newFeature["deny"]) ){
	    // apply changes

	    for(const [key,val] of Object.entries(newTags)){
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
		      outTags[key]="🗑️"
		   }
	       }

		outFeature=cleanupFeature(outFeature);

		/*
	       if(i==1000){
		   stderr(JSON.stringify(oldTags,null,2));
		   stderr(JSON.stringify(newTags,null,2));
		   stderr(JSON.stringify(outTags,null,2));
		   stderr(JSON.stringify(outFeature,null,2));
	       }
		*/

		geoOut.features.push(outFeature);

	    }
	}// id deny	    
    }
    return geoOut;
}

function filter(geo){

    
    let geoOut = { type: "FeatureCollection", features: [] };

    for(let i=0;i<geo.features.length;i++){
	
	let feature = geo.features[i];
	let tags = feature.properties.tags;

	let allow=[];
	geoFilter.forEach( () => {allow.push(false) });

	for(let i=0;i<geoFilter.length;i++){
	    let item=geoFilter[i];
	    let key=item.key;
	    if(item.val){
		if(tags[key]&&tags[key]==item.val)allow[i]=true;
	    }else{
		if(tags[key])allow[i]=true;
	    }
	}

	let res=true;
	allow.forEach( (ans) => { res=( res && ans) }); 

	if(!res)feature["deny"]=true;
		
	geoOut.features.push(feature)
    }

    return geoOut;
}

///////////////////////////////////////////////////////////

function processGeojson(geoOld,geoNew){

    stderr("");
    if(checkGeojson(geoOld,geoNew)){
        stderr("");
	stderr(geoNew.features.length+" features loaded");

	geoNew=filter(geoNew);

	anz=0;
	for(let i=0;i<geoNew.features.length;i++){
	    let feature=geoNew.features[i];
	    if(!feature.deny)anz++;
	}
	
	let geoOut = diffsGeojson(geoOld,geoNew);
	
	stderr("blocked tags are "+writeList(block))
	stderr("deprecated tags are "+writeList(deprecated))
	stderr(anz+" features in the selection");
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
    }else{
	stderr("checks not passed. no processing was done")
    }
    stderr("");
}
	
	
   
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

