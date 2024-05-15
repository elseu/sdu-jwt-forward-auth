import axios from 'axios';
import jsonwebtoken from 'jsonwebtoken';

import NodeCache from 'node-cache';
const userInfoCache = new NodeCache();

interface UserInfoRequest {
  url: string;
  token: string;
}

export async function getUserInfo({ url, token }: UserInfoRequest) {
  const userInfo = userInfoCache.get(token);

  if (userInfo) {
    return userInfo;
  }

  const tokenData = jsonwebtoken.decode(token);

  if (!tokenData || typeof tokenData === 'string') {
    throw new Error('Invalid token data');
  }

  const userInfoData = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const ttl = tokenData.exp - Math.floor(Date.now() / 1000);

  console.log({
    ttl,
    exp: tokenData.exp,
    tokenData,
  });

  // cache the userinfo for the length of the access token expiry
  userInfoCache.set(token, userInfoData.data, ttl);

  return userInfoData.data;
}
