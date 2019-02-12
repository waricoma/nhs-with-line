// @flow strict
'use strict';

import express from 'express';
import helmet from 'helmet';
import uuidV4 from 'uuid/v4';
import passport from 'passport';
import passportGoogleOauth from 'passport-google-oauth';
import expressSession from 'express-session';
import * as line from '@line/bot-sdk';
import * as lineMsg from './modules/line-msg';
import Sequelize from 'sequelize';
import path from 'path';
import dotEnv from 'dotenv';
dotEnv.config();
const port: number = parseFloat(process.env.PORT || '3000');
const exp: Object = express();
// const router: Object = express.Router();
const googleStrategy: Object = passportGoogleOauth.OAuth2Strategy;
const lineConfig: {[string]: string} = {
  channelAccessToken: String(process.env.lineChannelAccessToken),
  channelSecret: String(process.env.lineChannelSecret),
  channelId: String(process.env.lineChannelId)
};
const lineClient: Object = new line.Client(lineConfig);
const domain: string = String(process.env.domain);
const googleStrategyConfig: {[string]: string} = {
  clientID: String(process.env.googleClientID),
  clientSecret: String(process.env.googleClientSecret),
  callbackURL: `https://${domain}/auth/google/callback`,
  accessType: 'offline'
};
const organizationDomain: string = String(process.env.organizationDomain);

const sequelize: Object = new Sequelize('database', process.env.dbUser, process.env.dbPassword, {
  dialect: 'sqlite',
  storage: path.resolve(__dirname, 'db', 'main.sqlite3'),
  logging: (process.env.dbLogging !== 'false'),
  operatorsAliases: false
});

const users: Object = sequelize.define('users', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  googleId: {
    field: 'google-id',
    type: Sequelize.STRING(200),
    unique: true,
    allowNull: false
  },
  lineId: {
    field: 'line-id',
    type: Sequelize.STRING(200),
    unique: true,
    allowNull: false
  },
  token: {
    type: Sequelize.UUID,
    unique: true,
    allowNull: false
  },
  using: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  createdAt: {
    field: 'created',
    type: Sequelize.DATE,
    allowNull: false
  },
  updatedAt: {
    field: 'updated',
    type: Sequelize.DATE,
    allowNull: false
  }
}, {freezeTableName: true, timestamps: true});

passport.use(new googleStrategy(googleStrategyConfig, (accessToken: string, refreshToken: string, profile: Object, done: Function) => {
  if (profile) return done(null, profile);
  return done(null, false);
}));
exp.use(passport.initialize());
exp.get('/auth/login', passport.authenticate('google', {scope: ['email', 'profile'], session: true}));
exp.get('/auth/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});
exp.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {
  if (!('domain' in req.user._json)) return res.redirect('/?msg=mustUseOrganization');
  if (req.user._json.domain !== organizationDomain) return res.redirect('/msg=mustUseOrganization');
  const gConnectWithL: string = uuidV4();
  users.findOne({where: {googleId: req.user.id}}).then((user: Object) => {
    if (user) {
      user.token = gConnectWithL;
      user.save();
    } else {
      users.create({
        googleId: req.user.id,
        lineId: uuidV4(),
        token: gConnectWithL,
        using: true
      });
    }
    res.render('4line', {gConnectWithL: gConnectWithL});
  });
});

lineMsg.hears(/^!link /, ['user'], (event: Object) => {
  const gConnectWithL: string = event.message.text.replace('!link ', '');
  if (gConnectWithL.match(/([^0-9a-z\-])+/g)) return;
  users.findOne({where: {token: gConnectWithL}}).then((user: Object) => {
    if (!user) return;
    user.lineId = event.source.userId;
    user.save();
  });
});

lineMsg.hears(/^(!|！)(check|確認)$/i, ['all'], (event: Object) => {
  users.findOne({where: {lineId: event.source.userId, using: true}}).then((user: Object) => {
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
  users.findOne({where: {lineId: event.source.userId}}).then((user: Object) => {
    if (!user) return;
    user.using = false;
    user.save();
  });
});

lineMsg.hears(/^(!|！)(use|利用再開)$/i, ['user'], (event: Object) => {
  users.findOne({where: {lineId: event.source.userId}}).then((user: Object) => {
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
exp.use(express.static(path.resolve(__dirname, 'public')));
exp.set('views', path.resolve(__dirname, 'views'));
exp.set('view engine', 'ejs');
exp.post('/callback', line.middleware(lineConfig), (req, res, next) => Promise.all(req.body.events.map(handleEvent)).then(result => res.json(result)).catch(err => res.status(500).end()));
exp.listen(port, () => console.log(`listening on port ${port}!`));
exp.use((req, res, next) => res.status(404).render('error', { code: 404 }));
exp.use((err, req, res, next) => res.status(500).render('error', { code: 500 }));