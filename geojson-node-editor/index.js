
let options;

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
	   redirectUrl: serverUrl+env.sandbox.redirectPage,
	   scopes: [ "write_api" ]  
       }	
    }
    show(options);
}


let GEODIFFS=false;

async function uploadChangeset(){

    let ans;
    let ok=true

    
    // nicht wegschmeissen !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    try {
        await OSM.authReady;
	ans = await OSM.uploadChangeset(	    
	    { created_by: "Geojson-Node-Editor", comment: "fix some tags" },
	    { create: [], modify: GEODIFFS, delete: [] }
	)} catch (error) {
	    ok=false;
	    log(2," "+error);
	}
    //

    if(GEODIFFS){
	//show(GEODIFFS);
	if(ok)log(0,"Successfully uploaded "+GEODIFFS.length+" features. Programm is terminated","finish");
	GEODIFFS=false;
    }else{
	log(1,"no diffs")
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
	let different=false;
	for (const [key, newValue] of Object.entries(newTags)) {
	    if(tags[key]){
		if(tags[key]!=newValue){
		    different=true;
		    // line 163: updateTags()		
		    if(newValue==="🗑️'" ){
			if(tags[key]){ delete tags[key] }
		    }else{
			tags[key]=newValue;
		    }
		}
	    }else{
		if(newValue==="🗑️'" ){
		    // try to delete non existing key. do nothing. (maybe this is an an error?)
		}else{
		    different=true;
		    tags[key]=newValue;
		}
	    }
	} // for tags
	if(different)diffs.push(feature)
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
	log(2," "+error);
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
		    document.getElementById("proceed").setAttribute("style","background:red;display:block");
		    //uploadChangeset(diffs);
		}else{
		    log(2,"there are features without changes.");
		}
	    }else{
		log(2,"there are conflicts.");
	    } 
	}else{
            log(2,"the downlaoded features are not compatable with the input features.")
	}
    }    
}

    
function checkGeoJSON(jsonText){
    
    let maxlen=1;
    let ok=true;
    let json;
    
    log(0,"reading geoJSON is ok");

    // parse input
    try{
	json=JSON.parse(jsonText);
    } catch(e) {
	log(2," "+e)
	ok=false;
    }
    // check for valid geojson?
    if(ok&&json.type=='FeatureCollection'&&json.features){
	log(0,'geoJSON is valid');
	//check length
	let len=json.features.length;
	if(len>0){
	    log(0, "geoJSON has "+len+" features");
	    if(len>maxlen){
		log(1,'geoJSON is too big. It will be truncated to the first '+maxlen+' features');
		len=maxlen;
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
		log(2,"geoJSON feature types  nodes.") 
	    }
	 }else{
	    log(0,"geoJSON has no features. Nothing to do. Programm terminated.");
	 }
    }else{
	log(2,"file is not geoJSON.");
    }
}

///// some utils ///////////////////////////////////////////

function show(value){
     const node = document.createElement("p");
     node.innerHTML="<pre>"+JSON.stringify(value,null,2)+"</pre>";
     document.getElementById("work").appendChild(node);

}

function log(type, message, element="work"){

    let prefix;
    let postfix="";
    const node = document.createElement("p");

    switch(type){
    case 0:
	node.setAttribute("style","color:green;margin-top:4px;margin-bottom:4px");
	prefix="&nbsp;&nbsp;&nbsp;Info: ";
	break;
    case 1:
	node.setAttribute("style","color:orange;margin-top:4px;margin-bottom:4px");
	prefix="Warning: ";
	break;
    case 2:
	node.setAttribute("style","color:red;margin-top:4px;margin-bottom:4px");
	prefix="&nbsp;&nbsp;Error: ";
	postfix=" programm aborted."
	break;
    default:
	node.setAttribute("style","color:black;margin-top:4px;margin-bottom:4px");
	prefix="????";
	break;
    }
    node.innerHTML=prefix+message+postfix;
    document.getElementById(element).appendChild(node);     
}
