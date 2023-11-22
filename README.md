# Plural Console

![Console](assets/public/PluralConsole-background.png)

The Plural Console is the administrative hub of the plural platform.  It has a number of key features:

* Reception of over-the-air application updates
* Configurable, application-targeted observability
  - dashboards
  - logging
* Common incident management, including zoom integration and slash commands
* Interactive Runbooks

We strive to make it powerful enough to make you feel like any application you deploy using Plural has an operational profile comparable to a managed service, even without being one.

## Contributor Program

We are currently trying to aggregate compatibility and dependency information for many CNCF add-ons within the kubernetes ecosystem.  You can see some early examples in `static/compatibilities` and are hoping to get community support getting these built out and keeping them up-to-date.  We are focused on properly compensating any contributions to the Plural platform, which includes a bounty for either adding the compatibility info for a net-new application, or updating the information alongside a new version that has been released.  Currently the rewards are:

* $50 for adding compatibilities for a specific version of an application
* $150 for adding a new application and all to-date compatibility information

To be eligible for the upgrade bounty you'll need to submit a PR to this repo with the changes and a link to whatever documentation confirms the correctness of the information.  We'll then review and if it's correct and useful for the broader community, you'll be eligible for the reward once merged.

To claim the reward, you should get in touch with us on our discord at https://discord.gg/pluralsh and we'll simply need to confirm that you did the work (easy way to do that is linking your discord handle on the relevant PRs) and will give you the bounty you've earned.

## Development

Console's server side is written in Elixir, and exposes a graphql api. The frontend is in react, all code lives in this single repo and common development tasks can be done using the Makefile at the root of the repo.


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
mix local.hex
mix deps.get
mix test
```

### Troubleshooting
#### Installing Erlang 
If `asdf install` fails with `cannot find required auxiliary files: install-sh config.guess config.sub` then run:

```sh
brew install autoconf@2.69 && \
brew link --overwrite autoconf@2.69 && \
autoconf -V
```

For Mac Machines, if unable to download Erlang via `asdf` (this is very common, and it might be worthwhile to just get erlang from homebrew) then run:

```sh
brew install erlang@23
cp -r /opt/homebrew/opt/erlang@23/lib/erlang ~/.asdf/installs/erlang/23.3
asdf reshim erlang 23.3
```

You can also use the make target in our root Makefile to automate this, eg:

```sh
make reshim
```