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
    .where('id', '=', userId)
    .then( results => {
      usrObj = (results[0]);
      delete usrObj.password;
      // get user links
      return knex('links')
        .select('link_type as linkType', 'link_url as linkUrl')
        .where('id_user', '=', usrObj.id);
    })

    .then( results => {
      usrObj.links = results;
      // get user causes
      return knex('users_causes')
        .join('causes', 'users_causes.id_cause', '=', 'causes.id')
        .select('causes.id', 'causes.cause')
        .where('id_user', '=', usrObj.id);
    })

    .then( results => {
      results.length > 0 ?
        usrObj.causes = results.map( cause => cause.cause ) :
        usrObj.causes = [];
      // get user skills
      return knex('users_skills')
        .join('skills', 'users_skills.id_skill', '=', 'skills.id')
        .select('skills.id', 'skills.skill')
        .where('id_user', '=', usrObj.id);
    })

    .then( results => {
      results.length > 0 ?
        usrObj.skills = results.map( skill => skill.skill ) :
        usrObj.skills = [];
      return usrObj;
    })
    .catch( err => {
      return {err: 500, message: 'Internal server error'};
    });
};

epHelp.getExtUserInfo = function(usrId) {
  let resObj = {};
  let adminOfArr = [];
  let adminsArr = [];
  let followsArr = [];
  let oppsArr = [];
  let respArr = [];

  const knex = require('../db');

  // admin of
  return knex('roles')
    .join('users', 'roles.id_user_adding', '=', 'users.id')
    .where('capabilities', '=', 'admin')
    .andWhere('id_user_receiving', '=', usrId)
    .select(
      'roles.id as id',
      'id_user_adding as idUserAdding',
      'id_user_receiving as idUserReceiving',
      'users.first_name as firstName',
      'users.last_name as lastName',
      'users.logo',
      'users.location_city as locationCity',
      'users.location_state as locationState',
      'users.organization',
      'capabilities'
    )
    .then( adminOfs => {
      adminOfArr = adminOfs.slice();

      // admins
      return knex('roles')
        .join('users', 'roles.id_user_receiving', '=', 'users.id')
        .where('capabilities', '=', 'admin')
        .andWhere('id_user_adding', '=', usrId)
        .select(
          'roles.id as id',
          'id_user_adding as idUserAdding',
          'id_user_receiving as idUserReceiving',
          'users.first_name as firstName',
          'users.last_name as lastName',
          'users.logo as logo',
          'users.location_city as locationCity',
          'users.location_state as locationState',
          'users.organization',
          'capabilities',
        );
    })
    .then( admins => {
      adminsArr = admins.slice();

      // following
      return knex('roles')
        .join('users', 'roles.id_user_receiving', '=', 'users.id')
        .where('capabilities', '=', 'following')
        .andWhere('id_user_adding', '=', usrId)
        .select(
          'roles.id as id',
          'id_user_adding as idUserAdding',
          'id_user_receiving as idUserReceiving',
          'users.first_name as firstName',
          'users.last_name as lastName',
          'users.logo as logo',
          'users.location_city as locationCity',
          'users.location_state as locationState',
          'users.organization',
          'capabilities');
    })
    .then( follows => {
      followsArr = follows.slice();

      // opportunities
      return knex('opportunities')
        .where('id_user', '=', usrId)
        .select(
          'id',
          'opportunity_type as opportunityType',
          'offer',
          'title',
          'narrative',
          'timestamp_start as timestampStart',
          'timestamp_end as timestampEnd',
          'location_city as locationCity',
          'location_state as locationState',
          'location_country as locationCountry',
          'link')
        .orderBy('timestamp_start');
    })
    .then( opps => {
      oppsArr = [...opps];
      const causePromisesArray = opps.map((opp,index)=>{
        return knex('opportunities_causes')
          .join('causes', 'opportunities_causes.id_cause', '=', 'causes.id')
          .select('causes.cause')
          .where('opportunities_causes.id_opp', '=', opp.id)
          .orderBy('causes.cause')
          .then( causes => {
            oppsArr[index].causes = causes.map( cause => cause.cause);
          });
      });
      return Promise.all(causePromisesArray);
    })
    .then(()=>{
      // responses
      return knex('responses')
        .join('opportunities', 'responses.id_opp', '=', 'opportunities.id')
        .where('responses.id_user', '=', usrId)
        .select(
          'responses.id',
          'responses.id_user as userId',
          'responses.id_opp as idOpportunity',
          'notes',
          'response_status as responseStatus',
          'responses.timestamp_status_change as timestampStatusChange',
          'responses.timestamp_created as timestampCreated',
          'opportunities.narrative',
          'opportunities.title',
          'opportunities.offer',
          'opportunities.opportunity_type as opportunityType',
          'opportunities.link',
          'opportunities.location_city as locationCity',
          'opportunities.location_state as locationState',
          'opportunities.location_country as locationCountry',
          'opportunities.timestamp_start as timestampStart',
          'opportunities.timestamp_end as timestampEnd'
        )
        .orderBy('responses.timestamp_created');
    })
    .then( responses => {
      respArr = [...responses];
      const responsePromisesArray = responses.map((response,index)=>{
        return knex('opportunities')
          .join('users', 'opportunities.id_user', '=', 'users.id')
          .select(
            'users.organization',
            'users.user_type as userType',
            'users.first_name as firstName',
            'users.last_name as lastName',
            'users.logo',
          )
          .where('opportunities.id', '=', response.idOpportunity)
          .then( user => {
            respArr[index].organization = user[0].organization;
            respArr[index].firstName = user[0].firstName;
            respArr[index].lastName = user[0].lastName;
            respArr[index].userType = user[0].userType;
            respArr[index].logo = user[0].logo;
          });
      });
      return Promise.all(responsePromisesArray);
    })
    .then(()=>{
      resObj = Object.assign( {}, {
        adminOf: adminOfArr,
        admins: adminsArr,
        following: followsArr,
        opportunities: oppsArr,
        responses: respArr
      });
      return resObj;
    });
};

epHelp.buildOppList = function() {

  let causeArr = [];
  let resArr = [];
  const knex = require('../db');
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
          'opportunities.location_city',
          'opportunities.location_state',
          'opportunities.location_country',
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

  let retBaseObj = this.convertCase(inOppObj, 'ccToSnake');
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