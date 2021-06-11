const fetch = require('node-fetch');

const esiLogin = require('./esiLogin');

const optionJSONGet = {
	method: 'get',
	headers: {
		accept: "application/json"
	}
}

const ResponseTokenNotValid = 100;
const ResponseForbidden = 100;
const ApiVersion = 'latest'
const BaseApiUrl = `https://esi.evetech.net/${ApiVersion}/`;

function apiGet(url, options) {
	fetch(url, options)
		.then(res => {
			res.json()
		})
}

function publicApiFetch(urlPath, options) {
	return new Promise((resolve, reject) => {
		// /v1/universe/groups/{group_id}/
		if (!options) throw Error('No Options');
		let query = {};
		query.dataSource = options.dataSource || 'tranquility';
		query.page = options.page || null;
		query.language = options.language || null;
		let queryString = `?datasource=${query.dataSource}${query.page ? '&page=' + query.page : ''}`
			+ `${query.language ? '&language=' + query.language : ''}`;
		if (urlPath.startsWith('/')) urlPath = urlPath.slice(1, urlPath.length);
		const url = BaseApiUrl + urlPath + queryString;
		fetch(url, optionJSONGet)
			.then((res) => {
					if (res.ok) return resolveResponse(res, resolve, reject)
					if (res.status === 403) return reject(ResponseTokenNotValid)
					reject(apiEndpoint + ' Lookup Failed Respons Code ' + res.status + ' ' + url)
				}
			)
			.catch((e) => {
				console.log(e)
				reject('Error fetching')
			})
	})
}

function resolveResponse(res, callbackResolve, callbackReject) {
	function constructHeader() {
		let head = {}
		for(const header of res.headers){
			head[header[0]] = header[1]
		}
		return head;
	}
	res.json().then((data) => {
		let head = constructHeader();
		if (Object.keys(head).length === 0) head = null;
		callbackResolve({
			head: head,
			data: data
		})
	})
	.catch(e => {
		callbackReject(e)
	})
}

function universeApiFetch(apiEndpoint, session, options) {
	let page = options.page || null;
	let id = options.id;
	function foo(session, id) {
		return new Promise((fooResolve, fooReject) => {
			const url = `${BaseApiUrl}universe/${apiEndpoint}/${id}/?datasource=tranquility${page ? 
				`&page=${page}`:''}&token=${session.access_token}`
			fetch(url, optionJSONGet)
				.then((res) => {
						if (res.ok) return resolveResponse(res, fooResolve, fooReject)
						if (res.status === 403) return fooReject(ResponseTokenNotValid)
						fooReject(apiEndpoint + ' Lookup Failed Response Code ' + res.status + ' ' + url)
					})
				.catch((e) => {
					console.log(e)
					fooReject('Error fetching')
				})
		})
	}
	return new Promise((resolve, reject) => {
		// Try fetching it the first time but it might fail if the accessToken is to old
		foo(session, id).then((data) => {
			resolve(data)
		}, async (error) => {
			if (error === ResponseTokenNotValid) {
				// Send a second request after renewing the session
				let newSession = await esiLogin.renewSession(session);
				esiLogin.replaceSession(newSession);
				foo(newSession, id).then((data) => {
					resolve(data)
				}, (err) => {
					if (err) reject(err)
				})
			} else if (error) {
				console.log(error)
				reject(error)
			}
		})
	})
}

function characterApiFetch(apiEndpoint, session, options) {
	let page = options.page || null;
	// Resolve data to JSON and Place Header information in the response
	function foo(session) {
		return new Promise((fooResolve, fooReject) => {
			const url = `${BaseApiUrl}characters/${session.CharacterID}/${apiEndpoint}/?datasource=tranquility${page ? 
				`&page=${page}`:''}&token=${session.access_token}`
			const options = optionJSONGet;
			options.page = page;
			fetch(url, options)
				.then((res) => {
						if (res.ok) return resolveResponse(res, fooResolve, fooReject)
						if (res.status === 403) return fooReject(ResponseTokenNotValid)
						console.log("Response:", res)
						fooReject(apiEndpoint + ' Lookup Failed Respons Code ' + res.status
							+ ' ' + url)
					}
					// , (error) => {
					// 	if (error) {
					// 		console.log(error)
					// 		reject2(error)
					// 	}
					// }
				)
				.catch((e) => {
					console.log(e)
					fooReject('Error fetching')
				})
		})
	}
	return new Promise((resolve, reject) => {
		// Try fetching it the first time but it might fail if the accessToken is to old
		foo(session).then((data) => {
			resolve(data)
		}, async (error) => {
			if (error === ResponseTokenNotValid) {
				// Send a second request after renewing the session
				let newSession = await esiLogin.renewSession(session);
				esiLogin.replaceSession(newSession);
				foo(newSession).then((data) => {
					resolve(data)
				}, (err) => {
					if (err) reject(err)
				})
			} else if (error) {
				console.log(error)
				reject(error)
			}
		})
	})
}

module.exports = {
	apiGet: apiGet,
	apiPublic: publicApiFetch,
	apiCharacter: characterApiFetch,
	apiUniverse: universeApiFetch,
	ResponseTokenNotValid,
	ResponseForbidden,
}