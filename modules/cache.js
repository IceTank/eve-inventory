const fs = require('fs');
const chalk = require('chalk');

const CacheDir = __dirname + '/../cache/';
const CacheAutosave = 600000;

var CacheAutosaveIntervalHandle = setInterval(() => {
	Cache.saveCache();
}, CacheAutosave)

var caches = {};

class Cache {
	constructor(name, options) {
		if (Object.keys(caches).includes(name)) {
			throw 'Cachename allready in use';
		}
		var cacheData = {};
		cacheData.categorys = {};
		if (options && options.category && options.data) {
			cacheData.categorys[options.category] = {}
			cacheData.categorys[options.category]['data'] = options.data;
			cacheData.categorys[options.category]['birthDate'] = Date.now();
		}
		this.categorys = cacheData.categorys;
		this.name = name;
		caches[name] = this;
	}

	get_age(fild) {
		return Date.now() - this.categorys[fild].birthDate;
	}

	write_data(fild, data) {
		if (this.categorys[fild]) {
			this.categorys[fild] = data;
		} else {
			this.categorys[fild] = {};
			this.categorys[fild]['data'] = data;
			this.categorys[fild]['birthDate'] = Date.now();
		}
	}

	get_data(fild) {
		if (this.categorys[fild]) {
			return this.categorys[fild].data;
		} else {
			return null;
		}
	}

	get_filds() {
		return Object.keys(this.categorys);
	}

	static get_all_caches() {
		return Object.keys(caches);
	}

	static get_cache(name) {
		if (caches[name]) {
			return caches[name];
		} else {
			return "Cache not found";
		}
	}

	static saveCache() {
		console.log(chalk.yellow('Saving Cache'));
		for (var i in caches) {
			fs.writeFileSync(CacheDir + caches[i].name + ".json", JSON.stringify(caches[i]));
		}
		console.log(chalk.yellow('Cache Saving finished'));
		// console.log('Saved cache');
	}

	static readCache() {
		fs.readdir(CacheDir, (err, files) => {
			console.log(files);
			for (var i in files) {
				var data = JSON.parse(fs.readFileSync(CacheDir + files[i]));
				caches[data.name].categorys = data.categorys;
			}
			console.log('Read cache');
		});
	}
}

module.exports = Cache;
