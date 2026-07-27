const Setting = require('../models/Setting');

async function get(key, defaultValue = null) {
  const setting = await Setting.findOne({ key });
  if (!setting) return defaultValue;

  const { value, type } = setting;

  switch (type) {
    case 'integer':
    case 'int':
      return parseInt(value, 10);
    case 'float':
    case 'numeric':
      return parseFloat(value);
    case 'boolean':
    case 'bool':
      return value === 'true' || value === '1';
    case 'array':
    case 'json':
      return JSON.parse(value);
    default:
      return value;
  }
}

async function set(key, value, type = null, group = null) {
  let resolvedType = type;
  if (!resolvedType) {
    if (typeof value === 'number') resolvedType = Number.isInteger(value) ? 'integer' : 'float';
    else if (typeof value === 'boolean') resolvedType = 'boolean';
    else if (typeof value === 'object' && value !== null) resolvedType = 'json';
    else resolvedType = 'string';
  }

  const stringValue =
    resolvedType === 'json' ? JSON.stringify(value) : String(value);

  await Setting.findOneAndUpdate(
    { key },
    { value: stringValue, type: resolvedType, group },
    { upsert: true, new: true }
  );
}

module.exports = { get, set };
