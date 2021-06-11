const esiApi = require('../api/esiLogin')

function getBookmarks(name) {
  return new Prmomise((resolve, reject) => {
    var session = esiApi.getSession(name)
    if (session != null) {

    } else {
      reject(esiApi.NoSession)
    }
  })
}

function fetchBookmarks(session) {
  const url = `https://esi.evetech.net/latest/characters/${session.CharacterID}/assets/?datasource=tranquility&page=1&token=${session.access_token}`
  const options = {
    method: 'get',
    headers: {
      accept : "application/json"
    }
  }
}


exports.getBookmarks = getBookmarks
