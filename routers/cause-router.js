'use strict';

const express = require('express');
const causeRouter = express.Router();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

process.stdout.write('\x1Bc');

// comm test
causeRouter.get('/testify/', (req, res) => {
  res.status(200).json({message: 'Good to go'});
});

// GET api/causes/list
causeRouter.get('/list', (req, res) => {
  const knex = require('../db');
  return knex
    .select('cause')
    .from ('causes')
    .orderBy('cause')
    .debug(false)
    .then( results => {
      res.json(results);
    })
    .catch( err => {
      res.status(500).json({message: 'Internal server error'});
    });    
});

// GET api/causes/oppslist


module.exports = { causeRouter };