'use strict';

const express = require('express');
const passport = require('passport');
const { jwtStrategy } = require('../auth/jwt-strategy');
const userRouter = express.Router();
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const { hashPassword } = require('../auth/bcrypt');
const { epHelp } = require('./router-helpers');

process.stdout.write('\x1Bc');

passport.use(jwtStrategy);
const jwtAuth = passport.authenticate('jwt', { session: false });

// comm test
userRouter.get('/testify/', (req, res) => {
  res.status(200).json({message: 'Good to go'});
});

// ***** TEST START

// GET api/users/test
userRouter.get('/test', jsonParser, (req, res) => {
  const knex = require('../db');

  let convQuery = epHelp.convertCase(req.query, 'ccToSnake');
  
  const calcUserField = 
    "case when users.organization isnull then "
      + "users.last_name || ', '  || users.first_name "
      + "else users.organization "
      + "end as user_string";
  return knex
    .select(
      'id',
      'username',
      'location_city as locationCity',
      'location_state as locationState', 
      'first_name as firstName',
      'last_name as lastName',
      'organization',
      'user_type as userType',
      knex.raw(calcUserField)
    )
    .from ('users')
    .where(convQuery)
    .orderBy('username')
    .debug(false)
    .then( results => {
      res.json(results);
    })
    .catch( err => {
      res.status(500).json({message: 'Internal server error'});
    });    
});

// ***** TEST END

// GET api/users/list
userRouter.get('/list', (req, res) => {
  const knex = require('../db');
  let convQuery = epHelp.convertCase(req.query, 'ccToSnake');
  const calcUserField = 
    "case when users.organization isnull then "
      + "users.last_name || ', '  || users.first_name "
      + "else users.organization "
      + "end as user_string";
  return knex
    .select(
      'id',
      'username',
      'location_city as locationCity',
      'location_state as locationState', 
      'first_name as firstName',
      'last_name as lastName',
      'organization',
      'user_type as userType',
      knex.raw(calcUserField)
    )
    .from ('users')
    .where(convQuery)
    .orderBy('username')
    .debug(false)
    .then( results => {
      res.json(results);
    })
    .catch( err => {
      res.status(500).json({message: 'Internal server error'});
    });    
});

// GET api/users/:id
userRouter.get('/:id', (req, res) => {
  return epHelp.buildUser(req.params.id)
    .then( results => {
      if(!results.err) {
        res.json(results);
      }
      else {
        res.status(500).json({message: 'Internal server error'});
      }
    });
});

// POST api/users/register
userRouter.post('/register', jsonParser, (req, res) => {
  const knex = require('../db');
  const reqFields = ['username', 'password'];
  const missingField = reqFields.filter( field => !(field in req.body));
  // check for missing username or passwd
  if(missingField.length > 0) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Error: username and password are required'
    });
  }
  // check for dup username
  let inUsrObj = Object.assign( {}, req.body);
  return knex('users')
    .select()
    .where({username: inUsrObj.username})
    .then( results => {
      if(results.length > 0) {
        return Promise.reject({
          code: 422,
          reason: 'ValidationError',
          message: 'Username already taken',
        });
      }
    })    // no dup, insert new user
    .then( () => {
      return hashPassword(inUsrObj.password);
    })
    .then( result => {
      let convInUsrObj = epHelp.convertCase(inUsrObj, 'ccToSnake');
      if(convInUsrObj.user_type === 'organization') {
        convInUsrObj = Object.assign( {}, convInUsrObj, {
          password: result,
          first_name: null,
          last_name: null
        });
      }
      else {
        convInUsrObj = Object.assign( {}, convInUsrObj, {
          password: result,
          organization: null,
        });
      }
      return knex('users')
        .insert(convInUsrObj)
        .returning(['id', 'username'])
        .then( results => {
          res.status(201).json(results[0]);
        });
    })
    .catch( err => {
      if(err.reason === 'ValidationError') {
        return res.status(err.code).json(err);
      }
      res.status(500).json({message: 'Internal server error'});
    });
});

// PUT api/users/:id
userRouter.put('/:id', jsonParser, (req, res) => {
  const usrId = req.params.id;
  const knex = require('../db');
  let inUsrObj = Object.assign( {}, req.body);
  let convInUsrObj = {};
  let retObj = {};
  let linksArr = typeof req.body.links === 'object' ? req.body.links.slice() : [] ;
  let linkPostArr = [];
  let causesArr = typeof req.body.causes === 'object' ? req.body.causes.slice() : [] ;
  let causePostArr = [];
  let skillsArr = typeof req.body.skills === 'object' ? req.body.skills.slice() : [] ;
  let skillPostArr = [];

  // verify id
  return knex('users')
    .select()
    .where('id', '=', usrId)
    .then( results => {
      if(!results) {
        return Promise.reject({
          code: 422,
          reason: 'ValidationError',
          message: 'User id not found.',
        });
      }
    })    // user exists, update info
    
    .then( () => {
      // get hashed pw
      convInUsrObj = epHelp.convertCase(inUsrObj, 'ccToSnake');
      if(convInUsrObj.password) {
        return hashPassword(convInUsrObj.password);
      }
      else {
        return;
      }
    })

    .then( result => {
      // process base user info
      if(result){
        convInUsrObj = Object.assign( {}, convInUsrObj, {
          password: result
        });
      }
      delete convInUsrObj.links;
      delete convInUsrObj.causes;
      delete convInUsrObj.skills;
      return knex('users')
        .where('id', '=', usrId)
        .update(convInUsrObj)
        .returning(['id', 'username']);
    })

    .then( result => {
      retObj = result;
      // process links
      return knex('links')
        .where('id_user', '=', usrId)
        .del()
        .then( () => {
          if(linksArr.length > 0) {
            linksArr.forEach( linkItem => {
              linkPostArr.push(
                Object.assign( {}, {
                  id_user: usrId,
                  link_url: linkItem.linkUrl,
                  link_type: linkItem.linkType
                })
              );
            });
            return knex('links')
              .insert(linkPostArr)
          }
          else {
            return;
          }
        });
    })
    
    .then( () => {
      // process causes
      return knex('users_causes')
        .where('id_user', '=', usrId)
        .del()
        .then( () => {
          if(causesArr.length > 0) {
            return knex('causes')
              .select('id', 'cause')
          }
          else {
            return;
          }
        })
        .then( results => {
          if(results) {
            causesArr.forEach( causeItem => {
              const causeId = results.filter( item => item.cause === causeItem )[0].id;
              causePostArr.push(
                Object.assign ( {}, {
                  id_user: usrId,
                  id_cause: causeId
                })
              );
            });
            return knex('users_causes')
              .insert(causePostArr)
          }
          else {
            return;
          }
        });
    })

    .then( () => {
      // process skills
      return knex('users_skills')
        .where('id_user', '=', usrId)
        .del()
        .then( () => {
          if(skillsArr.length > 0) {
            return knex('skills')
              .select('id', 'skill')
          }
          else {
            return;
          }
        })
        .then( results => {
          if(results) {
            skillsArr.forEach( skillItem => {
              const skillId = results.filter( item => item.skill === skillItem )[0].id;
              skillPostArr.push(
                Object.assign ( {}, {
                  id_user: usrId,
                  id_skill: skillId
                })
              );
            });
            return knex('users_skills')
              .insert(skillPostArr);
          }
          else {
            return;
          }
        });
    })
    .then( () => {
      console.log('retObj before', retObj);
      return epHelp.buildUser(retObj[0].id);
    })
    .then( (retObj) => {
      console.log('retObj after', retObj);
      let usrObjCC = epHelp.convertCase(retObj, 'snakeToCC');
      res.status(201).json(usrObjCC);
    })
    .catch( err => {
      if(err.reason === 'ValidationError') {
        return res.status(err.code).json(err);
      }
      res.status(500).json({message: 'Internal server error'});
    });
});

// Clear test data
userRouter.delete('/clear/test/data', (req, res) => {
  const knex = require('../db');
  return knex('users')
    .where('username', 'like', '%user%')
    .del()
    .then( () => {
      return knex('users')
        .where('username', 'like', '%test%')
        .del()
        .then( () => {
          res.status(200).json({message: 'Test data deleted'});
        });
    })
    .catch( err => {
      res.status(500).json({message: 'Internal server error'});
    });
});

module.exports = { userRouter };