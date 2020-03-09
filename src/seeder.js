import * as types from './types';
import { isObject } from './util';

const ASSETS_DIR = '.';
const data = new Map([
  [types.Title, 'Awesome title'],
  [types.Text, ''],
  [types.Numeric, 1],
  [types.Logic, false],
  [types.Avatar, `${ASSETS_DIR}/img/avatar.png`],
  [types.Logo, `${ASSETS_DIR}/img/google.svg`],
  [types.Link, 'http://example.com'],
  [types.Image, `${ASSETS_DIR}/img/baianat.png`],
  [types.ClassList, () => []],
  [types.Button, () => ({ text: 'Click Me!', classes: [], href: 'http://example.com' })],
  [types.Quote, 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'],
  [types.Grid, () => ({mobile: '', tablet: '', desktop: '', widescreen: ''})],
  [types.FiltersGroup, () => ({'from': 'yesterday', 'until': 'today', 'filters': []})],
  [Number, 100],
  [String, 'This is pretty neat']
]);

export default class Seeder {
  // Seeds values using a schema.
  static seed (schema) {
    if (isObject(schema)) {
      return Object.keys(schema).reduce((values, key) => {
        values[key] = Seeder.seed(schema[key]);
        return values;
      }, {});
    } else if (Array.isArray(schema)) {
      return schema.map(s => {
        return Seeder.seed(s)
      });
    }

    let value = data.get(schema);
    if (value === undefined) {
      value = schema;
    }
    return typeof value === 'function' ? value() : value;
  }
};
