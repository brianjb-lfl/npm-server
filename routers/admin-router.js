'use strict';

const express = require('express');
const adminRouter = express.Router();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const { epHelp } = require('./router-helpers');

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

  const knex = require('../db');

  // get users
  return epHelp.buildUsersFull()
    .then(results => {
      userArr = results.slice();
    })

    // get causes
    .then( () => {
      return knex('causes')
        .select('cause')
        .orderBy('cause');
    })
    .then( results => {
      results.map( cause => causeArr.push(cause.cause));
    })

    // get skills
    .then( () => {
      return knex('skills')
        .select('skill')
        .orderBy('skill');
    })
    .then( results => {
      results.map( skill => skillArr.push(skill.skill));
    })

    .then( () => {
      resObj = Object.assign( {}, {
        users: userArr,
        causes: causeArr,
        skills: skillArr
      });
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", 0);      
      res.status(201).json(resObj);
    })
    .catch( err => {
      res.status(500).json({message: 'Internal server error'});
    });
});

module.exports = { adminRouter };