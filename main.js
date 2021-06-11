const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');

const esiApi = require('./api/esiLogin');
const moduleAssets = require('./modules/assets/assets');
const moduleBookmark = require('./modules/bookmarks');
const moduleFittings = require('./modules/fittings');
const moduleItem = require('./modules/item');
const moduleCache = require('./modules/cache');
const moduleSkills = require('./modules/skills/skillMain');
const modulePlayerInfo = require('./modules/playerInfo');

moduleCache.readCache();

const PORT = 80;

//app.use(express.static('content'))
app.use(bodyParser.json())

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

rl.on('line', (line) => {
	var words = line.split(' ')
	var afterArg = line.slice(line.search(' ') > 0 ? line.search(' ') + 1 : 0);
	switch (words[0]) {
		case 'help':
			const availableCommands = ['sessions', 'clear (clears Sessions)', 'help', 'renewSession <Player_Name>', 'getItem', 'saveCache', 'cache', 'test1','test2'];
			console.log(chalk.cyan('Available Commands:'))
			for (c in availableCommands) {
				console.log(chalk.green(availableCommands[c]))
			}
			break;
		case 'sessions':
			esiApi.logAllSessions()
			break;
		case 'clear':
			esiApi.clearAllSesions();
			console.log('Cleared All Sessions');
			break;
		case 'renewSession':
			var session = esiApi.getSession(words[1].split('_').join(' '))
			if (session != null) {
				esiApi.renewSession(session)
			} else {
				console.log('Session not found');
			}
			break;
		case 'getItem':
			console.log(`Searching for: '${afterArg}'`);
			var result = moduleItem.searchName(afterArg) || moduleItem.getItem(afterArg);
			console.log(result == null ? 'Item not found...' : result);
			break;
    case 'saveCache':
      moduleCache.saveCache();
      break;
    case 'cache':
      if (words[1]) {
        console.log(moduleCache.get_cache([words[1]]));
      } else {
        console.log(moduleCache.get_all_caches());
      }
      break;
    case 'test':
      console.log(moduleAssets.stationIdLookup);
      break;
    case 'test1':
      moduleCache.readCache();
      break;
		case 'test2':
			moduleCache.saveCache();
			break;
		default:
			console.log('Type Help for list of commands');
	}
})

app.set('view engine', 'pug')
app.set('views', __dirname + '/views')
app.use(express.static(__dirname + '/content'));

app.get('/', function(req, res) {
	try {
		var currentSessions = esiApi.getAllCurrentSessions()
		console.log(esiApi.hasSessions());
		res.render('index', {
			title: 'There ' + (currentSessions.length == 0 ? ' are No Sessions' : currentSessions.length == 1 ? ' is 1 Session' : ` are ${currentSessions.length} Sessions`),
			hasSessions: esiApi.hasSessions(),
			Sessions: currentSessions
		})
	} catch (e) {
		console.log(e)
		res.status(404).send('Internal Server error')
	}
})

app.get('/skills', async function(req, res) {
	// res.send('Weee Skills');
	if (!req.query || !req.query.name)
		return res.status(404).send('Page not found');
	let session = esiApi.getSession(req.query.name);
	let data = await moduleSkills.getSkillsTest(req.query.name);
	console.log(data);
	if (session == null)
		return res.status(404).send('Session not found');
	// console.log(data.data.skills);
	res.render('skills/skillsPage', {
		session,
		characterName: session.CharacterName,
		data,
	});
	// res.send('Hi');
});

app.get('/images*', (req, res) => {
	// if (path[path.length - 1] == '/') path = path.substr(0, path.length - 1);
	req.end();
})

app.get('/session', (req, res) => {
	if (req.query && req.query.name) {
		session = esiApi.getSession(req.query.name)
		if (session == null) {
			res.status(404).send('Session not found')
		} else {
			res.render('sessionPage', {
				session: session,
				name: session.CharacterName
			})
		}
	} else {
		res.status(404).send('Page not found')
	}
})

app.get('/test', (req, res) => {
  if (req.query) {
    if (req.query.filter) {
      var foo = req.query.filter.split(';');
      var filter = {};
      for (i in foo) {
        var foo2 = foo[i].split(' ');
        filter[foo2[0]] = foo2[1] || null;
      }
      res.json(filter);
    } else {
      res.send('Bad query');
    }
  } else {
    res.send('Query error');
  }
})

app.get('/charactersInfo', (req, res) => {
	modulePlayerInfo.getAllCharacters()
		.then(data => {
			res.render('charactersInfo', {
				data: data
			})
		}, e => {
			console.log(e);
			res.send('Error');
		})
})

app.get('/character', (req, res) => {
	if (req.query && req.query.name) {
		res.render('characterPage', {
			name: req.query.name
		})
	}
})

app.get('/newAuth', (req, res) => {
	res.redirect(esiApi.eveLoginLink())
})

app.get('/oauth-callback', (req, res) => {
	if (req.query && req.query.code) {
		sessionPromise = esiApi.newEsiAuthSession(req.query.code)
		sessionPromise.then((session) => {
			esiApi.saveSession(session)
			return res.redirect(esiApi.eveLoginLink())
			res.render('characterPage', {
				name: session.CharacterName
			})
		}, (error) => {
			if (error) {
				res.sendStatus(404);
			}
		});
	} else {
		res.sendStatus(400).send('Bad request')
	}
})

app.get('/bookmarks', (req, res) => {
	res.send('Api endpoint shutdown by ccp')
})

app.get('/fit', (req, res) => {
	if (req.query) {
		if (req.query.name && req.query.fittingId) {
			moduleFittings.getFittingsByName(req.query.name).then((fittings) => {
				for (i in fittings) {
					if (fittings[i].fitting_id == req.query.fittingId) {
						// console.log(fittings[i]);
						res.render('fittings/fit', {
							characterName: req.query.name,
							fitting: fittings[i]
						});
					}
				}
			}, (e) => {
				console.log(e);
				res.send('Internal Struggles');
				return;
			})
		} else {
			res.send('Page not found');
		}
	} else {
		res.send('Page not found');
	}
})

app.get('/fittings', (req, res) => {
	if (req.query && req.query.name) {
		moduleFittings.getFittingsByName(req.query.name).then((fittings) => {
			// console.log(fittings[0]);
			res.render('fittings/characterFittings', {
				characterName: req.query.name,
				fittings: fittings
			})
		}, (error) => {
			if (error && error == esiApi.NoSession) {
				res.send(esiApi.errorNotLoggedIn())
			} else if (error) {
				console.log(error);
				res.send(error)
			}
		})
	} else {
		res.status(404).send('Invalid Query')
	}
})

app.get('/fittingsRaw', (req, res) => {
	if (req.query && req.query.name) {
		moduleFittings.getFittingsRaw(req.query.name).then((fittings) => {
			res.json(fittings)
		}, (error) => {
			if (error && error == esiApi.NoSession) {
				res.send(esiApi.errorNotLoggedIn())
			} else if (error) {
				console.log(error);
				res.send(error)
			}
		})
	} else {
		res.status(404).send('Invalid Query')
	}
})

app.get('/assets', (req, res, next) => {
	//Check Query parameters
	if (req.query && req.query.name) {
		var options = moduleAssets.parseQueryString(req.query);
    res.render('assets/assetsPage', {
      // dataAge: data.dataAge,
      characterName: req.query.name,
      sortOptions: options
    });
	} else {
		res.status(404).send('Invalid Query')
	}
})

app.get('/assetsTable', (req, res) => {
  if (req.query && req.query.name) {
		var options = moduleAssets.parseQueryString(req.query);
		moduleAssets.getAssetsByName(req.query.name, options).then((assetsData) => {
			res.render('assets/assetsTable', {
        data: assetsData
      });
			// res.json(assets)
		}, (error) => {
			if (error && error == esiApi.NoSession) {
				console.log('No Session');
				res.send(esiApi.errorNotLoggedIn())
			} else if (error) {
				console.log(error)
				res.send('Error Code: ' + error)
			}
		})
	} else {
		res.status(404).send('Invalid Query')
	}
})

app.get('/assetsRaw', (req, res) => {
	if (!esiApi.hasSessions()) {
		res.send(esiApi.errorNotLoggedIn())
	} else {
		//Check Query parameters
		if (req.query && req.query.name) {
			var session = esiApi.getSession(req.query.name)
			moduleAssets.getAssetsRaw(session).then((assets) => {
				res.json(assets)
				// res.json(assets)
			}, (error) => {
				if (error) {
					res.status(404).send('Error: ' + error)
				}
			})
		} else {
			res.status(404).send('Invalid Query')
		}
	}
})

app.get('/itemGroup', (req, res) => {
	if (!req.query || !req.query.group_id) return res.status(404).send('No group');
	moduleItem.getItemGroup(req.query.group_id)
		.then(data => {
			console.log(data)
			res.render('item/groupInfo', {
				data,
			})
		}, e => {
			console.log(e);
			res.send('Item group not found');
		})
})

app.get('/item', (req, res) => {
	if (req.query) {
		if (req.query.type_id) {
			var item = moduleItem.getItem(req.query.type_id) || 'Item not found'
			res.render('item/itemInfo', {
				item: item
			});
		} else {
			res.status(404).send('Item Not found')
		}
	}
})

app.listen(PORT, () => {
	console.log(`Listening on Port: ${PORT}!`)
})
