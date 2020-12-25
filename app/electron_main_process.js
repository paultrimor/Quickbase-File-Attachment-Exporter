const {app, BrowserWindow, ipcMain} = require('electron');
const axios = require('axios');
const path = require('path');
const dom = require('xmldom').DOMParser;
const xpath = require('xpath'); 
const fs = require('fs');

global.sharedObj = { 
	'authTicket': '', 
	'domain': '',
	'selectedDbid': '',
	'fileAttachmentIds': ''
}; 

let win;

app.on('ready', function() {
	win = new BrowserWindow;
	win.webContents.openDevTools();
	win.loadURL(
		path.resolve(__dirname, './index.html')); 
	win.on('closed', () => {
		fs.rmdirSync(fileLocation, (err) => {
			console.log('temp directory removes')});
		win = null
	});
});

ipcMain.on('get-authentication', async (event, props) => {	
	global.sharedObj['domain'] = props.domain;
	var quickbaseUrl = 
		props.domain + '/db/main?a=API_Authenticate' +
		'&username=' + props.username +
		'&password=' + props.password; 
	axios({
  		method: 'get',
  		url: quickbaseUrl,
  		params: {
  			a: 'API_Authenticate',
  			username: props.username, 
  			password: props.password 
  		},
  		responseType: 'json'
	}).then(function (response) {
		var props = {}; 
		if (parseError(response, props)) {
	   		props['authTicket'] = /<ticket>.*?(?=<\/ticket>)/.exec(response.data)[0];
   			props['authTicket'] = props['authTicket'].replace('<ticket>', ''); 
		} else {
	   		props['authTicket'] = ''; 
		}
		global.sharedObj['authTicket'] = props['authTicket'];
	   	event.returnValue = props;  	
  	}).catch(function (error) {
  		var props = {};
  		parseError(error, props);
  		props['authTicket'] = '';
  		event.returnValue = props; 
  	});
});

ipcMain.on('get-tables', (event, props) => {
	var quickbaseUrl = 
		global.sharedObj['domain'] + '/db/main?a=API_GrantedDBs' +
		'&ticket=' + global.sharedObj['authTicket']; 
	axios({
		method: 'get',
		url: quickbaseUrl,
		responseType: 'json' 
	}).then((response) => {
		event.returnValue = parseTables(response);
	}).catch((error) => {
		event.returnValue = error;
	});
});

ipcMain.on('get-table-details', (event, props) => {
	global.sharedObj['selectedDbid'] = props.dbid;
	axios({
		method: 'get',
		url: global.sharedObj['domain']+'/db/'+props.dbid+'?a=API_GetSchema' +
		'&ticket='+global.sharedObj['authTicket']
	}).then(response => {
		var props = {};
		if(parseError(response, props)) {
			var fileAttachmentIds = parseFileAttachments(response, props);
			global.sharedObj['fileAttachmentIds'] =  fileAttachmentIds;
			getNumFiles(); 
		}
		event.returnValue = props;
	}).catch(function(error) {
		var props = {}; 
		parseError(error, props);
		event.returnValue = props;
	});	
});

ipcMain.on('get-num-files', (event, props) => {
	var query = global.sharedObj['fileAttachmentIds'].map((id) => {
		return "{'"+id+"'.XEX.''}";
	}).join("AND");
	axios({
		method: 'get',
		url: global.sharedObj['domain']+'/db/'+
		global.sharedObj['selectedDbid']+'?a=API_DoQueryCount'+
		'&useFids=1&ticket='+global.sharedObj['authTicket']+
		'&query='+query
	}).then((response) =>{
		var props = {};
		if(parseError(response, props)) {
			var numFiles = /(<numMatches>).*?(?=<\/numMatches>)/.exec(response.data)[0];
			numFiles = errorCode.replace('<numMatches>', '');
			props["numFiles"] = numFiles;
		}
		event.returnValue = props;
	}).catch((error) => {
		console.log("get-num-files axios error");
		event.returnValue = "error";
	});
});

var parseError = function(response, props) {
	try {
   		var errorCode = /(<errcode>).*?(?=<\/errcode>)/.exec(response.data)[0];
   		errorCode = errorCode.replace('<errcode>', '');
   	}  catch (e) {
   		var errorCodde = null;
   	}
   	if (errorCode == 0) {
   		props['error'] = false; 
   		return true;
   	} else if (errorCode > 1) {
   		props['error'] = true; 
   		props['errorMessage'] = /<errdetail>.*?(?=<\/errdetail>)/.exec(response.data)[0];
   		props['errorMessage'] = props['errorMessage'].replace('<errdetail>', ''); 
   		return false;
   	} else {
   		props['error'] = true; 
   		props['errorMessage'] = 
   			`There was en error. 
   			 Try checking your browser or the domain you typed.`;
   		return false;
   	}
};

var parseTables = function(response) {
	var myDom = new dom().parseFromString(response.data.toString());
	var nodes = xpath.select('//dbinfo', myDom);
	var tables = [];
	nodes.forEach((node) => {
		tables.push({
			dbname: xpath.select1('dbname', node).childNodes[0].data, 
			dbid: xpath.select1('dbid', node).childNodes[0].data
		});			
	});
	return tables;
};

var parseFileAttachments = function(response, props) {

	var myDom = new dom().parseFromString(response.data.toString());
	var nodes = xpath.select("//field[@field_type='file']/@id", myDom);
	var fileAttachmentIds = [];
	nodes.forEach((attrs) => {
		fileAttachmentIds.push(attrs.value);
	});
	props['numFileIds'] = fileAttachmentIds.length; 
	return fileAttachmentIds;
};
