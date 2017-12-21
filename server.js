'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { PORT, CLIENT_ORIGIN } = require('./config');
const { userRouter } = require('./routers/user-router');
const { orgRouter } = require('./routers/org-router');
const { oppRouter } = require('./routers/opp-router');
const { causeRouter } = require('./routers/cause-router');
const { adminRouter } = require('./routers/admin-router');
const { authRouter } = require('./auth/auth-router');
const { roleRouter } = require('./routers/role-router');
const { responseRouter } = require('./routers/response-router');


const app = express();
app.use(morgan('common', { skip: () => process.env.DB_MODE === 'test'}));

app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);

// Serve the built client
app.use(express.static(path.resolve(__dirname, '../client/build')));

// Unhandled requests which aren't for the API should serve index.html so
// client-side routing using browserHistory can function
// app.get(/^(?!\/api(\/|$))/, (req, res) => {
//   const index = path.resolve(__dirname, '../client/build', 'index.html');
//   res.sendFile(index);
// });

app.use('/api/users', userRouter);
app.use('/api/orgs', orgRouter);
app.use('/api/opportunities', oppRouter);
app.use('/api/causes', causeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/roles', roleRouter);
app.use('/api/responses', responseRouter);

app.use('*', (req, res) => {
  return res.status(404).json({message: 'Not found'});
});

function runServer(port = PORT) {
  const server = app
    .listen(port, () => {
      console.info(`App listening on port ${server.address().port}`);
    })
    .on('error', err => {
      console.error('Express failed to start');
      console.error(err);
    });
}
// test

if (require.main === module) {
  runServer();
}

module.exports = { app, runServer };