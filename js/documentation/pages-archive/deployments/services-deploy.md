---
title: Deploy Services
description: How to deploy imported Git repositories to clusters
---

## Deploy from the Browser

To deploy a service, navigate to the "Services" subtab in the "Continuous deployment" tab of Plural Console. Click the "Deploy service" button in the top right corner.

Fill in the service name and namespace for your deployment, and choose a target cluster. Choose a Git repository that you've connected to Console, and add the Git ref and folder.

Git ref should refer to the branch name, tag name, or commit that you want deployed (e.g., "main"). Git folder should be the path that includes your manifests within your repository.

Add any secrets to parameterize your deployment, then click "Deploy service".

You should see your service populate in the services table with a `Stale` status. The status will update once components are healthy.

## Deploy from the CLI

To deploy a service via the CLI, use the `plural cd services create` command. Provide the name, repo id, git reference, and git folder. Optionally provide the namespace, version, config name, and config filepath. As an example:

```
plural cd services create --name dummy-service --repo-id c518d0c3-1cfe-4a16-b66c-7de4c07d562d --git-ref main --git-folder /manifests
```

You can find the repo-id for your desired repository by running `plural cd repositories list`. If namespace is not specified, the 'default' will be used. If version is not specified, '0.0.1' will be used.

You should then see your service show up when calling `plural cd services list`.

## Create Using GitOps

We definitely recommend you read over our {% doclink to="using-operator" %}operator docs{% /doclink %} to see the various CRDs you can use to define your services and patterns available there. For most use cases this will be the most robust workflow.

## Create Using Terraform

There are some times where you'd still want to use terraform to create a service, a common pattern would be in bootstrapping the environment for a team or something similar.

```tf
data "plural_cluster" "byok_workload_cluster" {
  handle = "gcp-workload-cluster"
}

data "plural_git_repository" "cd-test" {
  url = "https://github.com/pluralsh/plrl-cd-test.git"
}

resource "plural_service_deployment" "cd-test" {
  # Required
  name      = "tf-cd-test"
  namespace = "tf-cd-test"

  cluster = {
    handle = data.plural_cluster.byok_workload_cluster.handle
  }

  repository = {
    id     = data.plural_git_repository.cd-test.id
    ref    = "main"
    folder = "kubernetes"
  }

  # Optional
  version = "0.0.2"
  docs_path = "doc"
  protect   = false

  configuration = [
    {
      name : "host"
      value : "tf-cd-test.gcp.plural.sh"
    },
    {
      name : "tag"
      value : "sha-4d01e86"
    }
  ]

  sync_config = {
    namespace_metadata = {
      annotations = {
        "testannotationkey" : "testannotationvalue"
      }
      labels = {
        "testlabelkey" : "testlabelvalue"
      }
    }
  }

  depends_on = [
    data.plural_cluster.byok_workload_cluster,
    data.plural_git_repository.cd-test
  ]
}
```

You can see some more examples [here](https://github.com/pluralsh/terraform-provider-plural/blob/main/example/service/)
