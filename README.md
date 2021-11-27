# Plural Console

![Console](assets/public/console-lockup-dark.png)

The Plural Console is the administrative hub of the plural platform.  It has a number of key features:

* Reception of over-the-air application updates
* Configurable, application-targeted observability
  - dashboards
  - logging
* Common incident management, including zoom integration and slash commands
* Interactive Runbooks

We strive to make it powerful enough to make you feel like any application you deploy using Plural has an operational profile comparable to a managed service, even without being one.

## Development

Console's server side is written in elixir, and exposes a graphql api. The frontend is in react, all code lives in this single repo and common development tasks can be done using the Makefile at the root of the repo.


### Developing Web
To begin developing the web app, install npm & yarn, then run:

```sh
cd assets && yarn install && cd -
make web
```

### Developing Server
To make changes to the server codebase, you'll want to install elixir on your machine.  For mac desktops, we do this via asdf, which can be done simply at the root of the repo like so:

```sh
asdf install
```

Once elixir is available, all server dependencies are managed via docker-compose, and tests can be run via `mix`, like so:

```sh
make testup
mix test
```



