# Plural Console

![Console](assets/public/PluralConsole-background.png)

The Plural Console is the core control plane of the Plural fleet-management platform.  It has a number of key features:

* State management for Fleet-scale Continuous Deployment (CD), tying in with https://github.com/pluralsh/deployment-operator.  This includes a number of key concerns
  - maintaining sharded git caches on top of erlang processes
  - maintaining sharded helm repo caches like above
  - driving pipeline execution
  - driving observer execution
* Management of terraform/pulumi/general IaC execution, tying into the git management for CD
* Handling the Pull Request Automation APIs driving self-service workflows w/in Plural
* Notification Routing, allowing for fine grained notification delivery to slack/teams/email targeted by event or affected resource
* Handling core information gathering and querying for all AI-related functionality w/in Plural

It provides a low-maintainence, all-in-one solution for virtually any devops task that might be associated w/ managing Kubernetes infrastructure, in a package that can be hosted naturally anywhere, whether it be in your own cloud, or on our own infrastructure using Plural Cloud.

## Contributor Program

We are currently trying to aggregate compatibility and dependency information for many CNCF add-ons within the kubernetes ecosystem.  You can see some early examples in `static/compatibilities` and are hoping to get community support getting these built out and keeping them up-to-date.  We are focused on properly compensating any contributions to the Plural platform, which includes a bounty for either adding the compatibility info for a net-new application, or updating the information alongside a new version that has been released.  Currently the rewards are:

* $50 for adding compatibilities for a specific version of an application
* $150 for adding a new application and all to-date compatibility information
* $300 for a new compatibility scraper (these are all defined in `utils/compatibility/scrapers`)

To be eligible for the upgrade bounty you'll need to submit a PR to this repo with the changes and a link to whatever documentation confirms the correctness of the information.  We'll then review and if it's correct and useful for the broader community, you'll be eligible for the reward once merged.

It would also be great to ensure the compatibility is tested before submitting a review, that can be done by modifying the file at `lib/console/deployments/compatibilities/table.ex#11` to have the url var point to your fork/branch.  You should then be able to run `mix test` to confirm everything is correct (this does require setting up elixir on your laptop).

To claim the reward, you should get in touch with us on our discord at https://discord.gg/pluralsh and we'll simply need to confirm that you did the work (easy way to do that is linking your discord handle on the relevant PRs) and we'll give you the bounty you've earned.

## Development

There are three core components in this repo:

* server core - written in elixir, mainly exposing a graphql api
* react frontend - lives under `/assets` and is bundled in the elixir server docker image to make self-hosting simple
* `go/*` - a number of golang projects, the main one being `go/controller`, which manages the operator for defining all kubernetes CRDs that control the GitOps experience of using Plural.

### Developing Web
To begin developing the web app, install npm & yarn, then run:

```sh
cd assets
yarn install
yarn start:cd # or any other yarn target, we often test on different Console instances
```

### Developing Server
To make changes to the server codebase, you'll want to install elixir on your machine.  For Mac desktops, we do this via asdf, which can be done simply at the root of the repo like so:

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

### Git Hooks
Custom Git hooks are stored in `.githooks` directory. They ensure that when controller or client files are changed, automated code generation targets are executed. In order to enable git hooks for this repo run:
```sh
make install-git-hooks
```

### Troubleshooting
#### Installing Erlang 
If `asdf install` fails with `cannot find required auxiliary files: install-sh config.guess config.sub` then run:

```sh
brew install autoconf
autoconf -V
```

You can read more here: https://github.com/asdf-vm/asdf-erlang?tab=readme-ov-file#osx