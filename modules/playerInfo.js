const esiLogin = require('../api/esiLogin');
const esiApi = require('../api/esiApi');
const moduleAssetsNameResolver = require('./assets/resolveLocation.js');

function getAllCharactersInfo() {
	let sessions = esiLogin.getAllCurrentSessions();
	return getCharacters(sessions);
}

function getCharacters(sessions) {
	if (!Array.isArray(sessions)) return Promise.reject('Sessions not Array');
	return new Promise((resolve, reject) => {
		const p = [];
		for (let i = 0; i < sessions.length; i++) {
			p.push(new Promise((resolve1, reject1) => {
				getCharacterBySession(sessions[i]).then(data => {
					// console.log('getCharacterBySession result:', data);
					fruityData(data, sessions[i]).then(fData => {
						// console.log('Fruity Data:', fData)
						resolve1(fData);
					}, e => {
						reject1(e);
					})
				}, e => {
					reject1(e);
				})
			}));
		}
		Promise.allSettled(p)
			.then(data => {
				resolve(data);
			}, e => {
				reject(e);
			})
	})
}

function getCharacterBySession(session) {
	return new Promise((resolve, reject) => {
		esiApi.apiCharacter('location', session, {})
			.then(data => {
				resolve({
					name: session.CharacterName,
					data: data.data,
				});
			}, e => {
				reject(e);
			})
	})
}

function fruityData(data, session) {
	return new Promise((resolve, reject) => {
		let temp = data.data;
		// console.log('Player Info: Trying to get', temp.solar_system_id, temp.structure_id || temp.station_id);
		let solar_system = moduleAssetsNameResolver.getLocationName(temp.solar_system_id, session);
		let structure = moduleAssetsNameResolver.getLocationName(temp.structure_id || temp.station_id, session);
		// console.log('Player Info: Got', solar_system, structure)
		temp.solar_system_name = solar_system.name;
		temp.structure_name = structure.name;
		data.data = temp;
		resolve(data);
	})
}

module.exports = {
	getAllCharacters: getAllCharactersInfo
}
