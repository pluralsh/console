---
title: Add A Cluster
description: How To Add An Existing Cluster to Your Plural Instance
---

Adding a new cluster to Plural is simple: it's a matter of installing our agent onto any end cluster, and usually follows one of two paths:

1. Leverage our CLI, which wraps a full install including registering with your Plural API and Helm-installing the agent on the cluster
2. Use our Terraform provider to wrap this whole process as Infrastructure as Code

Both are functional and fully supported, and execute equivalent code under the hood.  If you set up your install with `plural up` we've already wrapped a ton of fully functional GitOps workflows for you, and those usually are more featureful workflows than doing this manually.  If you want to read more about them, feel free to look at the guide here: [Create a Workload Cluster](/getting-started/how-to-use/workload-cluster).

{% callout severity="info" %}
We strongly recommend leveraging an IaC-based pattern, since it'll allow you to export Terraform state into Plural for re-use and maximizes reproducibility.
{% /callout %}


## Onboard a cluster with our CLI

To add a new cluster, run the following with a valid kubeconfig set up locally:

```sh
plural cd clusters bootstrap --name {your-cluster-name} --tag {tag}={value} --tag {tag2}={value2}
```

To see all CLI options, use:

```sh
plural cd clusters bootstrap --help
```

If you need to reinstall our agent for any reason, use:

```sh
plural cd clusters reinstall @{cluster-handle}
```

{% callout severity="info" %}
The `@` character is required, as it allows our CLI to differentiate names from IDs.

You should also address the cluster by handle in the event the name is not unique in your system.
{% /callout %}

## Onboard a cluster with our Terraform Provider

Here is a basic Terraform snippet that shows how you can use our Terraform provider to install our agent:

```terraform
resource "plural_cluster" "this" {
    handle = var.cluster
    name   = var.cluster
    tags   = {
        fleet = var.fleet
        tier = var.tier
    }

    # metadata attaching useful cluster-level state in Plural to use for service templating
    metadata = jsonencode({
        tier = var.tier
        iam = {
          load_balancer = module.addons.gitops_metadata.aws_load_balancer_controller_iam_role_arn
          cluster_autoscaler = module.addons.gitops_metadata.cluster_autoscaler_iam_role_arn
          external_dns = module.externaldns_irsa_role.iam_role_arn
          cert_manager = module.externaldns_irsa_role.iam_role_arn
        }

        vpc_id = local.vpc.vpc_id
        region = var.region
    })

    # direct kubeconfig for this cluster
    kubeconfig = {
      host                   = module.eks.cluster_endpoint
      cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
      token                  = data.aws_eks_cluster_auth.cluster.token
    }
}

# optionally can specify kubeconfig at the provider level

provider "plural" {
    kubeconfig = {
        host                   = module.eks.cluster_endpoint
        cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
        token                  = data.aws_eks_cluster_auth.cluster.token
    }
}
```

This makes it easy to wrap Plural setup in existing IaC codebases and ensure full repeatability.

The metadata block is also important, as it drives our Helm + YAML templating experience within Plural CD.  You can see some guides around that [here](/plural-features/continuous-deployment/service-templating).

## Next Steps

Once onboarded, you'll get a few main workflows connected to your cluster:

* GitOps Continuous Deployment - learn more [here](/plural-features/continuous-deployment)
* Kubernetes Dashboarding - learn more [here](/plural-features/kubernetes-dashboard)
* Plural AI - learn more [here](/plural-features/plural-ai)
* Plural Flows - learn more [here](/plural-features/flows)

If you want a robust, repeatable and scalable way to provision clusters, or other forms of cloud infrastructure, we definitely recommend looking into [Stacks](/plural-features/stacks-iac-management).

And if you want everything working out of the box, we'd recommend using `plural up` and going through the [How To Guide](/getting-started/how-to-use) we've constructed, which leverages a lot of the GitOps templates that are built into that experience.  This covers everything from:

1. Kubernetes Fleet Provisioning
2. Managing a runtime of Kubernetes add-ons
3. Deploying microservices to Kubernetes and managing them as Flows
