
let options;
let comment='change some tags';

let GEODIFFS=false;


function setOptions(sandbox){

    let serverUrl=window.location.href;

    if(sandbox){
       options = {
	   mode: "popup",
	   clientId: env.sandbox.clientId,
	   redirectUrl: serverUrl+env.sandbox.redirectPage,
	   apiUrl: "https://master.apis.dev.openstreetmap.org",
	   scopes: [ "write_api" ]  
       }
    }else{
       options = {
	   mode: "popup",
	   clientId: env.openstreetmap.clientId,
	   redirectUrl: serverUrl+env.openstreetmap.redirectPage,
	   scopes: [ "write_api" ]  
       }	
    }
    //show(options);
}


async function uploadChangeset(){

    let ans;
    let ok=true

    if(GEODIFFS){

	try {
	    await OSM.authReady;
	    ans = await OSM.uploadChangeset(	    
		{ created_by: "GeoJSON-Node-Editor", comment: comment },
		{ create: [], modify: GEODIFFS, delete: [] }
	    )} catch (error) {
		ok=false;
		finish(" "+error,false);
	    }


	//show(GEODIFFS);
	if(ok){
	    finish("Successfully uploaded "+GEODIFFS.length+" features.",true);
	}
	GEODIFFS=false;
    }else{
	finish("no diffs",false)
    }
    
}



function sortGeoFeatures(geo,osm){

    let ok=true;

    // sort geo
    let sorted=[];
    let indexed={};
    geo.forEach( (feature) => { indexed[feature.properties.id]=feature;  });
    osm.forEach( (feature) => {
	if(indexed[feature.id]){
	   sorted.push(indexed[feature.id])
	  }else{
	      ok=false
	  }
    });
    
    // check for equal ids
    if(ok){
       for(let i=0;i<osm.length;i++){
	   if(osm[i].id!=geo[i].properties.id)ok=false
       }
    }
    
    if(ok){
	return sorted
    }else{
	return false
    }
}	       


function checkConflicts(geo,osm){

    let conflict=false;
    for(let i=0;i<geo.length;i++){
	let feature=osm[i];
	let newFeature=geo[i];

	let osmVersion=feature.version;
	let geoVersion;
	if(newFeature.properties&&newFeature.properties.meta&&newFeature.properties.meta.version){
	    newVersion=newFeature.properties.meta.version;
	}else{
	    newVersion=newFeature.properties.version;
	}
	if(osmVersion!=newVersion)conflict=true;
    }
    return conflict
}

function calcDiffs(geo,osm){

    let diffs=[];
    
    for(let i=0;i<osm.length;i++){

	let feature=osm[i];
	
	let tags=osm[i].tags;	
	let newTags=geo[i].properties.tags;

	//show(tags);
	//show(newTags);
	
	// https://github.com/osm-nz/osm-nz.github.io/blob/main/src/pages/upload/createOsmChangeFromPatchFile.ts
        let error=false;
	let different=false;
	for (const [key, newValue] of Object.entries(newTags)) {
	    if(tags[key]){
		if(tags[key]!=newValue){
		    different=true;
		    // https://emojipedia.org/de/papierkorb		
		    if(newValue==="🗑️" ){
			if(tags[key]){ delete tags[key] }
		    }else{
			tags[key]=newValue;
		    }
		}else{
		    //try to overwrite a tag with the old value  (maybe this is an an error?)
		    error=true
		}
	    }else{
		if(newValue==="🗑️" ){
		    // try to delete non existing key. do nothing. (maybe this is an an error?)
		    error=true
		}else{
		    different=true;
		    tags[key]=newValue;
		}
	    }
	} // for tags
	if(different&&!error)diffs.push(feature)
    } //for osm

    if(diffs.length==osm.length){
	return diffs;
    }else{
	return false
    }
}


async function getFeatures(geoJSON){

    let geo=geoJSON.features;
    let osm;

    // make nodeList
    let nodeList=[];
    geo.forEach( (feature) => { nodeList.push(feature.properties.id) });

    // download features
    let downloadOk=true;
    try {
	osm = await OSM.getFeatures("node",nodeList);
    } catch (error) {
	downloadOk=false;
	finish(" "+error,false);
    }

    // do the checks and maybe proceed
    if(downloadOk){
	log(0,"download of of osm features is ok");
	// sort
        let sorted=sortGeoFeatures(geo,osm);
        if(sorted){
	    log(0,"the dowloaded feature are compatable with the input");
	    geo=sorted
	    // check for conflicts
	    let conflicts=checkConflicts(geo,osm);
	    if(!conflicts){
		log(0,"there are no conflicts");
		// calc diffs
		let diffs=calcDiffs(geo,osm);
		if(diffs){
		    // and go ...
		    log(0,"there are no features without changes.")
		    //show(diffs);
                    log(0,"will update "+diffs.length+" features");
                    GEODIFFS=diffs;
		    document.getElementById("proceed").setAttribute("style","background:orange;display:block");
		    //uploadChangeset(diffs);
		}else{
		    finish("there are features without changes.",false);
		}
	    }else{
		finish("there are conflicts.",false);
	    } 
	}else{
            finish("the downlaoded features are not compatable with the input features.",false)
	}
    }    
}

    
function checkGeoJSON(jsonText){
    
    let maxlen=1;
    let ok=true;
    let json;
    
    log(0,"reading GeoJSON is ok");

    // parse input
    try{
	json=JSON.parse(jsonText);
    } catch(e) {
	finish(" "+e,false)
	ok=false;
    }
    // check for valid geojson?
    if(ok&&json.type=='FeatureCollection'&&json.features){
	log(0,'GeoJSON is valid');
	//check length
	let len=json.features.length;
	if(len>0){
	    log(0, "GeoJSON has "+len+" features");
	    if(len>env.maxlen){
		log(1,'GeoJSON is too big. It will be truncated to the first '+env.maxlen+' features');
		len=env.maxlen;
	    }
	    // check is has only nodes
	    let onlyNodes=true;
	    json.features.forEach( (feature) => { if(feature.properties.type!="node"){onlyNodes=false}});
	    if(onlyNodes){
	        // and go ...
		let geoOut = { type: "FeatureCollection", features: [] }
		for(let j=0;j<len;j++){
		    geoOut.features.push(json.features[j]);
		}
		getFeatures(geoOut);
	    }else{
		finish("GeoJSON has other types than nodes.",false); 
	    }
	 }else{
	     finish("GeoJSON has no features. Nothing to do.",true);
	 }
    }else{
	finish("file is not GeoJSON.",false);
    }
}

