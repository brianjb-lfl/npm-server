'use strict';

const express = require('express');
const adminRouter = express.Router();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

process.stdout.write('\x1Bc');

// comm test
adminRouter.get('/testify/', (req, res) => {
  res.status(200).json({message: 'Good to go'});
});

// GET api/admin/initialize
adminRouter.get('/initialize', (req, res) => {
  let resObj = {};
  let causeArr = [];
  let skillArr = [];
  let userArr = [];
  let userCauseArr = [];
  let userLinkArr = [];

  const knex = require('../db');
  return knex
    .select('cause')
    .from ('causes')
    .orderBy('cause')
    .debug(false)
    .then( results => {
      causeArr = results.map( item => item.cause );
      return knex
        .select('skill')
        .from('skills')
        .orderBy('skill')
        .debug(false);
    })
    .then( results => {
      skillArr = results.map( item => item.skill);
      return knex('users')
        .select(
          'id',
          'username', 
          'organization',
          'location_city as locationCity', 
          'location_state as locationState',
          'location_country as locationCountry', 
          'bio',
          'logo',
          'user_type as userType')
        .where({user_type: 'organization'})
        .orderBy('organization')
        .orderBy('last_name')
        .orderBy('first_name')
        .debug(false);
    })
    .then( results => {
      userArr = results;
      return knex('users_causes')
        .join('causes', 'users_causes.id_cause', '=', 'causes.id')
        .select(
          'id_user',
          'causes.id',
          'causes.cause')
        .orderBy('causes.cause')
        .debug(false);
    })
    .then( results => {
      userCauseArr = results;
      return knex('links')
        .select(
          'id_user',
          'id',
          'link_type as linkType',
          'link_url as linkUrl')
        .orderBy('link_type')
        .debug(false);
    })
    .then( results => {
      userLinkArr = results;
      resObj.users = [];
      userArr.forEach( usr => {
        const tempLinks = userLinkArr
          .filter( item => item.id_user === usr.id );
        const tempCauses = userCauseArr
          .filter( item => item.id_user === usr.id);
        usr = Object.assign( {}, usr, {
          links: tempLinks.map( item => 
            Object.assign( {}, {linkType: item.linkType, linkUrl: item.linkUrl} )),
          causes: tempCauses.map( item => item.cause )
        });
        resObj.users.push(usr);
      });
      resObj = Object.assign( {}, resObj, {
        causes: causeArr,
        skills: skillArr,
      });
      res.json(resObj);
    })
    .catch( err => {
      res.status(500).json({message: 'Internal server error'});
    });    
});


module.exports = { adminRouter };