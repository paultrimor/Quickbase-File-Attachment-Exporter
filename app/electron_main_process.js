const {app, BrowserWindow, ipcMain, dialog} = require('electron');
const axios = require('axios');

const path = require('path');
const dom = require('xmldom').DOMParser;
const xpath = require('xpath'); 
const fs = require('fs');
global.sharedObj = { 
	'authTicket': '', 
	'domain': '',
	'selectedDbid': '',
	'fileAttachmentIds': [],
	'outputPath': ''
}; 

let win;

app.on('ready', function() {
	win = new BrowserWindow({
		width: 400,
		height: 600,
		autoHideMenuBar: true,
		icon: __dirname  + '/quickbase-logo.png',
		 webPreferences: {
            nodeIntegration: true
        }
	});
	win.setIcon(path.resolve(__dirname, 'dist', 'quickbase-logo-small.png'));
	win.loadURL(
		path.resolve(__dirname, './index.html')); 
	win.on('closed', () => {
		win = null;
	});
});

ipcMain.on('get-authentication', async (event, props) => {	
	global.sharedObj['domain'] = props.domain;
	axios({
  		method: 'get',
		url:
			props.domain+'/db/main?a=API_Authenticate'+
			'&username='+props.username +
			'&password='+props.password,
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
  		props['errorMessage'] += ' Please use domain format: https://realm.quickbase.com';
  		event.returnValue = props; 
  	});
});

ipcMain.on('get-tables', (event, props) => {
	axios({
		method: 'get',
		url:
			global.sharedObj['domain'] + '/db/main?a=API_GrantedDBs' +
			'&ticket=' + global.sharedObj['authTicket'],
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
			global.sharedObj['fileAttachmentIds'] = fileAttachmentIds;
		}
		event.returnValue = props;
	}).catch(function(error) {
		var props = {}; 
		parseError(error, props);
		event.returnValue = props;
	});	
});

ipcMain.on('get-num-files', (event, props) => {
	if (global.sharedObj['fileAttachmentIds'].length < 1) {
		let props = {
			'error' : true, 
			'errorMessage': `There aren't any file attachements on this table to export.`
		};
		event.returnValue = props; 
	}
	var query = global.sharedObj['fileAttachmentIds'].map((id) => {
		return "{'"+id+"'.XEX.''}";
	}).join("AND");

	axios({
		method: 'get',
		url: global.sharedObj['domain']+'/db/'+
			global.sharedObj['selectedDbid']+'?a=API_DoQueryCount'+
			'&fmt=structured&useFids=1&query='+query+
			'&ticket='+global.sharedObj['authTicket']
	}).then((response) =>{
		var props = {};
		if(parseError(response, props)) {
			var numFiles = /(<numMatches>).*?(?=<\/numMatches>)/.exec(response.data)[0];
			numFiles = numFiles.replace('<numMatches>', '');
			props["numFiles"] = numFiles;
			if (parseInt(numFiles) === 0) {
				props['error'] = true;
				props['errorMessage'] = 
					`There aren't any file attachements on this table to export.`;
			} 
		}
		event.returnValue = props;
	}).catch((error) => {
		var props = {};
		parseError(error, props);
		event.returnValue = props;
	});
});

ipcMain.on('get-files', (event, props) => {
	var query = global.sharedObj['fileAttachmentIds'].map((id) => {
		return  "{'"+id+"'.XEX.''}";
	}).join("AND");
	var clist = global.sharedObj['fileAttachmentIds'].join(".");
	axios({
		method: 'get',
		url:
			global.sharedObj['domain']+'/db/'+
			global.sharedObj['selectedDbid']+'?a=API_DoQuery'+
			'&fmt=structured&query='+query+
			'&clist='+clist+'&includeRids=1'+
			'&ticket='+global.sharedObj['authTicket']
	}).then(response => {
		var props = { files: null };
		props.files = parseUrls(response);
		global.sharedObj["files"] = props.files;
		event.returnValue = props; 
	}).catch(error => {
		var props = {}; 
		event.returnValue = parseError(error, props);
	});
});

ipcMain.handle('get-output-path', async (event, props) => {
	try {
		var saveFileLocation = await dialog.showOpenDialog(win, {properties: ['openDirectory']});
		if (saveFileLocation.canceled) {
			return false;
		}
	} catch(error) {
		console.log(error);
		return false;
	}
	if (!fs.existsSync(saveFileLocation.filePaths[0])) {
		fs.mkdirSync(path.join(saveFileLocation.filePaths[0]));
	}
	global.sharedObj['outputPath'] = saveFileLocation.filePaths[0];
	return true;
});

ipcMain.handle('download-file', async (event, props) => {
	var filepath = path.resolve(global.sharedObj['outputPath'], props.filename);
	var writeStream = fs.createWriteStream(filepath);
	await axios({
		method: 'get',
		url: props.url+"?ticket="+global.sharedObj['authTicket'],
		responseType: 'stream'
	}).then((response) => {
		response.data.pipe(writeStream);
		let error = null;
		writeStream.on('error', err => {
			error = err;
			writer.close();
			reject(err);
		});
		writeStream.on('close', () => {
			if (!error) {
				return true;
			}
		});
	}).catch((error) => {
		console.log(error);
		return false;
	});
	return `(${props.index+1}/${props.size})downloaded ${props.filename}`;
});

var parseError = function(response, props) {
	try {
   		var errorCode = /(<errcode>).*?(?=<\/errcode>)/.exec(response.data)[0];
   		errorCode = errorCode.replace('<errcode>', '');
   	}  catch (e) {
		var errorCode = null;
   	}
   	if (errorCode == 0) {
   		props['error'] = false; 
   		return true;
   	} else if (errorCode > 1) {
   		props['error'] = true; 
   		try {
   			props['errorMessage'] = /<errdetail>.*?(?=<\/errdetail>)/.exec(response.data)[0];
   			props['errorMessage'] = props['errorMessage'].replace('<errdetail>', ''); 
   		} catch (e) {
   			props['errorMessage'] = `There was en error. 
   			Try checking the table you selected.`;
   		}
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

var parseUrls = function(response) {
	var myDom = new dom().parseFromString(response.data.toString());
	var nodes = xpath.select("//record/f", myDom);
	var urls = [];
	nodes.forEach(node => {
		urls.push({
			filename: node.childNodes[0].data,
			url: xpath.select1('url', node).childNodes[0].data
		});
	});	
	return urls;
};