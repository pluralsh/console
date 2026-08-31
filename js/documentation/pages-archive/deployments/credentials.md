---
title: Create Provider Credentials
description: Set Up a New Cloud Provider
---

## Create In-Browser

When you set up your cluster with Plural, we'll initialize the cluster with a bootstrap CAPI provider. This will look something like:

![](/assets/deployments/cluster-providers.png)

You'll be able to use that out-of-the-box to create new clusters in the same cloud as you might like. If you'd want to add a new cloud, you'll want to click the `Create Provider` button, then enter the credentials needed for the CAPI provider to authorize:

![](/assets/deployments/create-provider.png)

Once created, you'll be able to see a new service named `capi-{cloud}` in your management cluster which is the kubernetes controller and other resources needed to spawn that provider. When the service is fully healthy new clusters will be able to be created.

## Create using Terraform

```tf
resource "plural_provider" "aws_provider" {
  name = "aws"
  cloud = "aws"
  cloud_settings = {
    aws = {
      # access_key_id = "" # Required, can be sourced from PLURAL_AWS_ACCESS_KEY_ID
      # secret_access_key = "" # Required, can be sourced from PLURAL_AWS_SECRET_ACCESS_KEY
    }
  }
}
```

You can find some more examples at https://github.com/pluralsh/terraform-provider-plural/blob/main/example
