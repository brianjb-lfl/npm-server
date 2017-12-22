'use strict';

let epHelp = {};

epHelp.buildUsersFull = function() {
  let usrsArr = [];
  let uCauses = [];
  let uLinks = [];
  let uSkills = [];
  const knex = require('../db');

  // get user causes
  return knex('users_causes')
    .join('causes', 'users_causes.id_cause', '=', 'causes.id')
    .select('users_causes.id_user', 'causes.id', 'causes.cause')
    .orderBy('users_causes.id_user')
    .then(results => {
      uCauses = results.slice();
    })
    .then( () => {
      // get user links
      return knex('links')
        .select('id_user', 'id', 'link_type as linkType', 'link_url as linkUrl')
        .orderBy('id_user');
    })
    .then( results => {
      uLinks = results.slice();
    })
    .then( () => {
      // get user skills
      return knex('users_skills')
        .join('skills', 'users_skills.id_skill', '=', 'skills.id')
        .select('users_skills.id_user', 'skills.id', 'skills.skill')
        .orderBy('users_skills.id_user');
    })
    .then( results => {
      uSkills = results.slice();
    })
    .then( () => {
      // get users
      return knex('users')
        .select()
        .orderBy('id');
    })
    .then( results => {
      results.forEach( usr => {
        let tempUsrCauses = uCauses
          .filter( cause => cause.id_user === usr.id)
          .map( cause => cause.cause);
        let tempUsrLinks = uLinks
          .filter( link => link.id_user === usr.id)
          .map( link => Object.assign( {}, {
            id: link.id,
            linkType: link.linkType,
            linkUrl: link.linkUrl
          }));
        let tempUsrSkills = uSkills
          .filter( skill => skill.id_user === usr.id)
          .map( skill => skill.skill);
        let tempUsr = Object.assign( {}, this.convertCase(usr, 'snakeToCC'), {
          causes: tempUsrCauses.slice(),
          links: tempUsrLinks.slice(),
          skills: tempUsrSkills.slice()
        });
        delete tempUsr['password'];
        usrsArr.push(tempUsr);
      });
      return usrsArr;
    });
};

epHelp.buildUser = function (userId) {

  let usrObj = {};
  const knex = require('../db');
  
  // get user base info
  return knex('users')
    .select()
    .where({id: userId})
    .then( results => {
      usrObj = (results[0]);
      delete usrObj['password'];
      // get user links
      return knex('links')
        .select('id', 'link_type as linkType', 'link_url as linkUrl')
        .where({id_user: usrObj.id});
    })

    .then( results => {
      usrObj.links = results;
      // get user causes
      return knex('users_causes')
        .join('causes', 'users_causes.id_cause', '=', 'causes.id')
        .select('causes.id', 'causes.cause')
        .where({id_user: usrObj.id});
    })

    .then( results => {
      usrObj.causes = results.map( cause => cause.cause );
      // get user skills
      return knex('users_skills')
        .join('skills', 'users_skills.id_skill', '=', 'skills.id')
        .select('skills.id', 'skills.skill')
        .where({id_user: usrObj.id});
    })

    .then( results => {
      usrObj.skills = results.map( skill => skill.skill );
      return usrObj;
    })

    .catch( err => {
      return {err: 500, message: 'Internal server error'};
    });
};



epHelp.getExtUserInfo = function(userId) {
  let resObj = {};
  let adminOfArr = [];
  let adminsArr = [];
  let followsArr = [];

  const knex = require('../db');

  // admin of
  return knex('roles')
    .join('users', 'roles.id_user_adding', '=', 'users.id')
    .where('capabilities', '=', 'admin')
    .andWhere('id_user_receiving', '=', userId)
    .select('users.id', 'users.organization')
    .then( adminOfs => {
      adminOfArr = adminOfs.slice();

      // admins
      return knex('roles')
        .join('users', 'roles.id_user_receiving', '=', 'users.id')
        .where('capabilities', '=', 'admin')
        .andWhere('id_user_adding', '=', userId)
        .select(
          'users.id',
          'users.first_name as firstName',
          'users.last_name as lastName');
    })
    .then( admins => {
      adminsArr = admins.slice();

      // following
      return knex('roles')
        .join('users', 'roles.id_user_receiving', '=', 'users.id')
        .where('capabilities', '=', 'following')
        .andWhere('id_user_adding', '=', userId)
        .select(
          'users.id',
          'users.organization');
    })
    .then( follows => {
      followsArr = follows.slice();
      return followsArr;

    });




};



epHelp.buildOppList = function() {

  let causeArr = [];
  let resArr = [];
  const knex = require('../db');
  //const calcUserField = 
  // "case when users.organization isnull then "
  //   + "users.last_name || ', '  || users.first_name "
  //   + "else users.organization "
  //   + "end as user_string";
  return knex('opportunities_causes')
    .join('causes', 'opportunities_causes.id_cause', '=', 'causes.id')
    .select('causes.id', 'opportunities_causes.id_opp', 'causes.cause')
    .orderBy('causes.cause')
    .then( results => causeArr = results.slice())
    .then( () => {
      return knex('opportunities')
        .join('users', 'opportunities.id_user', '=', 'users.id')
        .select(
          'opportunities.id',
          'id_user',
          'users.organization',
          'opportunity_type',
          'offer',
          'title',
          'narrative',
          'timestamp_start',
          'timestamp_end',
          'users.location_city',
          'users.location_state',
          'users.location_country',
          'link'
        )
        .orderBy('timestamp_start')
        .debug(false)
        .then( results => {
          results.forEach ( opp => {
            const tempCauses = causeArr
              .filter( cause => cause.id_opp === opp.id)
              .map( cause => cause.cause);
            let tempOpp = epHelp.convertCase(opp, 'snakeToCC');
            tempOpp = Object.assign( {}, tempOpp, {
              causes: tempCauses
            });
            resArr.push(tempOpp);
          });
          return resArr;
        });
    });

};

epHelp.buildOpp = function(inOppId) {

  let causeArr = [];
  let oppObj = {};
  let resObj = {};
  let oppOrg;
  const knex = require('../db');

  return knex('opportunities_causes')
    .join('causes', 'opportunities_causes.id_cause', '=', 'causes.id')
    .select('causes.cause')
    .where('opportunities_causes.id_opp', '=', inOppId)
    .orderBy('causes.cause')
    .then( results => {
      causeArr = results.map( cause => cause.cause);
      return knex('opportunities')
        .join('users', 'opportunities.id_user', '=', 'users.id')
        .select(
          'opportunities.id',
          'id_user',
          'users.organization',
          'opportunity_type',
          'offer',
          'title',
          'narrative',
          'timestamp_start',
          'timestamp_end',
          'users.location_city',
          'users.location_state',
          'users.location_country',
          'link'
        )
        .where('opportunities.id', '=', inOppId)
        .debug(false);
    })
    .then( result => {
      oppObj = epHelp.convertCase(result[0], 'snakeToCC');
      return this.getOrg(oppObj.userId);
    })
    .then( result => {
      resObj = Object.assign( {}, oppObj, {
        organization: result,
        causes: causeArr
      });
      return resObj;
    });
};

epHelp.buildResponse = function(inRespId) {
  
  let resObj = {};

  const knex = require('../db');
  return knex('responses')
    .join('users', 'responses.id_user', '=', 'users.id')
    .where('responses.id', '=', inRespId)
    .select(
      'responses.id',
      'id_opp',
      'id_user',
      'notes',
      'response_status',
      'timestamp_status_change',
      'responses.timestamp_created',
      'users.organization',
      'users.first_name',
      'users.last_name'
    )
    .then( result => {
      resObj = this.convertCase(result[0], 'snakeToCC');
      return this.getTitle(resObj.idOpportunity)
        .then( title => {
          resObj = Object.assign( {}, resObj, {
            title: title
          });
          return resObj;
        });
    });
};

epHelp.getOrg = function(inUsrId) {
  const knex = require('../db');
  return knex('users')
    .select('organization')
    .where('id', '=', inUsrId)
    .then( result => {
      return (result[0].organization);
    });
};

epHelp.getTitle = function(inOppId) {
  const knex = require('../db');
  return knex('opportunities')
    .select('title')
    .where('id', '=', inOppId)
    .then( result => {
      return (result[0].title);
    });
};

epHelp.buildOppBase = function(inOppObj) {

  // camelCase to snake_case conversion
  let retBaseObj = Object.assign( {}, inOppObj, {
    opportunity_type: inOppObj.opportunityType ? inOppObj.opportunityType : null,
    id_user: inOppObj.userId,
    location_city: inOppObj.locationCity ? inOppObj.locationCity : null,
    location_state: inOppObj.locationState ? inOppObj.locationState : null,
    location_country: inOppObj.locationCountry ? inOppObj.locationCountry : null,
    timestamp_start: inOppObj.timestampStart ? inOppObj.timestampStart : null,
    timestamp_end: inOppObj.timestampEnd ? inOppObj.timestampEnd : null,
  });

  delete retBaseObj.opportunityType;
  delete retBaseObj.userId;
  delete retBaseObj.locationCity;
  delete retBaseObj.locationState;
  delete retBaseObj.locationCountry;
  delete retBaseObj.timestampStart;
  delete retBaseObj.timestampEnd;
  delete retBaseObj.causes;

  return retBaseObj;
};

epHelp.buildOppCausesArr = function(oppId, inCausesArr) {

  let retArr = [];
  const knex = require('../db');
  
  return knex('causes')
    .select('id', 'cause')

    .then( allCauses => {
      inCausesArr.forEach( oppCause => {
        let tempCItem = allCauses.filter( item => item.cause === oppCause )[0];
        if (typeof tempCItem === 'object') {
          retArr.push(
            Object.assign( {}, {
              id_opp: oppId,
              id_cause: tempCItem.id
            })
          );
        }
      });
      return retArr;
    })

    .catch( err => {
      return {err: 500, message: 'Internal server error'};
    });
};

const snakeToCC = {
  user_type: 'userType',
  location_city: 'locationCity',
  location_state: 'locationState',
  location_country: 'locationCountry',
  first_name: 'firstName',
  last_name: 'lastName',
  opportunity_type: 'opportunityType',
  id_user: 'userId',
  id_cause: 'idCause',
  id_opp: 'idOpportunity',
  id_skill: 'idSkill',
  id_user_adding: 'idUserAdding',
  id_user_receiving: 'idUserReceiving',
  link_type: 'linkType',
  link_url: 'linkUrl',
  response_status: 'responseStatus',
  timestamp_created: 'timestampCreated',
  timestamp_start: 'timestampStart',
  timestamp_end: 'timestampEnd',
  timestamp_status_change: 'timestampStatusChange'
};

const ccToSnake = {
  userType: 'user_type',
  locationCity: 'location_city',
  locationState: 'location_state',
  locationCountry: 'location_country',
  firstName: 'first_name',
  lastName: 'last_name',
  opportunityType: 'opportunity_type',
  userId: 'id_user',
  idCause: 'id_cause',
  idOpp: 'id_opp',
  idOpportunity: 'id_opp',
  idSkill: 'id_skill',
  idUserAdding: 'id_user_adding',
  idUserReceiving: 'id_user_receiving',
  linkType: 'link_type',
  linkUrl: 'link_url',
  responseStatus: 'response_status',
  timestampCreated: 'timestamp_created',
  timestampStart: 'timestamp_start',
  timestampEnd: 'timestamp_end',
  timestampStatusChange: 'timestamp_status_change'
};

epHelp.convertCase = function(caseObj, mode) {

  let convTbl = {};

  if(mode === 'ccToSnake') {
    convTbl = ccToSnake;
  }
  else {
    convTbl = snakeToCC;
  }

  Object.keys(caseObj).forEach ( key => {
    if(convTbl[key]) {
      caseObj = Object.assign( {}, caseObj, {
        [convTbl[key]]: caseObj[key]
      });
      delete caseObj[key];
    }
  });

  return caseObj;

};

module.exports = { epHelp };