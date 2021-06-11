const esiApi = require('../api/esiLogin')
const moduleItemName = require('./item.js')


function getFittingsRaw(name) {
  return new Promise((resolve, reject) => {
    var session = esiApi.getSession(name)
    if (session == null) {
      reject(esiApi.NoSession)
    } else {
      esiApi.apiCharacterFetch('fittings', session, 1)
      .then((data) => {
        resolve(data.data)
      }, (error) => {
        reject(error)
      }).catch((e) => {
        console.log(e)
        reject(e)
      })
    }
  })
}

function getFittingsByName(name) {
  return new Promise((resolve, reject) => {
    getFittingsRaw(name).then((fittings) => {
      for (i in fittings) {
        var shipName
        for (k in fittings[i].items) {
          var itemName
          try {
            itemName = moduleItemName.ItemTypesList[fittings[i].items[k].type_id].typeName
          } catch (e) {
            console.log(e)
            break
            itemName = 'Name not Found'
          }
          fittings[i].items[k]['itemName'] = itemName
        }
        try {
          shipName = moduleItemName.ItemTypesList[fittings[i].ship_type_id].typeName
        } catch (e) {
          shipName = 'Ship not Found'
        }
        fittings[i]['shipName'] = shipName
      }
      resolve(fittings)
    }, (error) => {
      reject(error)
    })
  })
}


exports.getFittingsByName = getFittingsByName
exports.getFittingsRaw = getFittingsRaw
