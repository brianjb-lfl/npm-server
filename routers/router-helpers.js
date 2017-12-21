'use strict';

let epHelp = {};

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
      usrObj.causes = results;
      // get user skills
      return knex('users_skills')
        .join('skills', 'users_skills.id_skill', '=', 'skills.id')
        .select('skills.id', 'skills.skill')
        .where({id_user: usrObj.id});
    })

    .then( results => {
      usrObj.skills = results;
      return usrObj;
    })

    .catch( err => {
      return {err: 500, message: 'Internal server error'};
    });
};

epHelp.getOppBase = function(inOppId) {
  const knex = require('../db');
  const calcUserField = 
    "case when users.organization isnull then "
      + "users.last_name || ', '  || users.first_name "
      + "else users.organization "
      + "end as userString";
  return knex('opportunities')
    .join('users', 'opportunities.id_user', '=', 'users.id')
    .select(
      'opportunities.id',
      'users.id',
      'opportunity_type as opportunityType',
      'users.username',
      'opportunities.id_user as idUser',
      'offer',
      'title',
      'narrative',
      'timestamp_start as timestampStart',
      'timestamp_end as timestampEnd',
      'opportunities.location_city as locationCity',
      'opportunities.location_state as locationState',
      'opportunities.location_country as locationCountry',
      'link',
      knex.raw(calcUserField)
    )
    .where()
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

epHelp.convertCase = function(caseObj, mode) {

  let convTbl = {};

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
  })

  return caseObj

}

module.exports = { epHelp };