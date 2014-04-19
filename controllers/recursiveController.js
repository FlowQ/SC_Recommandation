var config = require('../lib/config/config_dev.json');
//dependencies
var request = require('request');
var async = require('async');
var xml2js = require('xml2js');
var colors = require('colors');

//var track = 133018217;// little playlists ( < 20)
//var track = 137708729; //large one
var track = 100839724; //moyen
var count = 0, limit = 10;
var min = 0, max = 200; //we do not consider more than 200 playlists
var iteration = 0;
var template = ['https://api.soundcloud.com/tracks/', '/playlists?app_version=c6c140c5&client_id=b45b1aa10f1ac2941910a7f0d10f8e28&limit=', '&linked_partitioning=0&offset='];
function get_same_songs(ct) {
	var url = template[0] + track + template[1] + limit + template[2] + ct*limit;
	request(url, function (error, response, html) {
		if(error) {
			console.log(error);
		} else if(response.statusCode != 200) {
			console.log(ct + " " + response.statusCode);
		} else {
			var parser = new xml2js.Parser({charkey: 'value'});
			//listener ecoutant la fin du parsage d'un xml puis appelant la fonction listant les titres
		    parser.addListener('end', function(result) { 
		    	lists_songs(result, function(res) {
		    		console.log(('CT: ' + ct + ' ' + res.length).white);
		    	}); 
		    });
		    parser.parseString(html);
		}
	});
}

function synchronize (url) {
	dichotomie(max);

	async.doWhilst(
	    function (callback) {
	    	get_same_songs(count);
	    	console.log(('COUNT LAUNCHED: ' + count).grey);
	        count++;
	        setTimeout(callback, 300);
	    },
	    function () { return (count < max) },
	    function (err) {
	    	console.log("END doWhilst ======".red)
	    	if(err)
		    	console.log(err);
	    }
	);
}

//liste les titres des playlists du xml
function lists_songs(source, callback) {
	var list = new Array();
	if(!source['playlists']['$']['next-href'])
		stop = true;
    for(var playlist in source['playlists']['playlist']) {
    	for(var track in source['playlists']['playlist'][playlist]['tracks'][0]['track'])
	    	list.push(source['playlists']['playlist'][playlist]['tracks'][0]['track'][track]['id'][0]['value']);
    }
	callback(list);
}
/*
* Asynchronous function
* Which goal is to determine the top value of the page to query
* in parallel of the scraping of the pages of SC
*/
function dichotomie(ct) {
	var url = template[0] + track + template[1] + limit + template[2] + ct*limit;
	request(url, function (error, response, html) {
		if(response.statusCode == 200 && !error) {
			var parser = new xml2js.Parser({charkey: 'value'});
			//listener ecoutant la fin du parsage d'un xml puis appelant la fonction listant les titres
		    parser.addListener('end', function(result) { 
		    	//case not far enough
		    	iteration++;
		    	if(result['playlists']['$']['next-href']) {
		    		if(max-ct <= 1 && iteration!=1) {
		    			console.log("aEND DICHO: " + ct + " === min: " + min + " -  max: " + max);

		    		} else {
		    			console.log(("aDICHO: " + ct).white);
		    			min = ct;
		    			dichotomie(Math.floor((ct+max)/2));
		    		}
		    	} else { //case too far
		    		if(max-ct == 0 && iteration!=1) {
		    			console.log("iEND DICHO: " + ct + " === min: " + min + " -  max: " + max);

		    		} else {
		    			max = ct;
		    			console.log(("iDICHO: " + ct).white);
		    			dichotomie(Math.floor((ct+min)/2));
		    		}
		    	}
		    });
		    parser.parseString(html);
		}
	});
}


exports.get_same_songs_rec = get_same_songs;
exports.dichotomie = dichotomie;
exports.synchronize = synchronize;