/*
Copyright (C) 2019  Code Yellow

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

var currentVersion = '0.0.1';
// LATER REMOVE EMAIL FROM if (fileExists('profiles.json')) {
const open = require("open");
//const crypto = require('crypto');
const electron = require('electron');
const fs = require('fs');
const request = require('request');
const appDataDir = require('os').homedir() + "\\AppData\\Local\\CodeYellow_Raffle";
const proxy = require('./proxy.js');

// WEBSITES SUPPORTED
const nakedcph = require('./websites/nakedcph.js');
const vooberlin = require('./websites/vooberlin.js');

var signUpURL = 'http://45.76.138.251/account.php?type=signup';

global.websites = {
	'vooberlin': {
		sitekey: '6LcyNx4UAAAAAGF7EPoti8G18kv9j9kDeQWzcVec',
		url: 'raffle.vooberlin.com',
		name: 'VooBerlin'
	},
	'nakedcph': {
		sitekey: '6LeNqBUUAAAAAFbhC-CS22rwzkZjr_g4vMmqD_qo',
		url: 'nakedcph.com',
		name: 'NakedCPH'
	}
};

// Captcha stuff
global.captchaQueue = [];



function captchaComplete(token) {
	// send ipc from HTML to bot saying complete then perform this
	global.captchaQueue.shift();
	//tasks[taskid]['g-recaptcha-token'] = ''
	//module.exports.taskStatuses[task.taskID] = 'active'
	//module.exports.taskCaptchaTokens[task.taskID] = token
}

// Captcha stuff

module.exports.capWin;

module.exports.mainBotWin;



module.exports.capStatus = 'hidden';


module.exports.captchaBank = [];

initCapWin();



module.exports.taskCaptchas = [];



initialfolderExistsOrMkDir();



getUpcomingReleases();



function loadBot() {
	if (global.settings.token == "" || global.settings.token == null) {
		openActivation(false);
	} else {
		require('getmac').getMac(function (err, macAddress) {
			if (err) {
				return;
			}
			request({
				url: 'http://45.76.138.251/api/verifyToken.php',
				method: 'post',
				formData: {
					'email': global.settings.email,
					'token': global.settings.token,
					'mac_address': macAddress
				},
			}, function (err, response, body) {
				try {
					var parsed = JSON.parse(body);
					// IF CREDENTIALS ARE VALID
					if (parsed.valid == true) {
						console.log("Saved credentials are valid. Opening Bot.")
						openBot(false);
					}
					// IF CREDENTIALS ARE NOT VALID
					else {
						console.log("Saved credentials are not valid. Opening activation.")
						openActivation(false);
					}
				} catch (error) {
					console.log('Error verifying token');
				}
			});
		});
	}
}




// THIS IS THE ACTIVATION WINDOW
function openActivation(onReady) {
	var win;
	const {
		app,
		BrowserWindow,
		ipcMain
	} = require('electron');
	// When released
	process.env.NODE_ENV = 'production';
	if (onReady) {
		app.on('ready', function () {
			win = new BrowserWindow({
				width: 930,
				height: 550,
				resizable: false,
				frame: false
			});
			win.setMenu(null);
			win.loadURL(`file://${__dirname}/src/login.html`);
			//win.webContents.openDevTools()
		});
		app.on('window-all-closed', () => {
			if (process.platform != 'darwin') app.quit();
		});
	} else {
		win = new BrowserWindow({
			width: 930,
			height: 550,
			resizable: false,
			frame: false
		});
		win.setMenu(null);
		win.loadURL(`file://${__dirname}/src/login.html`);
		//win.webContents.openDevTools()
	}
	// WHEN A MESSAGE IS RECEIVED FROM THE APPLICATION

	ipcMain.on('activateKey', function (e, emailAddress, password) {
		console.log(emailAddress);
		console.log(password);
		require('getmac').getMac(function (err, macAddress) {
			if (err) {
				win.send('notify', {
					message: 'Error activating key. Please try again',
					length: 2500
				});
				return;
			}
			request({
				url: 'http://45.76.138.251/api/login.php',
				method: 'post',
				formData: {
					'email': emailAddress,
					'password': password,
					'mac_address': macAddress
				},
			}, function (err, response, body) {
				var parsed = JSON.parse(body);
				if (parsed.valid == true) {
					console.log("Token to save: " + parsed.token);
					global.settings.token = parsed.token;
					global.settings.email = emailAddress;
					saveSettings();
					openBot();
					win.close();
				} else {
					console.log(body);
					win.send('notify', {
						message: parsed.message,
						length: 2500
					});
				}
			});
		});
	});

	// Opens sign up page
	ipcMain.on('signUp', function (e) {
		open(signUpURL);
	});

	// Utilities at the bottom
	ipcMain.on('minimizeM', function (e) {
		win.minimize();
	});
	ipcMain.on('closeM', function (e) {
		app.quit();
	});
}

function initCapWin() {
	var express = require('express');
	var bodyParser = require('body-parser');
	expressApp = express();
	var {
		app,
		BrowserWindow,
		ipcMain,
		session
	} = require('electron');
	process.env.NODE_ENV = 'production';
	app.on('ready', function () {
		module.exports.capWin = new BrowserWindow({
			height: 450,
			width: 690,
			resizable: true,
			frame: false,
			show: false
		});
		module.exports.capWin.on('close', function (event) {
			event.preventDefault();
			module.exports.capWin.hide();
		});
		ipcMain.on("updateCaptchaQueue", (event, token, task) => {
			/// TOMORROW CREATE VARIABLES FOR THINGS LIKE currCapQueue FOR global.captchaQueue[0]
			global.captchaQueue.shift();
			console.log('New captcha token received. Task ID:  ' + task['taskID'] + '. Captcha token: ' + token)
			
			module.exports.taskCaptchas[task['taskID']] = token;
			/// NEED TO STOP SO IT DOESNT SHOW THE LAST CAPTCHA AGAIN AND AGAIN
			if(global.captchaQueue.length >= 1)
			{
				console.log('Website: ' + global.captchaQueue[0]['website']);
				console.log(global.captchaQueue[0]['task']);
				module.exports.requestCaptcha(global.captchaQueue[0]['website'], global.captchaQueue[0]['task'], true, false)
			}
			else
			{
				module.exports.capWin.hide();
			}
		});
		ipcMain.on('add captcha token', function (event, data) {
			//console.log(token);
			module.exports.captchaBank.push(data);
			console.log(module.exports.captchaBank);
			//console.log(module.exports.captchaBank);
		});
		ipcMain.on('login', function (event) {
			var win = new BrowserWindow({
				backgroundColor: '#283442',
				width: 600,
				height: 600,
				maxWidth: 600,
				maxHeight: 600,
				show: false
			});

			win.setMenu(null);
			win.loadURL('https://www.youtube.com/signin', {
				extraHeaders: `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.84 Safari/537.36\naccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8\naccept-encoding: gzip, deflate, br\naccept-language: en-US,en;q=0.9,und;q=0.8\nreferer: https://www.google.com/\nupgrade-insecure-requests: 1`
			});

			win.once('ready-to-show', () => {
				win.show();
			});

		});

		expressApp.set('port', parseInt(3334));
		expressApp.use(bodyParser.json());
		expressApp.use(bodyParser.urlencoded({
			extended: true
		}));
		expressApp.get('/', function (req, res) {
			res.sendFile('src/captcha.html', {
				root: __dirname
			});
			module.exports.capWin.webContents.session.setProxy({
				proxyRules: ""
			}, function () {});
		})
		var server = expressApp.listen(expressApp.get('port'));
		server.on('error', function (e) {
			console.log(e);
		});


		module.exports.capWin.webContents.session.setProxy({
			proxyRules: 'http://127.0.0.1:3334'
		}, function (r) {
			module.exports.capWin.loadURL('http://www.raffle.vooberlin.com/'); // Domain
		});
	});

}

module.exports.requestCaptcha = function(site, task, refresh, addToQueue) {
	console.log('New captcha requested for ' + global.websites[site]['url'] + ' Task ID:' + task.taskID);
	module.exports.capWin.show();
	if(addToQueue != false)
	{
		global.captchaQueue.push({
			website: site,
			task: task
		});
	}
	if(global.captchaQueue.length == 1 || refresh == true)
	{
		console.log('Refreshing sitekey is true');
		module.exports.capWin.webContents.session.setProxy({
			proxyRules: 'http://127.0.0.1:3334'
		}, function (r) {
			module.exports.capWin.loadURL('http://www.' + global.websites[site]['url']); // Domain
			module.exports.capWin.send('captcha requested', {
				website: site
			});
		});
	}
	
}




// THIS IS THE BOT WINDOW
function openBot(onReady) {
	const {
		app,
		BrowserWindow,
		ipcMain
	} = require('electron');
	// When released
	process.env.NODE_ENV = 'production';
	if (onReady) {
		app.on('ready', function () {
			module.exports.mainBotWin = new BrowserWindow({
				width: 1100,
				height: 685,
				resizable: true,
				frame: false
			});
			//win.setMenu(null);
			module.exports.mainBotWin.loadURL(`file://${__dirname}/src/index.html`);
		});
		app.on('window-all-closed', () => {
			if (process.platform != 'darwin') app.quit();
		});
	} else {
		module.exports.mainBotWin = new BrowserWindow({
			width: 1100,
			height: 685,
			resizable: true,
			frame: false
		});
		//win.setMenu(null);
		module.exports.mainBotWin.loadURL(`file://${__dirname}/src/index.html`);
		app.on('window-all-closed', () => {
			if (process.platform != 'darwin') app.quit();
		});
	}
	// FOR DEBUGGING 
	module.exports.mainBotWin.webContents.openDevTools()
	// WHEN A MESSAGE IS RECEIVED FROM THE APPLICATION

	module.exports.mainBotWin.on('close', function (event) {
		if (process.platform != 'darwin') app.quit();
	});

	// Start Task
	ipcMain.on('startTask', function (e, task, profile) {
		//if (module.exports.taskStatuses[task.taskID] != 'active') {
		module.exports.mainBotWin.send('taskUpdate', {
			id: task.taskID,
			message: 'STARTING'
		});
		if (task['taskSiteSelect'] == 'nakedcph') {
			console.log('Nakedcph task started');
			nakedcph.performTask(task, profile)
			//module.exports.requestCaptcha('nakedcph', task, false);
		}
		else if (task['taskSiteSelect'] == 'vooberlin') {
			console.log('VooBerlin task started');
			vooberlin.performTask(task, profile)
		}
		//supreme.init(task, profiles[task.taskProfile], false)
		//	module.exports.taskStatuses[task.taskID] = 'active';
		// 
	});

	// Delete Task
	ipcMain.on('deleteTask', function (e, task) {
		module.exports.taskStatuses[task.taskID] = 'delete';
	});



	ipcMain.on('addTask', function (e, quantity) {
		require('getmac').getMac(function (err, macAddress) {
			if (err) {
				return;
			}
			request({
				url: 'https://codeyellow.io/api/addedTask.php',
				method: 'post',
				headers: {
					'x-auth-key': exports.getAuthHeader(global.settings.key, macAddress)
				},
				formData: {
					'key': global.settings.key,
					'mac_address': macAddress,
					'amount': quantity
				},
			}, function (err, response, body) {
				return;
			});
		});
	});


	ipcMain.on('saveProxies', function (e, proxies) {
		fs.writeFile(appDataDir + "\\proxies.txt", proxies, function (err) {
			if (err) {
				return;
			}
			module.exports.mainBotWin.send('notify', {
				length: 3000,
				message: 'Proxies saved'
			});
		});
	});


	ipcMain.on('testProxy', function (e, data) {
		module.exports.mainBotWin.send('proxyUpdate', {
			id: data.id,
			message: 'TESTING'
		});

		proxy.testProxy(data.proxy, function (response) {
			module.exports.mainBotWin.send('proxyUpdate', {
				id: data.id,
				message: response.message
			});
		});
	});


	// Save profiles
	ipcMain.on('saveProfiles', function (e, profilesToSave) {
		global.profiles = profilesToSave;
		saveProfiles()
	});



	ipcMain.on('downloadUpdate', function (e) {
		open(global.downloadURL);
	});


	// Utilities at the bottom
	ipcMain.on('minimizeM', function (e) {
		module.exports.mainBotWin.minimize();
	});
	ipcMain.on('closeM', function (e) {
		app.quit();
		process.exit()
	});
}


function saveSettings() {
	fs.writeFile(appDataDir + "\\settings.json", JSON.stringify(global.settings, null, 4), function (err) {
		if (err) {
			return;
		}
		console.log("Settings saved.");
	});
}

function saveProfiles() {
	fs.writeFile(appDataDir + "\\profiles.json", JSON.stringify(global.profiles, null, 4), function (err) {
		if (err) {
			return;
		}
		console.log("Profiles saved.");
	});
}





// Below is not relevant to read / modify

function initialfolderExistsOrMkDir() {
	fs.mkdir(appDataDir, function (err) {
		if (err) {
			if (err.code == 'EEXIST') {
				console.log("Folder Exists")
				createOrGetFiles();
				loadBot();
			}
		} else {
			createOrGetFiles();
			loadBot();
		}
	});
}

function createOrGetFiles() {
	request.get({
			json: true,
			url: 'http://45.76.138.251/api/version.php'
		},
		function (error, response, body) {
			if (error) {
				console.log('Error getting version');
				global.updateRequired = false;
			}
			if (currentVersion != body.version) {
				console.log('Update required. Latest version: ' + body.version);
				global.updateRequired = true;
				global.downloadURL = body.download;
			}
		});
	if (fileExists('settings.json')) {
		console.log("settings.json exists");
		var fileContents = fs.readFileSync(appDataDir + "\\settings.json");
		if (fileContents == '' || fileContents == null || fileContents == undefined) {
			var parsed = JSON.parse('{"token": "","email": ""}', null, 4);
			makeFile('settings.json', JSON.stringify(parsed, null, 4))
			global.settings = parsed;
		} else {
			global.settings = JSON.parse(fileContents);
		}
	} else {
		var parsed = JSON.parse('{"token": "","email": ""}', null, 4);
		makeFile('settings.json', JSON.stringify(parsed, null, 4))
		global.settings = parsed;
	}

	if (fileExists('profiles.json')) {
		console.log("profiles.json exists");
		var fileContents = fs.readFileSync(appDataDir + "\\profiles.json");
		if (fileContents == '' || fileContents == null || fileContents == undefined) {
			var parsed = JSON.parse('{"Example Profile":{"email":"example@gmail.com","fullName":"John Doe","address":"21 Cresent Road","aptSuite":"","zipCode":"UB3 1RJ","city":"London","country":"State/Province","country":"United Kingdom","stateProvince":"none","phoneNumber": "07700900087","email":"johndoe@gmail.com","cardType":"visa","cardNumber":"4242424242424242","expiryMonth":"06","expiryYear":"2023","CVV":"361"}}', null, 4);
			makeFile('profiles.json', JSON.stringify(parsed, null, 4))
			global.profiles = parsed;
		} else {
			global.profiles = JSON.parse(fileContents);
		}
	} else {
		var parsed = JSON.parse('{"Example Profile":{"email":"example@gmail.com","fullName":"John Doe","address":"21 Cresent Road","aptSuite":"","zipCode":"UB3 1RJ","city":"London","country":"State/Province","country":"United Kingdom","stateProvince":"none","phoneNumber": "07700900087","email":"johndoe@gmail.com","cardType":"visa","cardNumber":"4242424242424242","expiryMonth":"06","expiryYear":"2023","CVV":"361"}}', null, 4);
		makeFile('profiles.json', JSON.stringify(parsed, null, 4))
		global.profiles = parsed;
	}

	if (fileExists('proxies.txt')) {
		console.log("proxies.txt exists");
		var proxyFile = fs.readFileSync(appDataDir + "\\proxies.txt", 'utf8').split('\n');
		global.proxies = proxyFile == '' ? [] : proxyFile;
	} else {
		makeFile('proxies.txt', '')
		global.proxies = [];
	}
}

function getUpcomingReleases() {
	request.get({
			headers: {
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
			},
			json: true,
			url: 'http://45.76.138.251/api/releases.php'
		},
		function (error, response, body) {
			global.releases = body;
		});
}

function fileExists(name) {
	const fileExists = fs.existsSync(appDataDir + "\\" + name);
	if (fileExists) {
		return true;
	} else {
		return false;
	}
}

function makeFile(name, data) {
	fs.writeFile(appDataDir + "\\" + name, data, function (err) {
		if (err) {
			return console.log(err);
		}
	});
}
exports.getAuthHeader = function (key, mac) {
	var salt = 'e53682768ac9f61d55959734a3d4c32b';
	return 'temp';
	//return (crypto.createHash('sha256').update(key).update(`${mac}${key}${salt}`).digest("hex"));
}