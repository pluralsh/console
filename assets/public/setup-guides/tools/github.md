# GitHub workbench tool setup

This integration calls the GitHub REST API (repository, issue, and pull request tools). Authenticate with **either** a personal access token **or** a **GitHub App** installation.

## Shared fields

- **API URL** — Optional. Defaults to `https://api.github.com/`. For GitHub Enterprise Server, use your instance’s API root (for example `https://github.mycompany.com/api/v3/`).
- **Toolset** — Optional. Narrow which native tool groups are registered (repos, issues, pull requests, or all).

## Option A — Personal access token

1. In GitHub, open **Settings → Developer settings** and create a token (classic or fine-grained) with the scopes your workflows need (repo, issues, pull requests, etc.).
2. Paste the token into **Access token** on the tool form.

## Option B — GitHub App

Use the expandable **GitHub App authentication** section on the tool form.

### Creating your own app

1. In GitHub, go to **Settings → Developer settings → GitHub Apps** (organization settings if the app should belong to an org).
2. Click **New GitHub App** and configure:
   - **GitHub App name** and **Homepage URL** as required by GitHub.
   - **Webhook** — Disabled is fine unless you rely on GitHub sending events to Plural separately.
   - **Repository permissions** — Grant only what your workbench needs (Contents, Issues, Pull requests, Metadata, etc.).
   - **Where can this GitHub App be installed?** — Any account or only your organization, depending on policy.
3. After creation, note the numeric **App ID** at the top of the app settings page. Enter this in **App ID** on the workbench tool form.

### Installation ID

1. Install the app on your org or personal account (**Install App** from the app’s sidebar, or publish and install via the Marketplace flow you use internally).
2. Open the installation in the browser — the URL looks like  
   `https://github.com/settings/installations/12345678`  
   or for an organization:  
   `https://github.com/organizations/ORG/settings/installations/12345678`  
   The final path segment (`12345678`) is the **Installation ID**. Enter it on the form.

### Private key

1. On the GitHub App page, scroll to **Private keys** and generate a key (`*.pem` file).
2. Upload or paste that PEM file in **App private key (PEM)** on the tool form. The key is stored encrypted.

When editing an existing tool, leave **App private key** blank to keep the current key unless you are rotating it.

### Token vs App

Do not rely on supplying both simultaneously: if **App ID** is set, the integration uses GitHub App installation tokens first. Omit app fields if you intend to use **only** a personal access token.
