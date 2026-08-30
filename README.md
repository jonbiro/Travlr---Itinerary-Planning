# Travlr

The actively developed web app is the Next.js project in [`travlr-web`](travlr-web/README.md). Its setup, environment variables, Prisma workflow, local commands, and deployment instructions are documented in [the `travlr-web` README](travlr-web/README.md).

The Rails application at the repository root is an archived implementation retained for reference. It is not part of the current release or CI pipeline and still pins end-of-life Ruby/Rails dependencies, so do not deploy it as a production service without a dedicated framework upgrade and security review.

Legacy Rails credential files are intentionally not stored in Git. If you revive that application, create a new encrypted credentials file locally and supply its newly generated `RAILS_MASTER_KEY` through the deployment environment; never reuse the key that appeared in this repository's history.

### Legacy Rails environment

The legacy API reads these values from the deployment environment; none belong in source control:

* `JWT_SECRET` — a long, randomly generated signing secret for API tokens
* `GOOGLE_MAPS_API_KEY` — a server-side key used for geocoding
* `FOURSQUARE_CLIENT_ID` and `FOURSQUARE_CLIENT_SECRET` — server-side venue-search credentials
* `REACT_APP_GOOGLE_MAPS_API_KEY` — a browser-restricted Google Maps JavaScript key used by the legacy React client

Copy `travlr/.env.example` for the frontend variable names. Provider keys should be restricted to the required APIs and origins in their provider consoles.

An historical demo of that implementation is available in the [original walkthrough](https://youtu.be/oz5oYOEf87U). Its old Heroku deployment instructions have been removed to prevent the archived service from being mistaken for the supported application.


## Built With

* [React](https://reactjs.org/) - Front end interface
* [React-Router-Dom](https://www.npmjs.com/package/react-router-dom) - Page navigation 
* [Rails](https://rubyonrails.org/) - Save user credentials/information and references to event information
* [PostgreSQL](https://www.postgresql.org/) - Database
* [Bcrypt](https://www.npmjs.com/package/bcrypt) - Hash user credentials
* [JWT](https://jwt.io/) - Secure transfer of credentials
* [Semantic-UI](https://semantic-ui.com/) - CSS theming
* [Semantic-UI React](https://react.semantic-ui.com/) - Styled react components
* [Google Maps](https://cloud.google.com/maps-platform/) - Map, and user interactivity
* [Foursquare](https://developer.foursquare.com/)  - Event and venue information


## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
