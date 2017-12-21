'use strict';

const express = require('express');
const roleRouter = express.Router();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const { epHelp } = require('./router-helpers');

process.stdout.write('\x1Bc');

// comm test
roleRouter.get('/testify/', (req, res) => {
  res.status(200).json({message: 'Good to go'});
});

// POST api/roles
roleRouter.post('/', jsonParser, (req, res) => {
  const knex = require('../db');
  let rolePostObj = {};

  // validate capability
  const capabilityOpts = ['admin', 'following'];
  if(!(capabilityOpts.includes(req.body.capabilities))) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Error: unrecognized capability spec'
    });
  }

  rolePostObj = epHelp.convertCase(req.body, 'ccToSnake');
  return knex('roles')
    .insert(rolePostObj)
    .returning ([
      'id',
      'id_user_adding as idUserAdding',
      'id_user_receiving as idUserReceiving',
      'capabilities'])
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

// PUT api/roles/:id
roleRouter.put('/:id', jsonParser, (req, res) => {
  const knex = require('../db');
  let rolePostObj = {};

  // validate capability
  if(req.body.capabilities) {
    const capabilityOpts = ['admin', 'following'];
    if(!(capabilityOpts.includes(req.body.capabilities))) {
      return res.status(422).json({
        code: 422,
        reason: 'ValidationError',
        message: 'Error: unrecognized capability spec'
      });
    }
  }

  rolePostObj = epHelp.convertCase(req.body, 'ccToSnake');
  return knex('roles')
    .where('id', '=', req.params.id)
    .update(rolePostObj)
    .returning (['id', 'id_user_adding as idUserAdding', 'id_user_receiving as idUserReceiving', 'capabilities'])
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

// DELETE api/roles/:id

roleRouter.delete('/:id', (req, res) => {
  const knex = require('../db');
  return knex('roles')
    .where('id', '=', req.params.id)
    .del()
    .then( () => {
      res.status(200).json({message: 'Role deleted'});
    })
    .catch( err => {
      res.status(500).json({message: 'Internal server error'});
    });
});


module.exports = { roleRouter };