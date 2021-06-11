const fetch = require('node-fetch');
const chalk = require('chalk');
const fs = require('fs');

const AppId = process.env.appid;
const AppSecret = process.env.appsecret;
const AppScops = [
	'esi-universe.read_structures.v1',
	'esi-location.read_ship_type.v1',
	'esi-location.read_location.v1',
	'esi-bookmarks.read_character_bookmarks.v1',
	'esi-fittings.read_fittings.v1',
	'esi-fittings.write_fittings.v1',
	'esi-assets.read_assets.v1',
	'esi-characters.read_standings.v1',
	'esi-skills.read_skills.v1',
	'esi-skills.read_skillqueue.v1'
];
const AppCallbackUrl = 'http://localhost/oauth-callback';
const SessionDir = './sessions/';
const ResponsTokenNotValid = 100;
const ResponsForbidden = 100;
const ApiVersion = 'latest/'
const BaseApiUrl = `https://esi.evetech.net/${ApiVersion}`;

const { apiGet } = require('./esiApi');

var currentSessions = []

exports.NoSession = 101;
exports.AppId = AppId
exports.AppScops = AppScops
exports.AppCallbackUrl = AppCallbackUrl
exports.ResponsTokenNotValid = ResponsTokenNotValid
exports.ResponsForbidden = ResponsForbidden
exports.currentSessions = currentSessions

loadSessions()

function errorNotLoggedIn() {
	return 'Not logged in <a href="' + eveLoginLink() + '">Login</a>'
}

function renewSession(session) {
	console.log("Renewing expired Session Token")
	return new Promise((resolve, reject) => {
		if (session['refresh_token']) {
			const body = {
				grant_type: "refresh_token",
				refresh_token: session['refresh_token']
			}
			const options = {
				//hostname: 'https://login.eveonline.com/oauth/token',
				method: 'post',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': "Basic " + stringToBase64(AppId + ":" + AppSecret)
				},
				body: JSON.stringify(body)
			}
			fetch('https://login.eveonline.com/oauth/token', options)
				.then(res => res.json())
				.then(json => {
					if (json['access_token'] && json['refresh_token']) {
						session['access_token'] = json['access_token']
						session['refresh_token'] = json['refresh_token']
					}
					console.log("New Session: ")
					logSession(session)
					saveSession(session)
					resolve(session)
				})
		} else {
			console.log('Session invalid')
			reject('Session invalid')
		}
	})
}

function exchangeCodeWithAccesToken(code) {
	return new Promise((resolve, reject) => {
		const body = {
			grant_type: "authorization_code",
			code: code
		}

		const options = {
			//hostname: 'https://login.eveonline.com/oauth/token',
			method: 'post',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': "Basic " + stringToBase64(AppId + ":" + AppSecret)
			},
			body: JSON.stringify(body)
		}

		fetch('https://login.eveonline.com/oauth/token', options)
			.then(res => res.json())
			.then(json => resolve(json))
	})
}

function logSession(session) {
	console.log(chalk.blue(`#####Session ${chalk.underline(session.CharacterName)}#####`))
	for (var i in session) {
		console.log(i + " : " + chalk.green(session[i]))
	}
}

function replaceSession(nSession) {
	var characterName = nSession.CharacterName
	console.log(characterName)
	for (index in currentSessions) {
		if (currentSessions[index].CharacterName == characterName) {
			currentSessions[index] = nSession
			return
		}
		// } else {
		//   console.log(currentSessions[index].CharacterName + ' not equal ' + characterName);
		// }
	}
	console.log('Character not found in current Sessions adding new session to sessions')
	currentSessions.push(nSession)
}

function loadSessions() {
	fs.readdir(SessionDir, (err, files) => {
		if (err) {
			throw err
		} else {
			var temp = []
			for (i in files) {
				try {
					const text = fs.readFileSync(SessionDir + files[i])
					const j = JSON.parse(text)
					temp.push(j)
				} catch(e) {
					console.log(e)
				}
			}
			console.log('Loaded Sessions ' + temp.length)
			currentSessions = temp
		}
	})
}

function newEsiAuthToken(code) {
	return new Promise((resolve, reject) => {
		exchangeCodeWithAccesToken(code).then((j) => {
			resolve(j)
		})
	})
}

function getCharacterId(accTok) {
	return new Promise((resolve, reject) => {
		const options = {
			//hostname: 'https://login.eveonline.com/oauth/token',
			method: 'get',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': "Bearer " + accTok
			}
		}
		var f = fetch('https://login.eveonline.com/oauth/verify', options)
		f.then(res => res.json()).then(json => resolve(json))
		f.catch((e) => {
			console.log(e)
			reject('Error fetching')
		})
	})
}

function getSession(match) {
	for (index in currentSessions) {
		if (currentSessions[index].CharacterName == match) {
			return currentSessions[index]
		}
	}
	return null
}

function saveSession(session) {
	try {
		session['savedDate'] = Date.now()
		const path = SessionDir + session.CharacterName.replace(' ', '_') + '.json'
		fs.writeFile(path, JSON.stringify(session), (err) => {
			if (err) throw err
			console.log('Session for ' + session.CharacterName + ' has bin saved')
		})
	} catch(e) {
		console.log('Session parameter not a json')
		console.log(e)
	}
}

function constructHeader(response) {
	var head = {}
	for(const header of response.headers){
		head[header[0]] = header[1]
	}
	return head
}

function eveLoginLink() {
	if (AppCallbackUrl && AppId && AppScops) {
		return `https://login.eveonline.com/oauth/authorize?response_type=code&redirect_uri=${AppCallbackUrl}`
			+ `&client_id=${AppId}&scope=${AppScops.join('%20')}`
	} else {
		console.log('AppCallbackUrl, AppId or AppScops not available');
		return null
	}
}

function apiCharacterFetch(apiEndpoint, session, page) {
	return new Promise((resolve, reject) => {
		function resolveRespons(res, callbackResolve, callbackReject) {
			res.json().then((data) => {
				var head
				try {
					head = constructHeader(res)
					callbackResolve({
						head: head,
						data: data
					})
				} catch (e) {
					callbackResolve({
						head: null,
						data: data
					})
				}
			}, (e) => {
				if (e) {
					callbackReject(e)
				}
			})
				.catch((e) => {
					callbackReject(e)
				})
		}
		function tryFetch(s) {
			return new Promise((resolve2, reject2) => {
				const url = `${BaseApiUrl}characters/${s.CharacterID}/${apiEndpoint}/?datasource=tranquility`
					+ `&page=${page}&token=${s.access_token}`
				const options = {
					method: 'get',
					headers: {
						accept: "application/json"
					}
				}
				fetch(url, options)
					.then((res) => {
						if (res.ok) {
							resolveRespons(res, resolve2, reject2)
						} else {
							if (res.status == 403) {
								reject2(ResponsTokenNotValid)
							} else {
								reject2(apiEndpoint + ' Lookup Failed Respons Code ' + res.status)
							}
						}
					}, (error) => {
						if (error) {
							console.log(error)
							reject2(error)
						}
					})
					.catch((e) => {
						console.log(e)
						reject2('Error fetching')
					})
			})
		}
		tryFetch(session).then((data) => {
			resolve(data)
		}, (error) => {
			if (error == ResponsTokenNotValid) {
				renewSession(session).then((newSession) => {
					replaceSession(newSession)
					tryFetch(newSession).then((data) => {
						resolve(data)
					}, (err) => {
						if (err) {
							reject(err)
						}
					})
				})
			} else if (error) {
				console.log(error)
				reject(error)
			}
		})
	})
}

function hasSessions() {
	return currentSessions.length != 0
}

exports.getAllCurrentSessions = function() {
	return currentSessions
}

exports.clearAllSesions = function() {
	currentSessions = []
	fs.readdir(SessionDir, (err, files) => {
		if (err) {
			console.log(err)
		} else {
			for (i in files) {
				fs.unlink(SessionDir + files[i], (err) => {
					if (err) {
						console.log(err)
					}
				})
			}
		}
	})
}

exports.newEsiAuthSession = function (code) {
	return new Promise((resolve, reject) => {
		newEsiAuthToken(code).then((j) => {
			if (j && j["access_token"]) {
				getCharacterId(j["access_token"])
					.then((t) => {
						var session = {
							access_token: j["access_token"],
							refresh_token: j["refresh_token"],
							...t
						}
						logSession(session)
						currentSessions.push(session)
						resolve(session)
					})
					.catch((e) => {
						console.log(e)
						reject();
					})
			}
		})
	})
}

exports.logAllSessions = function() {
	if (hasSessions()) {
		for (s in currentSessions) {
			logSession(currentSessions[s])
		}
		console.log(chalk.green('Logged ' + currentSessions.length + ' saved Sessions'));
	} else {
		console.log(chalk.yellow('There are no current Sessions'));
	}
}

exports.apiCall = function(path, session, options) {
	var ignore403 = false;
	if (options) {
		ignore403 = options.ignore403 || false;
	}
	var urlstub = `${BaseApiUrl}${path}?datasource=tranquility&token=`;
	var options = {
		method: 'get',
		headers: {
			accept: "application/json"
		}
	}

	function fetchBlock(session, options) {
		const url = urlstub + session.access_token;
		// console.log('apiCall Fetching ', url);
		return new Promise((resolve2, reject2) => {
			fetch(url, options).then((res) => {
				if (res.ok) {
					res.json().then((data) => {
						// console.log(data);
						resolve2(data);
					})
				} else if (res.status == 403) {
					reject2(ResponsForbidden);
				} else {
					reject2(path + ' Lookup Failed Respons Code ' + res.status);
				}
			}, (e) => {
				if (e) {
					reject2(e);
				}
			})
		})
	}

	return new Promise((resolve, reject) => {
		fetchBlock(session, options).then((data) => {
			resolve(data);
		}, (e) => {
			if (e == ResponsForbidden) {
				if (ignore403) {
					reject(e);
				} else {
					renewSession(session).then((newSession) => {
						replaceSession(newSession);
						fetchBlock(newSession, options).then((data) => {
							resolve(data)
						}, (e) => {
							if (e) {
								reject(e);
							}
						})
					});
				}
			}
		})
			.catch((e) => {
				reject(e);
			});
	})
}

exports.getCharacterId = getCharacterId
exports.newEsiAuthToken = newEsiAuthToken
exports.renewSession = renewSession
exports.getSession = getSession
exports.saveSession = saveSession
exports.eveLoginLink = eveLoginLink
exports.errorNotLoggedIn = errorNotLoggedIn
exports.hasSessions = hasSessions
exports.apiCharacterFetch = apiCharacterFetch
exports.replaceSession = replaceSession

function stringToBase64(str) {
	return Buffer.from(str).toString('base64')
}
