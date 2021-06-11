const fs = require('fs');
const esiApi = require('../api/esiApi');

const ItemTypesPath = './invTypes.json'
let ItemTypesList = {}

try {
	ItemTypesList = JSON.parse(fs.readFileSync(ItemTypesPath))
	console.log(`Loaded ${Object.keys(ItemTypesList).length} Items`)
} catch (e) {
	console.log(e)
}

exports.searchName = function(name) {
	try {
		var nameLower = name.toLowerCase();
		var foundItems = [];
		for (var i in ItemTypesList) {
			if (ItemTypesList[i].typeName.toLowerCase().search(nameLower) !== -1) foundItems.push(ItemTypesList[i]);
		}
		if (foundItems.length > 10) {
			var foundItemsNames = [];
			for (var i in foundItems) {
				foundItemsNames.push(foundItems[i].typeName);
			}
			return foundItemsNames;

			var foundItemsNames = "";
			for (var i in foundItems) {
				foundItemsNames = foundItemsNames + '\n' + foundItems[i].typeName;
			}
			return foundItemsNames;
		}
		return foundItems.length > 0 ? foundItems : null;
	} catch (e) {
		console.log(e);
		return null;
	}
}

function getItem(id) {
	try {
		return ItemTypesList[id]
	} catch (e) {
		return null;
	}
}

function idListToNames(idList) {
	let names = {};
	for (let i = 0; i < idList.length; i++) {
		names[idList[i]] = getItem(idList[i]);
	}
	return names;
}

function getItemGroup(groupId) {
	return new Promise((resolve, reject) => {
		const url = `universe/groups/${groupId}`;
		esiApi.apiPublic(url, {
			language: 'en-us',
		})
			.then(data => {
				let names = idListToNames(data.data.types);
				let newData = {
					...data.data,
					names
				}
				resolve(newData)
			})
			.catch(e => reject(e));
	})
}

exports.getItemGroup = getItemGroup
exports.getItem = getItem
exports.ItemTypesList = ItemTypesList
