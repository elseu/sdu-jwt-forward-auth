import axios from 'axios';

export async function loadDiscoveryData(issuer: string) {
  const discoveryUrl = issuer.replace(/\/+$/, '') + '/.well-known/openid-configuration';
  console.log('Discovery URL:', discoveryUrl);
  const discoveryData = await axios(discoveryUrl);
  if (!discoveryData.data || !discoveryData.data.jwks_uri) {
    throw new Error(`No jwks_uri found in discovery document at ${discoveryUrl}`);
  }

  return discoveryData.data;
}
