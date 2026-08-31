# Travlr

The actively developed web app is the Next.js project in [`travlr-web`](travlr-web/README.md). Its setup, environment variables, Prisma workflow, local commands, and deployment instructions are documented in [the `travlr-web` README](travlr-web/README.md).

The Rails application at the repository root is an archived implementation retained for reference. It is not part of the current release or CI pipeline and still pins end-of-life Ruby/Rails dependencies, so do not deploy it as a production service without a dedicated framework upgrade and security review.

Repository-level `npm` scripts and process files intentionally delegate to `travlr-web`, so hosts that start from the repository root build and run the supported Next.js app instead of the archive. Vercel projects should still use `travlr-web` as their project root for native framework detection.
The root build explicitly installs the nested app's build tooling; the Prisma migration CLI remains available to the release process after production dependency pruning.

Legacy Rails credential files are intentionally not stored in Git. If you revive that application, create a new encrypted credentials file locally and supply its newly generated `RAILS_MASTER_KEY` through the deployment environment; never reuse the key that appeared in this repository's history.

> **Security notice:** deleted credentials remain recoverable from Git history.
> Treat every historical provider credential and Rails signing key as
> compromised: revoke and rotate them at the provider, review access logs, and
> coordinate any history rewrite with every collaborator. See
> [`SECURITY.md`](SECURITY.md) for the reporting policy.

### Legacy Rails environment

The legacy API reads these values from the deployment environment; none belong in source control:

* `JWT_SECRET` — a long, randomly generated signing secret for API tokens
* `GOOGLE_MAPS_API_KEY` — a server-side key used for geocoding
* `FOURSQUARE_CLIENT_ID` and `FOURSQUARE_CLIENT_SECRET` — server-side venue-search credentials
* `REACT_APP_GOOGLE_MAPS_API_KEY` — a browser-restricted Google Maps JavaScript key used by the legacy React client

Copy `travlr/.env.example` for the frontend variable names. Provider keys should be restricted to the required APIs and origins in their provider consoles.

An historical demo of that implementation is available in the [original walkthrough](https://youtu.be/oz5oYOEf87U). Its old Heroku deployment instructions have been removed to prevent the archived service from being mistaken for the supported application.


## Active stack

* Next.js and React
* TypeScript and Tailwind CSS
* Prisma and PostgreSQL
* NextAuth
* OpenAI and Google Maps integrations

The archived implementation uses Rails, React Router, Semantic UI, JWT, and
Foursquare. Those dependencies are retained for historical reference only.


## Contributing

Open an issue before a large change, keep changes focused on `travlr-web`, and
include the relevant lint, test, typecheck, and build results with pull requests.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE).
