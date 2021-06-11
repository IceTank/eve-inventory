const esiApi = require('../../api/esiLogin');
const moduleItemName = require('../item.js');
const moduleCache = require('../../modules/cache');
const moduleAssetsNameResolver = require('../../modules/assets/resolveLocation.js');
const moduleAssetsParseQuery = require('../../modules/assets/parseQueryString.js')

var Assets_Cache = new moduleCache('Assets_Cache');
var Station_id_Cache = new moduleCache('Location_Name_Cache');

// TODO: assets meta data geben damit bestimmt werden kann wie viele seiten verschickt wurden

function sortBy(data, options) {
  if (!data.assets) return data;
	if (data.assets.length == 0) return data;
  var assets = data.assets;
	var options = options || {
		sort: 'name',
		order: 'ascending'
	}
	options.sort = options.sort || 'name';
	options.order = options.order || 'ascending';

	var sortCategoryType = typeof assets[0][options.sort];

	if (options.order == 'descending') {
		sortDescending(sortCategoryType);
    data.assets = assets;
		return data;
	} else {
		sortAscending(sortCategoryType);
    data.assets = assets;
		return data;
	}

	function sortDescending(type) {
		if (type == 'number') {
			assets.sort(function(a, b) {
				return a[options.sort] - b[options.sort]
			})
		} else {
			assets.sort(function(a, b) {
				return ('' + b[options.sort]).localeCompare(a[options.sort])
			})
		}
	}

	function sortAscending(type) {
		if (type == 'number') {
			assets.sort(function(a, b) {
				return b[options.sort] - a[options.sort]
			})
		} else {
			assets.sort(function(a, b) {
				return ('' + a[options.sort]).localeCompare(b[options.sort])
			})
		}
	}
}

function enrichAssets(assets, session, options) {

	var item;
	var itemNotFound = {
		typeName: 'Item not found',
		description: '',
		basePrice: 0,
	}

	for (var i in assets) {
		item = moduleItemName.ItemTypesList[assets[i].type_id] || itemNotFound;

		assets[i] = {
			name: item.typeName,
			description: item.description,
			basePrice: item.basePrice,
			stationName: moduleAssetsNameResolver.getLocationName(assets[i].location_id, session),
			...assets[i]
		}
	}
  var data = {
    assets: assets,
    totalItems: assets.length,
    shownItems: assets.length
  };

	//Apply filter and sorting
	data = filterItems(data, options);
	data = sortBy(data, options);
	data = filterPage(data, options);
	return data;
}

function getAssetsRaw(session) {
	return new Promise((resolve, reject) => {
		//Funktion tryFetch um code übersichtlicher zu machen und damit er 2 mal aufgerufen werden kann
		function fetchA(page) {
			return new Promise((resolve2, reject2) => {
				esiApi.apiCharacterFetch('assets', session, page).then((data) => {
					resolve2(data)
				}, (error) => {
					if (error) {
						reject2(error)
					}
				})
			})
		}
		var page = 1
		var loop = true
		var totalPages
		var assetsData = []
		fetchA(page).then((data) => {
			assetsData = data.data
			if (data.head['x-pages']) {
				totalPages = Number(data.head['x-pages'])
				page++
				var arr = []
				for (i = 2; i < totalPages; i++) {
					arr.push(fetchA(i))
				}
				Promise.all(arr).then((values) => {
					for (v in values) {
						assetsData = assetsData.concat(values[v].data)
					}
					resolve(assetsData)
				}, (error) => {
					reject(error)
				})
			} else {
				resolve(assetsData)
			}
		}, (error) => {
			reject(error)
		})
	})
}

function getStationName(id, session) {
	var data = Station_id_Cache.get_data(id);
	if (data == null) {
		if (!stationIdLookup.includes(id)) {
			stationIdLookup.push(id);
			stationNameCrawler();
			return "";
		}
	} else {
		return data;
	}
}

function filterItems(data, options) {
	if (options && data.assets) {
    var assets = data.assets;

    const filter = options.filter || {};
		const hideNoneHanger = filter.hideNoneHanger || false;
		const hideNPCStation = filter.hideNPCStation || false;

		var name = null;
		if (options.searchItem) {
			name = options.searchItem.toLowerCase();
		}
		// var hideNoneShip = false;
		var filterAssets = [];

		for (i in assets) {
			if (hideNoneHanger) {
				switch (assets[i].location_flag) {
					case 'Hangar':
						break;
					case 'AssetSafety':
						break;
					case 'Deliveries':
						break;
					case 'Unlocked':
						break;
					default:
						continue;
				}
			}

			//Location id > 1000000000000 means they are citadels
			//Faction forts? dont know
			// if (hideNPCStation && assets[i].location_id < 1000000000000) continue;

      try {
  			if (name) {
  				if (assets[i]) {
  					if (!assets[i].name.toLowerCase().includes(name) && !assets[i].stationName.name.toLowerCase().includes(name) &&
            assets[i].location_id != name) {
  					  continue;
            }
  				}
  			}
      } catch(e) {
        console.log(assets[i]);
        console.log(e);
        break;
      }

      if (assets[i].item_id == 1031379116254) console.log(assets[i]);

			//if you came this far your in!
			filterAssets.push(assets[i]);
		}
    data['itemsHidden'] = data.assets.length - filterAssets.length;
    data['shownItems'] = filterAssets.length;
    data.assets = filterAssets;
		// console.log(filterAssets.length);
		return data;
	} else {
		return data;
	}
}

function filterPage(data, options) {
	if (options && data.assets) {
		var itemsPerPage = options.itemsPerPage || 100;
		var currentPage = options.page || 1;
    var numItems = data.assets.length;
		var start = (currentPage - 1) * itemsPerPage;
		data.assets = data.assets.slice(start, start + itemsPerPage);
    data['currentPage'] = currentPage;
    data['itemsPerPage'] = itemsPerPage;
    if (data.totalItems) {
      data['totalPages'] = Math.ceil(numItems / itemsPerPage);
    } else {
      data['totalPages'] = 1;
    }
    return data;
	} else {
		return data;
	}
}

exports.getAssetsByName = function(name, options) {
	return new Promise((resolve, reject) => {
		// TODO: Enable Cache

		// var data = cache.get_data(name);
		const data = null;
		if (data != null) {
			console.log('Reading assets from cache');
			var assetsData = enrichAssets(data, null);
      assetsData['dataAge'] = Assets_Cache.get_age(name);
			resolve(assetsData);
			return;
		} else {
			session = esiApi.getSession(name)
			//Check session result
			if (session != null) {
				getAssetsRaw(session)
					.then((rawData) => {
						// cache.write_data(name, data);
						var assetsData = enrichAssets(rawData, session, options);
            assetsData['dataAge'] = 0;
						resolve(assetsData);
					}, (error) => {
						console.log(error)
						reject(error)
					})
			} else {
				reject(esiApi.NoSession);
			}
		}
	})
}

exports.getLocationName = moduleAssetsNameResolver.getLocationName
exports.getAssetsRaw = getAssetsRaw
exports.parseQueryString = moduleAssetsParseQuery.parseQueryString
