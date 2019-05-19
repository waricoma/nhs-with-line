// @flow strict
'use strict';

import dotEnv from 'dotenv';
dotEnv.config();

import express from 'express';
import passport from 'passport';
import passportGoogleOauth from 'passport-google-oauth';
import path from 'path';
import uuidV4 from 'uuid/v4';
import { User } from '../models/user';

const organizationDomain: string = String(process.env.organizationDomain);
const domain: string = String(process.env.domain);
const googleStrategy: Object = passportGoogleOauth.OAuth2Strategy;

export const router: Object = express.Router();

passport.use(new googleStrategy({
  'clientID': String(process.env.googleClientID),
  'clientSecret': String(process.env.googleClientSecret),
  'callbackURL': `https://${domain}/auth/google/callback`,
  'accessType': 'offline'
}, (accessToken: string, refreshToken: string, profile: Object, done: Function) => {
  if (profile) {
    return done(null, profile);
  }
  return done(null, false);
}));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/msg=mustUseOrganization' }), (req, res) => {
  if (!('domain' in req.user._json)) {
    return res.redirect('/?msg=mustUseOrganization');
  }
  if (req.user._json.domain !== organizationDomain) {
    return res.redirect('/msg=mustUseOrganization');
  }

  const uuidOdLinkingGoogleAndLINE: string = uuidV4();

  User.findOne({ 'where': { 'googleId': req.user.id } }).then((user: Object) => {
    if (user) {
      user.token = uuidOdLinkingGoogleAndLINE;
      user.save();
    } else {
      User.create({
        googleId: req.user.id,
        lineId: uuidV4(),
        token: uuidOdLinkingGoogleAndLINE,
        using: true
      });
    }
    res.render('4line', {uuidOdLinkingGoogleAndLINE: uuidOdLinkingGoogleAndLINE});
  });
});

router.get('/login', passport.authenticate('google', { scope: ['email', 'profile'], session: true }));

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});
