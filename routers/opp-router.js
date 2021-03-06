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
oppRouter.get('/testify/secure', (req, res) => {
  res.status(200).json({message: 'Good to go - *SECURED*'});
});

//GET api/opportunities/list
oppRouter.get('/list', (req, res) => {

  // check for query parameters
  let qObj = {};
  if(Object.keys(req.query).length > 0) {
    qObj = req.query;
  }

  return epHelp.buildOppList(qObj)
    .then( results => {
      res.json(results);
    })
    .catch( err => {
      res.status(500).json({message: `Internal server error: ${err}`});
    });

});

//GET api/opportunities/:id
oppRouter.get('/:id', (req, res) => {
  
  return epHelp.buildOpp(req.params.id)
    .then( results => {
      res.json(results);
    })
    .catch( err => {
      res.status(500).json({message: `Internal server error: ${err}`});
    });
});

// POST api/opportunities
oppRouter.post('/', jsonParser, (req, res) => {
  let oppId;
  let inOppObj = req.body;
  let retObj = {};
  let inCausesArr = (inOppObj.causes.length > 0) ? inOppObj.causes.slice() : [] ;
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
    .returning(['id'])
    .then( result => {
      oppId = result[0].id;
      if(inCausesArr.length > 0) {
        return epHelp.buildOppCausesArr(oppId, inCausesArr)
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
      return epHelp.buildOpp(oppId)
        .then( result => {
          retObj = Object.assign( {}, result);
          res.status(201).json(retObj);      
        })
        .catch( err => {
          if(err.reason === 'ValidationError') {
            return res.status(err.code).json(err);
          }
          res.status(500).json({message: `Internal server error: ${err}`});
        });
    });
});


// PUT api/opportunities/:id
oppRouter.put('/:id', jsonParser, (req, res) => {
  let inOppObj = req.body;
  if(inOppObj.id) { delete inOppObj.id; } 
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
    .returning(['id', 'opportunity_type as opportunityType', 'narrative', 'location_city', 'location_state'])

    .then( results => {
      return knex('opportunities_causes')
        .where('id_opp', '=', oppId)
        .del()
        .then( () => {
          if(inCausesArr.length > 0) {
            return epHelp.buildOppCausesArr(oppId, inCausesArr)
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
          return epHelp.buildOpp(oppId)
            .then( result => {
              retObj = Object.assign( {}, result);
              res.status(201).json(retObj);      
            })
            .catch( err => {
              if(err.reason === 'ValidationError') {
                return res.status(err.code).json(err);
              }
              res.status(500).json({message: `Internal server error: ${err}`});
            });
        });
    });
});


module.exports = { oppRouter };
