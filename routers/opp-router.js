'use strict';

const express = require('express');
const passport = require('passport');
const { jwtStrategy } = require('../auth/jwt-strategy');
const oppRouter = express.Router();
const { epHelp } = require('./router-helpers');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

process.stdout.write('\x1Bc');

passport.use(jwtStrategy);
const jwtAuth = passport.authenticate('jwt', { session: false });

// comm test
oppRouter.get('/testify/', (req, res) => {
  res.status(200).json({message: 'Good to go'});
});

// secured comm test
oppRouter.get('/testify/secure', jwtAuth, (req, res) => {
  res.status(200).json({message: 'Good to go - *SECURED*'});
});

//GET api/opportunities/list
oppRouter.get('/list', (req, res) => {
  const knex = require('../db');
  const calcUserField = 
    "case when users.organization isnull then "
      + "users.last_name || ', '  || users.first_name "
      + "else users.organization "
      + "end as user_string";
  return knex('opportunities')
    .join('users', 'opportunities.id_user', '=', 'users.id')
    .select(
      'opportunities.id',
      'users.id',
      'opportunity_type as opportunityType',
      'users.username',
      'opportunities.id_user',
      'offer',
      'title',
      'narrative',
      'timestamp_start',
      'timestamp_end',
      'opportunities.location_city',
      'opportunities.location_state',
      'opportunities.location_country',
      'id_user',
      'link',
      knex.raw(calcUserField)
    )
    .orderBy('user_string')
    .orderBy('timestamp_start')
    .debug(false)
    .then( results => {
      res.json(results);
    })
    .catch( err => {
      res.status(500).json({message: 'Internal server error'});
    });    
});

// POST api/opportunities
oppRouter.post('/', jsonParser, (req, res) => {
  let inOppObj = req.body;
  let retObj = {};
  let inCausesArr = Array.isArray(inOppObj.causes) ? inOppObj.causes.slice() : [] ;
  // check for missing fields
  const reqFields = ['title', 'narrative', 'userId', 'causes'];
  const missingField = reqFields.find( field => !(field in inOppObj));
  if(missingField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Missing field',
      location: missingField
    });
  }
  // post base opportunity info - get id'
  const postOppObj = epHelp.buildOppBase(inOppObj);
  const knex = require('../db');

  return knex('opportunities')
    .insert(postOppObj)
    .returning(['id', 
      'user_id as userId',
      'organization',
      'opportunity_type as opportunityType',
      'offer',
      'title',
      'narrative',
      'timestamp_start as timestampStart',
      'timestamp_end as timestampEnd',
      'location_city as locationCity',
      'location_state as locationState',
      'location_country as locationCountry',
      'link'
    ])

    .then( results => {
      // save return info for client response
      retObj = Object.assign( {}, results[0]);
      if(inCausesArr.length > 0) {
        return epHelp.buildOppCausesArr(retObj.id, inCausesArr)
          .then( postCausesArr => {
            return knex('opportunities_causes')
              .insert(postCausesArr);
          });
      }
      else {
        // no causes in req, skip to response
        return;
      }
    })

    .then( () => {
      res.status(201).json(retObj);
    })

    .catch( err => {
      if(err.reason === 'ValidationError') {
        return res.status(err.code).json(err);
      }
      res.status(500).json({message: 'Internal server error'});
    });
});


// PUT api/opportunities/:id
oppRouter.put('/:id', jsonParser, (req, res) => {
  let inOppObj = req.body;
  let oppId = req.params.id;
  let retObj = {};
  let inCausesArr = inOppObj.causes.slice();

  // check for missing fields
  const reqFields = ['title', 'narrative', 'userId', 'causes'];
  const missingField = reqFields.find( field => !(field in inOppObj));
  if(missingField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Missing field',
      location: missingField
    });
  }

  // update base opportunity info'
  const postOppObj = epHelp.buildOppBase(inOppObj);
  const knex = require('../db');

  return knex('opportunities')
    .where('id', '=', oppId)
    .update(postOppObj)
    .returning(['id', 'opportunity_type as opportunityType', 'narrative'])

    .then( results => {
      // save return info for client response
      retObj = Object.assign( {}, results[0]);
      return knex('opportunities_causes')
        .where('id_opp', '=', oppId)
        .del()
        .then( () => {
          if(inCausesArr.length > 0) {
            return epHelp.buildOppCausesArr(retObj.id, inCausesArr)
              .then( postCausesArr => {
                return knex('opportunities_causes')
                  .insert(postCausesArr);
              });
          }
          else {
            // no causes in req, skip to response
            return;
          }
        })

        .then( () => {
          res.status(201).json(retObj);
        })

        .catch( err => {
          if(err.reason === 'ValidationError') {
            return res.status(err.code).json(err);
          }
          res.status(500).json({message: 'Internal server error'});
        });
    });
});


module.exports = { oppRouter };
