# JWT Forward Auth

> Protect your ingress with Json Web Tokens

This tool helps protect a Kubernetes ingress with Json Web Tokens. It performs JWT validation and decoding for you, so you can focus on your API logic. It acts as a Kubernetes Forward Auth/External Auth provider.

It will let clients call your webservice with a bearer token:

```
Authentication: Bearer [...JWT access token...]
```

JWT Forward Auth then validates the JWT against an OpenID Connect Identity Provider, unpacks it, and passes the JWT claims to your webservice in request headers:

```
X-Auth-Sub: ...
X-Auth-Client-Id: ...
X-Auth-Iat: ...
(etc.)
```

## Table of Contents <!-- omit in toc -->

-   [Background](#background)
-   [Install](#install)
    -   [For development](#for-development)
-   [Usage](#usage)
-   [Configuration](#configuration)
-   [Maintainers](#maintainers)
-   [Contributing](#contributing)
-   [License](#license)

## Background

Many modern frontend websites:

-   Run in the browser;
-   Let users authenticate with OpenID Connect;
-   Connect to backend APIs;
-   Authenticate with those APIs through the user's access token.

This requires that the backend services consume and validate access tokens in a uniform and safe way. JWT Forward Auth does that for them, to improve security and reduce boilerplate code.

## Install

The best way to run this service is through Docker: `docker pull ghcr.io/elseu/sdu-jwt-forward-auth:latest`.

### For development

If you want to develop JWT Forward Auth, run:

```
npm install
npm run dev # to run nodemon and reload when you change code
npm run start # to run in normal mode
```

## Usage

This component can be run as a Kubernetes ingress external authentication provider: the ingress sends the request headers to JWT Forward Auth, which checks the JWT and sends back new headers, and the ingress then includes those in the request to your webservice.

In both cases, JWT Forward Auth will unpack a JWT bearer token in the `Authorization:` header and validate its signature against the JWKS endpoint of the OIDC identity provider. Then:

-   If the token is valid, its claims are unpacked and sent to your backend in headers. The `sub` token becomes the `X-Auth-Sub` header, `client_id` becomes `X-Auth-Client-Id`, etc. If a claim contains an array, its values will be put in the header in comma-separated format.
-   If the token is invalid (invalid signature, expired) a `401 Authentication Required` response will be sent to the client and your webservice will not be called.
-   If no token is passed, your webservice **will** be called (unless configured otherwise), but without any `X-Auth-*` headers. This allows your webservice to expose public APIs.

To run as ingress external authentication in a Kubernetes cluster, you need to do two things:

First, **configure JWT Forward Auth as a deployment + service within the cluster**. You can do so simply by deploying the Docker image to your cluster and adding a service that points port 80 to targetPort 80 on the container. You only need one per cluster and per identity provider, so multiple APIs in the same cluster can use the same instance of JWT Forward Auth. You should configure the containers through environment variables (see [Configuration](#configuration).

An example configuration can be found in `k8s/forward-auth-service-example.yml`.

Next, **configure the JWT Forward Auth service as an external authentication for your ingress**. First make sure that your ingress controller support forward/external authentication. This is the case for Nginx. You should then add these annotations on your ingress:

```yml
nginx.ingress.kubernetes.io/auth-url: http://[jwt-auth-service-name].[jwt-auth-service-namespace].svc.cluster.local/
nginx.ingress.kubernetes.io/auth-response-headers: X-Auth-Sub, X-Auth-Client-Id, X-Auth-Role, Authorization
```

The first annotation tells your ingress where to find the authentication service. The second one tells it which headers to pass to your webservice. You have to whitelist which headers you want, separated by commas and spaces. If you add `Authorization` here, that header will be _removed_ from the request to your webservice. You can do this to make sure no other authorization logic in your webservice kicks in, or to prevent unwanted dependencies on the token's internal structure.

An example configuration for a webservice that simply echoes your request information can be found in `k8s/echo-example.yml`.

## Configuration

You can configure the services through these environment variables:

| Variable           | Usage                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWKS_URL`         | URL for a JWKS endpoint where keys can be found to validate the JWT against.                                                                                                                                                                                                                                                                                                                                                                                               |
| `DISCOVERY_URL`    | As an alternative to passing a fixed `JWKS_URL`, if your JWT is issued by an OpenID Connect identity provider, you can pass its .well-known/openid-configuration URL here. The `jwks_uri` will be read from the discovery URL.                                                                                                                                                                                                                                             |
| `JWT_ALGOS`        | A comma-separated list of JWT algorithms that should be accepted. Make sure these are only asymmetric key algorithms! The default is `RS256,RS384,RS512`, which is good for all RSA-based crypto. (Elliptic curves being the only reasonable alternative, if you know what you are doing.)                                                                                                                                                                                 |
| `REQUIRE_AUDIENCE` | If set, requires the `aud` claim in the token to equal the value of this variable and rejects the token otherwise.                                                                                                                                                                                                                                                                                                                                                         |
| `REQUIRE_ISSUER`   | If set, requires the `iss` claim in the token to equal the value of this variable and rejects the token otherwise.                                                                                                                                                                                                                                                                                                                                                         |
| `REQUIRE_TOKEN`    | If set to `true` or `1`, only allows requests to go to the backend ingress if they have a valid JWT bearer token in the `Authorization` header. By default requests without a bearer token in the `Authorization` header _are_ passed to the ingress (without any `X-Auth-` headers of course); the ingress can then decide to provide an anonymous version of its API. Note that regardless what you set here, an invalid or expired JWT **always** leads to a 401 error. |
| `HEADER_PREFIX`    | Prefix to use for authorization header names. Defaults to `X-Auth-`.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `LOG_REQUESTS`     | If set to `true` or `1`, all HTTP requests are logged to stdout.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `PORT`             | Port number to run the service on. Defaults to `3000`. The the Docker image sets this to `80` by default.                                                                                                                                                                                                                                                                                                                                                                  |

## Maintainers

-   [Sebastiaan Besselsen](https://github.com/sbesselsen) (Sdu)

## Contributing

Please create a branch named `feature/X` or `bugfix/X` from `master`. When you are done, send a PR to Sebastiaan Besselsen.

## License

Licensed under the MIT License.

Copyright 2020 Sdu Uitgevers.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
