'use strict';

const express = require('express');
const responseRouter = express.Router();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const { epHelp } = require('./router-helpers');

process.stdout.write('\x1Bc');

// comm test
responseRouter.get('/testify/', (req, res) => {
  res.status(200).json({message: 'Good to go'});
});

// POST api/responses
responseRouter.post('/', jsonParser, (req, res) => {
  const knex = require('../db');
  let respPostObj = {};

  // check for required fields
  const reqFields = ['userId', 'idOpportunity'];
  const missingField = reqFields.filter( field => !(field in req.body));
  if(missingField.length > 0) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Error: opportunity and user id required'
    });
  }
  respPostObj = epHelp.convertCase(req.body, 'ccToSnake');
  console.log(respPostObj);
  return knex('responses')
    .insert(respPostObj)
    .returning ([
      'id',
      'id_user as userId',
      'id_opp as idOpportunity',
      'response_status as responseStatus',
      'notes'])
    .then( results => {
      res.json(results);
    })
    .catch( err => {
      if(err.reason === 'ValidationError') {
        return res.status(err.code).json(err);
      }
      res.status(500).json({message: 'Internal server error'});
    });
});

// PUT api/responses/:id
responseRouter.put('/:id', jsonParser, (req, res) => {
  const knex = require('../db');
  let respPostObj = {};

  // validate response id
  return knex('responses')
    .select('id')
    .where('id', '=', req.params.id)
    .then( result => {
      if(result.length < 1) {
        return res.status(422).json({
          code: 422,
          reason: 'ValidationError',
          message: 'Error: response not found'
        });
      }
      respPostObj = epHelp.convertCase(req.body, 'ccToSnake');
      console.log(respPostObj);
      console.log(req.params.id);
      return knex('responses')
        .where('id', '=', req.params.id)
        .update(respPostObj)
        .returning ([
          'id',
          'id_user as userId',
          'id_opp as idOpportunity',
          'response_status as responseStatus',
          'notes'])
        .then( results => {
          res.json(results);
        })
        .catch( err => {
          if(err.reason === 'ValidationError') {
            return res.status(err.code).json(err);
          }
          res.status(500).json({message: 'Internal server error'});
        });
    });
});

// DELETE api/roles/:id
responseRouter.delete('/:id', (req, res) => {
  const knex = require('../db');
  return knex('responses')
    .where('id', '=', req.params.id)
    .del()
    .then( () => {
      res.status(200).json({message: 'Response deleted'});
    })
    .catch( err => {
      res.status(500).json({message: 'Internal server error'});
    });
});


module.exports = { responseRouter };