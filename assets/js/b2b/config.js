// Defaults for window.Coral.b2b published by templates/layout/base.html.
import { getCoralB2B } from '../context.js';

const defaults = {
  enabled: false,
  storeHash: '',
  channelId: 1,
  customerId: null,
  apiBaseUrl: 'https://api-b2b.bigcommerce.com',
  appClientId: 'dl7c39mdpul6hyc489yk0vzxl6jesyx',
};

export function getB2BConfig() {
  const published = getCoralB2B();
  const config = { ...defaults };

  for (const key of Object.keys(defaults)) {
    const value = published[key];

    if (value !== undefined && value !== null && value !== '') {
      config[key] = value;
    }
  }

  return config;
}
