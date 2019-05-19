// @flow strict
'use strict';

import SequelizeModule from 'sequelize';
import path from 'path';

export const Sequelize: Object = SequelizeModule;

export const sequelize: Object = new Sequelize('database', process.env.dbUser, process.env.dbPassword, {
  'dialect': 'sqlite',
  'storage': path.resolve(__dirname, '..', '..', 'db', 'main.sqlite3'),
  'logging': (process.env.dbLogging !== 'false'),
  'operatorsAliases': false
});
