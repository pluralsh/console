---
title: Sharing Existing Plural Installation Repos
---

Let's say that you have an existing Plural installation repo and you would like to share it with other users. A common scenario might be an individual developer playing around with Plural who would then like to expand Plural adoption across their team or company. Below, we show how to do this.

Let's say that **Alice** is the original user and already has a few applications installed in their own Plural installation repo. **Alice** would now like to share the repo with **Bob** and **Cory**, their teammates on the **machine learning infrastructure team**.

### 1. Bob and Cory Create Plural Accounts at [plural.sh](https://app.plural.sh)

### 2. Bob and Cory Install Plural CLI

The Plural CLI and dependencies are available using a package manager for your system. For Mac, we recommend using Homebrew, although our Docker image should be usable on virtually any platform.

{% tabs %}
{% tab title="Mac" %}

```
brew install pluralsh/plural/plural
```

The brew tap will install plural, alongside terraform, helm and kubectl for you. If you've already installed any of those dependencies, you can add `--without-helm`, `--without-terraform`, or `--without-kubectl`
{% /tab %}

{% tab title="curl" %}
You can also download any of our vendored binaries via curl:

```
curl -L -o plural.o 'https://app.plural.sh/artifacts/plural/plural?platform={{plat}}&arch={{arch}}'
chmod +x plural.o
mv plural.o /usr/local/bin/plural
```

replace `plat` and `arch` with any of:

| plat    | arch  |
| ------- | ----- |
| mac     | amd64 |
| mac     | arm64 |
| windows | amd64 |
| linux   | amd64 |

All binaries can also be viewed in the [artifacts tab](https://app.plural.sh/repositories/b4ea03b9-d51f-4934-b030-ff864b720df6/artifacts) of the plural repo on app.plural.sh. You can also find sha256 checksums for each there to guarantee file integrity

You will still need to ensure helm, terraform and kubectl are properly installed, you can find installers for each here.

| Tool      | Installer                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| helm      | [https://helm.sh/docs/intro/install/](https://helm.sh/docs/intro/install/)                                                 |
| terraform | [https://learn.hashicorp.com/tutorials/terraform/install-cli](https://learn.hashicorp.com/tutorials/terraform/install-cli) |
| kubectl   | [https://kubernetes.io/docs/tasks/tools/#kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)                         |

Once these are installed, you'll also need to add the helm push plugin like so:

```
helm plugin install https://github.com/pluralsh/helm-push
```

{% /tab %}

{% tab title="Docker" %}
We offer a docker image with the plural cli installed along with all cli dependencies: Terraform, Helm, kubectl, and all the major cloud CLIs: `gcr.io/pluralsh/plural-cli:0.1.1-cloud`. We also provide a decent configuration of zsh in it, so you can drive the entire plural workflow in an interactive session. The best strategy is probably to mount the config dir of the cloud provider you're using, like `\~/.aws`, in the `docker run` command:

```
docker run -it --volume $HOME/.aws:/root/aws \
               --volume $HOME/.plural:/root/.plural \
               --volume $HOME/.ssh:/root/.ssh \
    gcr.io/pluralsh/plural-cli:0.1.1-cloud zsh
```

{% /tab %}

{% tab title="EC2 AMI" %}
We have EC2 AMI's with Plural CLI installed, along with all cloud provider CLIs, Terraform, Helm and kubectl for those interested in creating a remote environment. A registry of the AMIs can be viewed [here](https://github.com/pluralsh/plural-cli/blob/master/packer/manifest.json):

If there's interest in images for GCP and Azure, please to give us a shout in our discord or feel free to open a GitHub issue.

[This doc](https://aws.amazon.com/premiumsupport/knowledge-center/launch-instance-custom-ami/) gives more details on launching AMIs if you are unfamiliar. You'll want to select "Public images" within the AMI search bar and you can use the AMI id embedded in the `artifact_id` in our manifests, eg `ami-0249247d5fc865089`. Be sure to choose the one for the appropriate region.
{% /tab %}
{% /tabs %}

The brew tap will install Plural, alongside Terraform, Helm and kubectl for you. If you've already installed any of those dependencies, you can add `--without-helm`, `--without-terraform`, or `--without-kubectl`

### 3. Alice creates a [Plural service account](/operations/auth-access-control/identity-and-installations/service-accounts)

Alice follows the instructions [here](/operations/auth-access-control/identity-and-installations/service-accounts) to create a Plural service account under the `ml-infra@plural.sh` email.

### 4. Alice copies down which bundles they have installed for later reference

Alice can find which bundles they have installed at [https://app.plural.sh/explore/installed](https://app.plural.sh/explore/installed)

![](/assets/advanced-topics/installed-bundles.png)

### 5. Alice changes the owner of the Plural installation repo

Alice goes to `workspace.yaml` in the root of their installation repo, and changes the owner to `ml-infra@plural.sh`. In the example below, owner is set to `nick@plural.sh` on line 12.

![](/assets/advanced-topics/code-block.png)

### 6. Alice initializes Plural as service account

Alice runs the following command from inside their Plural installation repo:

```
plural init --service-account ml-infra@plural.sh
```

This switches to the `ml-infra` service account user.

### 7. Alice registers all the bundles as the service account user

Now that Alice is using a different user, they need to re-register each installed application with the Plural API under the service account user. For each application, Alice should run:

```
plural bundle install <repo> <bundle>
```

To recall which applications they have installed, Alice should refer to the information they copied in step 4.

{% callout severity="info" %}
Service accounts need to be explicitly granted install permissions in your account before you can successfully run the bundle install command. Be sure to create a role [here](https://app.plural.sh/account/roles) with install permissions and add the service account to it to grant them access.
{% /callout %}

### 8. Alice builds and deploys the Plural installation repo under the new user

Alice should run:

```
plural build
plural deploy
```

Finally, Alice can push up these changes up to the installation repo on Github

```
git commit -m "Change owner of repo"
git push
```

{% callout severity="info" %}
If a user has oidc configured for an app, occasionally you'll need to manually delete the pods associated with their webservers as our oidc proxy does not respect config changes. This is just a matter of finding the relevant pods in the console and clicking the trash icon. For airbyte as an example, you'd want to delete all the pods in deployment/airbyte-webapp.

If you'd like help with this process feel free to reach out to us on discord as well!
{% /callout %}

### 9. Alice, Bob, and Cory set up cryptographic keys for sharing

The next step is sharing the repository's cryptography layer with any users you expect to need to use the repo locally. If you want to learn more about how Plural encrypts your repository's state, we'd definitely recommend you read our docs [here](/operations/security/secret-management)

Alice, Bob, and Cory should each run:

```
plural crypto setup-keys --name <key-name>
```

This causes each user to register a public key with Plural for sharing.

### 10. Alice encrypts encryption key for every user's keypair

Alice should now run:

```
plural crypto share --email bob@plural.sh cory@plural.sh
```

This will share the encryption key Alice has with Bob and Cory.

### 11. Bob and Cory download Plural installation repo from Github

Bob and Cory should now go to Github and download the Plural installation repos.&#x20;

```
git clone <plural-installation-repo>
```

### 12. Bob and Cory initialize Plural in their own workspaces as service account

Bob and Cory should initialize Plural as the service account

```
plural init --service-account ml-infra@plural.sh
```

### 13. Profit!

From this point on, any of Alice, Bob, or Cory can install, build, and deploy new applications and have it be reflected under the `ml-infra@plural.sh` service account. They should always remember to push up their changes in Git, and to pull down any new changes that their teammates may have made prior to making new installations.
