// @flow strict
'use strict';

import dotEnv from 'dotenv';
dotEnv.config();

import express from 'express';
import passport from 'passport';
import path from 'path';
import helmet from 'helmet';
import expressSession from 'express-session';
import { User } from './models/user';
import * as line from '@line/bot-sdk';
import * as lineMsg from './modules/line-msg';

const port: number = parseFloat(process.env.PORT || 3000);
const domain: string = String(process.env.domain);

const exp: Object = express();

exp.use(passport.initialize());
import * as auth from './routers/auth';
exp.use('/auth', auth.router);

const lineConfig: {[string]: string} = {
  'channelAccessToken': String(process.env.lineChannelAccessToken),
  'channelSecret': String(process.env.lineChannelSecret),
  'channelId': String(process.env.lineChannelId)
};
const lineClient: Object = new line.Client(lineConfig);

lineMsg.hears(/^!link /, ['user'], (event: Object) => {
  const uuidOdLinkingGoogleAndLINE: string = event.message.text.replace('!link ', '');
  
  if (uuidOdLinkingGoogleAndLINE.match(/([^0-9a-z\-])+/g)) {
    return;
  }
  
  User.findOne({ 'where': { 'token': uuidOdLinkingGoogleAndLINE } }).then((user: Object) => {
    if (!user) return;
    user.lineId = event.source.userId;
    user.save();
  });
});

lineMsg.hears(/^(!|！)(check|確認)$/i, ['all'], (event: Object) => {
  User.findOne({ 'where': { 'lineId': event.source.userId, 'using': true } }).then((user: Object) => {
    if (user) {
      lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '👍'
      });
    } else {
      lineClient.replyMessage(event.replyToken, {
        type: 'template',
        altText: "Let's record the relationship of your LINE and applicable organization account. (using LINE smartphone application.)",
        template: {
          type: 'confirm',
          text: "Let's record the relationship of your LINE and applicable organization account.",
          actions: [
            {
              type: 'uri',
              uri: process.env.lineFrontendFramework,
              label: 'DO!'
            },
            {
              type: 'uri',
              uri: `https://${domain}`,
              label: '> WEB'
            }
          ]
        }
      });
    }
  });
});

lineMsg.hears(/^(!|！)(doNotUse|利用停止)$/i, ['user'], (event: Object) => {
  User.findOne({ 'where': { 'lineId': event.source.userId } }).then((user: Object) => {
    if (!user) return;
    user.using = false;
    user.save();
  });
});

lineMsg.hears(/^(!|！)(use|利用再開)$/i, ['user'], (event: Object) => {
  User.findOne({ 'where': { 'lineId': event.source.userId } }).then((user: Object) => {
    if (!user) return;
    user.using = true;
    user.save();
  });
});

const handleEvent = (event: Object) => lineMsg.ear(event, (event: Object) => {});

exp.use(helmet());

exp.set('trust proxy', 1);
exp.use(expressSession({
  secret: process.env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    domain: domain,
    expires: new Date(Date.now() + 60 * 60 * 1000)
  }
}));

exp.use(passport.session());
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

exp.use(express.static(path.resolve(__dirname, '..', 'public')));

exp.set('views', path.resolve(__dirname, '..', 'views'));
exp.set('view engine', 'ejs');

exp.post('/callback', line.middleware(lineConfig), (req, res, next) => Promise.all(req.body.events.map(handleEvent)).then(result => res.json(result)).catch(err => res.status(500).end()));

exp.listen(port, () => console.log(`listening on port ${port}!`));

exp.use((req, res, next) => res.status(404).render('error', { code: 404 }));
// exp.use((err, req, res, next) => res.status(500).render('error', { code: 500 }));
