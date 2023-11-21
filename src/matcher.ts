// eslint-disable-next-line @typescript-eslint/no-var-requires
const matchUrl = require('match-url-wildcard');

type WildcardMatcher = {
  isMatch: (value: string) => boolean;
  patterns: string[];
};

export function wildcardMatcherFromEnv(envName: string): WildcardMatcher {
  const indexedKey = (i: number) => `${envName}_${i}`;

  const patterns: string[] = [];
  if (process.env[envName]) {
    patterns.push(process.env[envName] as string);
  }
  if (process.env[indexedKey(0)]) {
    patterns.push(process.env[indexedKey(0)] as string);
  }
  for (let i = 1; process.env[indexedKey(i)]; i++) {
    patterns.push(process.env[indexedKey(i)] as string);
  }

  return {
    isMatch: (value) => matchUrl(value, patterns),
    patterns,
  };
}
