const esiLogin = require('../../api/esiLogin');
const moduleItemName = require('../item');

function getSkillsTest(name) {
	return new Promise((resolve, reject) => {
		let session = esiLogin.getSession(name);
		if (session === null) reject(esiLogin.NoSession);
		esiLogin.apiCharacterFetch('skills', session, 1)
			.then(data => {
				addName(data);
				resolve(data);
			})
			.catch(e => {
				console.log(e);
				reject(e);
			});
	});
}

function addName(skillsData) {
	for (let i = 0; i < skillsData.data.skills.length; i++) {
		let type_id = skillsData.data.skills[i].skill_id;
		let item = moduleItemName.getItem(type_id) || 'Item not found';
		skillsData.data.skills[i].name = item.typeName;
	}
}

exports.getSkillsTest = getSkillsTest;