---
title: Docker registry
description: Inspect Docker and OCI registries from a workbench
---

The Docker tool gives a workbench agent read-only access to a Docker or OCI container registry, such as Docker Hub, GitHub Container Registry, Amazon ECR Public, or a private registry. The agent can list and search the tags in a repository, find the latest released versions of an image, and fetch an image manifest. Use it to answer questions such as which version of an image is newest, whether a tag exists, or which platforms a multi-architecture image supports.

In Console, this integration appears as the **Docker / OCI registry** card. For the complete list of integrations and general tool behavior, see [Workbench tools](/plural-features/workbenches/integrations/tools).

## Prerequisites

Before you begin, make sure you have:

* A registry that Plural Console can reach over HTTPS on the standard port and that implements the [OCI Distribution API](https://github.com/opencontainers/distribution-spec/blob/main/spec.md), the same API that `docker pull` uses.
* Read credentials for the registry, unless the repositories you want to inspect allow anonymous reads.
* Permission in Plural Console to create a configured tool and edit the target workbench.
* An existing workbench, or permission to create one. See [Setting up a workbench](/plural-features/workbenches/configuration).

### Prepare credentials

Public repositories on Docker Hub, GitHub Container Registry, Amazon ECR Public, and similar registries need no credentials. For private repositories, create a dedicated credential with read-only access to only the repositories the workbench needs:

* **Docker Hub** — create a [Docker Hub access token](https://docs.docker.com/security/access-tokens/) with read-only repository access. Use it as the password together with your Docker Hub username in **Basic auth**. An organization access token can be limited to specific repositories.
* **GitHub Container Registry** — create a [personal access token (classic)](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-with-a-personal-access-token-classic) with the `read:packages` scope. GitHub Packages accepts only classic tokens. Use it as the password together with your GitHub username in **Basic auth**.
* **Other registries** — use a username and password or token that the registry accepts for `docker login`, or a pre-issued bearer token with read access.

## Capabilities

The Docker tool is read-only. It cannot push, retag, or delete images. Each configured tool gives the agent three operations. The agent sees each one as `docker_<tool name>_<operation>`, where `<tool name>` is the configured tool's name:

| Operation | What it does |
|---|---|
| `search_tags` | Lists one page of tags in a repository, optionally filtered by a case-insensitive substring, and returns a cursor for the next page. |
| `latest_tags` | Lists every tag in a repository and returns the highest [semantic versions](https://semver.org), sorted from highest to lowest. |
| `fetch_manifest` | Fetches the manifest for a tag or digest. |

Every operation takes a repository slug within the configured registry, such as `library/nginx`, `pluralsh/console`, or `my-team/my-image`. You fix the registry when you configure the tool, so the agent can only reach repositories on that registry.

## Create the Docker tool

1. In Plural Console, open **Workbenches → Integrations**.
2. Find the **Docker / OCI registry** card and click **Add tool**.

### Configure the connection

On the **Configuration** step, enter:

* **Name** — the tool name, such as `dockerhub`. It must start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores. It becomes part of each operation name the agent sees.
* **Registry URL** — optional. The registry host, such as `registry-1.docker.io` for Docker Hub, `ghcr.io` for GitHub Container Registry, `public.ecr.aws` for Amazon ECR Public, or `registry.example.com` for a private registry. Leave it empty to use Docker Hub. A URL scheme and a trailing slash are ignored, so `https://ghcr.io/` also works.
* **Authentication** — one of:
  * **None / public registry** — for public repositories and registries that allow anonymous reads.
  * **Basic auth** — enter **Username** and **Password / token**. Use this for Docker Hub, GitHub Container Registry, and other registries that accept a username with a password or access token.
  * **Bearer token** — enter a pre-issued registry token with read access in **Bearer token**.
* **HTTP proxy (optional)** — expand this section if Console must reach the registry through an HTTP proxy. Enter **Proxy URL**, such as `http://proxy.example.com:8080`, and optionally **No proxy** as a comma-separated list of hosts or domains that bypass the proxy, such as `localhost,127.0.0.1,.svc,.cluster.local`.

Click **Next**.

{% callout severity="warning" %}
Treat the password and bearer token as secrets. Plural stores them encrypted. When you edit the tool, leave the secret field blank to keep the stored value unless you are rotating it. Never include credential values in screenshots, workbench prompts, or job output.
{% /callout %}

### Configure access

On the **Access policy** step, add the users or groups that should have read or write access to this configured tool:

* **Read permissions** control who can access and attach the tool to a workbench.
* **Write permissions** control who can modify the tool configuration and access policy.

Click **Save**. After the creation confirmation appears, the tool is available under **Workbenches → Configured Tools**.

## Attach the Docker tool to a workbench

You can attach the tool while creating a workbench or add it to an existing one.

### New workbench

On the final **Attach tools** step of the workbench wizard:

1. Click **Add tools**.
2. Select the Docker tool by its configured name.
3. Complete the wizard by clicking **Create workbench**.

### Existing workbench

1. Open the workbench.
2. In the left sidebar, find **Tools** and click **Add tools**. You can also open the overflow menu and select **Tools**.
3. In **Add or remove tool from workbench**, select the Docker tool.
4. Click **Save**.

The configured Docker tool now appears in the workbench's **Tools** section.

## Use the tool from a workbench

Open the workbench's **Launch** tab and describe the task in the prompt box. Name the repository with its full slug, such as `library/nginx` rather than `nginx` for Docker Hub official images, and say whether you want the newest versions, a specific tag, or manifest details.

Try prompts such as:

* `Using the dockerhub tool, find the five latest stable versions of library/nginx.`
* `Find the latest alpine variants of library/nginx and compare them with the version our ingress service currently runs.`
* `Check whether the tag 1.27.3 exists for library/nginx and list the platforms its manifest supports.`
* `Fetch the manifest for pluralsh/console:latest and report its digest, media type, and total layer size.`

Submit the job and watch its activity stream. To verify the integration, open a Docker tool activity and check that the call returned tags or a manifest. For more about job output, see [Running workbench jobs](/plural-features/workbenches/running-jobs).

## Query behavior and limits

* **Tag search is one page at a time.** `search_tags` requests 100 tags by default and up to 1,000 per call. The substring filter is applied after the page is fetched, so a page can contain no matches while more pages remain. The agent follows the returned cursor to search further.
* **Registry order is not version order.** Registries return tags in their own order, usually lexical, so `1.10.0` can appear before `1.9.0`. Ask for the latest versions so the agent uses `latest_tags` instead of paging and sorting by hand.
* **Latest versions scan the whole repository.** `latest_tags` lists every tag before ranking, which can take many registry requests for a large repository. It scans at most 50,000 tags and reports when it stopped early. It returns 10 versions by default and up to 100.
* **Version ranking.** Tags such as `1.2`, `1.10.0`, and `v1.10.1` are ranked by semantic version, and tags that are not versions, such as `latest` or `alpine`, are ignored. Tags with a suffix, such as `1.10.0-rc.1` or image variants like `1.27.0-alpine`, are excluded unless prereleases are included. To rank a variant, ask for that variant explicitly, for example the latest `alpine` tags.
* **Manifest contents.** `fetch_manifest` returns the manifest's schema version and media type. For a single-platform image it returns the config reference, annotations, and the digest, media type, and size of each layer. For a multi-architecture image it returns the digest, media type, size, and platform of each entry in the index. Plural does not download the image configuration or layers, so labels, environment variables, and file contents are not available.
* **Rate limits.** If the registry responds with `429`, Plural retries the request up to three times before reporting the error.

## Troubleshooting

### Authentication errors

* An `OCI error status=401` or `could not resolve authentication` error means the registry rejected the credentials or the repository requires them. Confirm the **Authentication** mode, username, and password or token, and that the credential can read the repository.
* **Basic auth** works with registries that issue a `Bearer` challenge and a token service, which is the standard flow for `docker login`. Plural exchanges the username and password for a short-lived token. A registry that only accepts HTTP Basic credentials on every request is not supported.
* For GitHub Container Registry, use a classic personal access token with `read:packages`. Fine-grained tokens are not accepted.
* To rotate a credential, open **Workbenches → Configured Tools**, select **Edit configuration**, and enter the replacement secret.

### The repository or tag is not found

* For Docker Hub official images, include the `library/` prefix, for example `library/nginx`.
* Confirm that the repository slug does not repeat the registry host. With **Registry URL** set to `ghcr.io`, use `my-org/my-image`, not `ghcr.io/my-org/my-image`.
* For `fetch_manifest`, confirm that the tag exists with `search_tags`, or pass a digest such as `sha256:...`.

### The request fails or times out

* Confirm that the registry is reachable over HTTPS from where Plural Console runs, including DNS, firewalls, and TLS certificates. Plural always connects with HTTPS.
* Serve the registry on the standard HTTPS port and enter its host without a port. A registry URL with a port, such as `registry.example.com:5000`, is not supported.
* Use a fully qualified registry host that contains a dot, such as `registry.example.com`. A single-label host such as `registry` is treated as part of a Docker Hub repository path.
* If Console must use a proxy, set **Proxy URL**, and make sure the registry and its token service are not listed in **No proxy**.

### The Docker tool is unavailable

* Confirm that the tool appears under **Workbenches → Configured Tools**.
* Verify that your user or group has read access to the configured tool.
* Reopen the workbench's **Tools** dialog and confirm that the Docker tool is selected.

## Related

* [Workbench tools](/plural-features/workbenches/integrations/tools)
* [Running workbench jobs](/plural-features/workbenches/running-jobs)
