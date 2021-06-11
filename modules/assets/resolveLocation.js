const esiApi = require('../../api/esiApi');
const esiLogin = require('../../api/esiLogin');
const moduleCache = require('../../modules/cache');

const ResponseForbidden = esiApi.ResponseForbidden;

const CrawlerInterval = 500;

var stationIdLookup = [];
var NameCrawling = false;
var NameCrawlerSessions = [];
var NameCrawlerIntervalHandle;

var idCache = new moduleCache('Station_id_Cache');

async function startNameCrawler() {
	if (NameCrawling) {
		return;
	}
	console.log('Starting crawler for:', stationIdLookup);
	NameCrawling = true;
	await sleep(200);
	NameCrawlerIntervalHandle = setInterval(async () => {
		function fetchBlock(id, session) {
			return new Promise((resolve, reject) => {
				fetchLocationName(id, session).then((data) => {
					console.log('FetchLocationName Result: ', data)
					resolve(data);
				}, e => {
					console.log(e);
					reject();
				})
			})
		}
		let sessions = [];
		for (let i in NameCrawlerSessions) {
			sessions.push(esiLogin.getSession(NameCrawlerSessions[i]));
		}
		let id = stationIdLookup.pop();
		if (id) {
			for (let i in sessions) {
				console.log('Trying Session', sessions[i].CharacterName);
				try {
					let data = await fetchBlock(id, sessions[i]);
					console.log('Wrote to cache Station id: ' + id, data);
					idCache.write_data(id, {
						found: true,
						...data
					});
					const index = stationIdLookup.indexOf(id);
					if (index > -1) {
						stationIdLookup.splice(index, 1);
					}
					break;
				} catch (e) {
					console.log(e);
					const index = stationIdLookup.indexOf(id);
					if (index > -1) {
						stationIdLookup.splice(index, 1);
					}
					break;
				}
			}
		} else {
			clearInterval(NameCrawlerIntervalHandle);
			NameCrawling = false;
			console.log('Finished Crawling');
		}
	}, CrawlerInterval);
}

async function lookupLocationForCharacter(session, id) {
	console.log('Api Location Lookup', session.CharacterName ,id)
	function fetchBlock(id, session) {
		return new Promise((resolve, reject) => {
			fetchLocationName(id, session).then((data) => {
				console.log('FetchLocationName Result: ', data)
				resolve(data);
			}, e => {
				console.log(e);
				reject();
			})
		})
	}
	try {
		let data = await fetchBlock(id, session);
		console.log('Wrote to cache Station id: ' + id, data);
		idCache.write_data(id, {
			found: true,
			...data
		});
		const index = stationIdLookup.indexOf(id);
		if (index > -1) {
			stationIdLookup.splice(index, 1);
		}
	} catch (e) {
		console.log(e);
		const index = stationIdLookup.indexOf(id);
		if (index > -1) {
			stationIdLookup.splice(index, 1);
		}
	}
}

function fetchLocationName(id, session) {
	// Uses the session and the id to try and figure out what the name of the structure is
	// returns an Object with the following keys:
	// {
	// 	found: boolean,
	// 	name: String,
	// 	fullData: the response data of the id
	// }
	const throttle = 500;
	let endpoint;
	id = Number(id);
	if (!Number.isInteger(id)) return Promise.reject('fetchLocation: Id not Number');
	if (id > 100000000) {
		//Not NPC Station
		endpoint = 'structures';
	} else if (id < 100000000) {
		if (id > 60000000) {
			endpoint = 'stations';
		} else {
			endpoint = 'systems';
		}
	}
	console.log('Fetching', endpoint, id);
	function fetchBlock(id, session) {
		return new Promise((resolve2, reject2) => {
			esiApi.apiUniverse(endpoint, session, {
				ignore403: true,
				id,
			}).then((data) => {
				console.log('fetchBlock', data)
				resolve2(data);
			}, e => {
				reject2(e);
			})
		})
	}
	function toName(data) {
		switch (endpoint) {
			case 'structures':
				return {
				 	found: true,
					type: 'structure',
					name: data.name,
					fullData: data
				}
			case 'systems':
				return {
					found: true,
					type: 'system',
					name: data.name,
					fullData: data
				}
			case 'stations':
				return {
					found: true,
					type: 'structure',
					name: data.name,
					fullData: data
				}
		}
	}
	return new Promise((resolve, reject) => {
		fetchBlock(id, session).then((data) => {
			let body = data.data;
			resolve(toName(body));
		}, (e) => {
			if (e && e === ResponseForbidden) {
				resolve({
					found: false,
					name: 'Anonymous Location #' + id,
					fullData: null
				});
			} else if (e) {
				reject(e);
			}
		})
			.catch(e => {
				console.log(e);
				reject(e);
			});
	})
}

exports.getLocationName = function(id, session) {
	if (!session) {
		console.log('resolveLocation:getLocationName Warrning: No session given!');
	}
	if (!id) return {
		found: false,
		name: ""
	}
	if (!NameCrawlerSessions.includes(session.CharacterName)) {
		NameCrawlerSessions.push(session.CharacterName);
	}
	let data = idCache.get_data(id);
	console.log("Cache read found: ", data ? data.found : undefined);
	if (data && data.found) {
		// console.log('Returning Cache Data', data)
		return data;
	} else if (data && data.found === false){
		// if (!stationIdLookup.includes(id)) {
		// 	stationIdLookup.push(id);
		// }
		// if (!NameCrawling) {
		// 	console.log('Starting Name Crawler');
		// 	startNameCrawler();
		// }
		return {
			found: false,
			name: ""
		};
	} else {
		lookupLocationForCharacter(session, id);
	}
}

function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(_ => {
			resolve();
		}, ms);
	});
}
