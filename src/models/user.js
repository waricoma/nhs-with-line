// @flow strict
'use strict';

import * as sequelizeLoader from './sequelizeLoader';

const Sequelize = sequelizeLoader.Sequelize;

export const User: Object = sequelizeLoader.sequelize.define('users', {
  'id': {
  'type': Sequelize.INTEGER,
    'primaryKey': true,
    'autoIncrement': true,
    'allowNull': false
  },
  'googleId': {
    'field': 'google-id',
    'type': Sequelize.STRING(200),
    'unique': true,
    'allowNull': false
  },
  'lineId': {
    'field': 'line-id',
    'type': Sequelize.STRING(200),
    'unique': true,
    'allowNull': false
  },
  'token': {
    'type': Sequelize.UUID,
    'unique': true,
    'allowNull': false
  },
  'using': {
    'type': Sequelize.BOOLEAN,
    'allowNull': false,
    'defaultValue': true
  },
  'createdAt': {
    'field': 'created',
    'type': Sequelize.DATE,
    'allowNull': false
  },
  'updatedAt': {
    'field': 'updated',
    'type': Sequelize.DATE,
    'allowNull': false
  }
}, { 'freezeTableName': true, 'timestamps': true });
