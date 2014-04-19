var config = require('../lib/config/config_dev.json');
//dependencies
var request = require('request');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var xml2js = require('xml2js');
var colors = require('colors');

//var track = 133018217;// little playlists ( < 20)
//var track = 137708729; //large one
var track = 100839724; //moyen
var count = 0, limit = 10;
var returned = 0; //counts the finished operations
var min = 0, max = 200; //we do not consider more than 200 playlists
var iteration = 0;
var template = ['https://api.soundcloud.com/tracks/', '/playlists?app_version=c6c140c5&client_id=b45b1aa10f1ac2941910a7f0d10f8e28&limit=', '&linked_partitioning=0&offset='];
var temp_storage = new Array();

//latch controller for end of operation and starting of reducer
var latch = new EventEmitter();
latch.on('end_sort', function (data, id){
	temp_storage = temp_storage.concat(data);
	returned++;
	console.log(id + " FINISHED".white);
	if(returned == count && count >= max) {
		console.log("Total tracks: ".red + temp_storage.length);
		reduce(temp_storage);
	}
});

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
		    		sort_count(res,  function(res) {
		    			latch.emit('end_sort', res, ct);
		    		});
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
	    function () { return (count <= max) },
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
    for(var playlist in source['playlists']['playlist']) {
    	for(var track in source['playlists']['playlist'][playlist]['tracks'][0]['track'])
	    	list.push(source['playlists']['playlist'][playlist]['tracks'][0]['track'][track]['id'][0]['value']);
    }
	callback(list);
}

//compte le nombre d'apparitions de chaque titre
function sort_count(source, callback) {
    var counts = {};

	for(var i=0;i< source.length;i++)
	{
	  var key = source[i];
	  counts[key] = (counts[key])? counts[key] + 1 : 1 ;
	}

	var sortable = [];
	for (var track in counts)
	      sortable.push([track, counts[track]]);
	sortable.sort(function(a, b) {return a[1] - b[1]});
	callback(sortable);
}

function reduce(source) {
    var counts = {};

	for(var i=0;i< source.length;i++)
	{
	  var key = source[i][0];
	  counts[key] = (counts[key])? counts[key] + source[i][1] : source[i][1] ;
	}

	var sortable = [];
	for (var track in counts)
	      sortable.push([parseInt(track), counts[track]]);
	sortable.sort(function(a, b) {return a[1] - b[1]});

	console.log("Final Result top10: ");
	for(var i = sortable.length-2 ; i >= Math.max(0, sortable.length-11) ; i--)
		console.log(sortable[i]);
	console.log(typeof sortable[1][0]);
	console.log("===== FINAL END =====".red);
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
		    			dichotomie(Math.floor((ct+min)/3)); // going to the 1st third instead of middle to be faster
		    		}
		    	}
		    });
		    parser.parseString(html);
		}
	});
}

exports.synchronize = synchronize;