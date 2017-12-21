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
  let retObj = {};
  let orgName;

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
  let orgId = rolePostObj.capabilities === 'admin' ? 
    rolePostObj.id_user_adding : rolePostObj.id_user_receiving;
  return epHelp.getOrg(orgId)
    .then( org => {
      orgName = org;
      return knex('roles')
        .insert(rolePostObj)
        .returning ([
          'id',
          'id_user_adding as idUserAdding',
          'id_user_receiving as idUserReceiving',
          'capabilities']);
    })
    .then( result => {
      retObj = Object.assign( {}, result[0], {
        organization: orgName
      });
      res.json(retObj);
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
  const roleId = req.params.id;
  let rolePutObj = {};
  let retObj = {};
  let orgName;

  // validate capability
  const capabilityOpts = ['admin', 'following'];
  if(!(capabilityOpts.includes(req.body.capabilities))) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Error: unrecognized capability spec'
    });
  }

  rolePutObj = epHelp.convertCase(req.body, 'ccToSnake');
  let orgId = rolePutObj.capabilities === 'admin' ? 
    rolePutObj.id_user_adding : rolePutObj.id_user_receiving;
  return epHelp.getOrg(orgId)
    .then( org => {
      orgName = org;
      console.log(orgName);
      return knex('roles')
        .where('id', '=', roleId)
        .update(rolePutObj)
        .returning ([
          'id',
          'id_user_adding as idUserAdding',
          'id_user_receiving as idUserReceiving',
          'capabilities']);
    })
    .then( result => {
      retObj = Object.assign( {}, result[0], {
        organization: orgName
      });
      res.json(retObj);
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