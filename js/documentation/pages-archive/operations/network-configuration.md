---
title: Network Configuration
---

In your infrastructure, Plural will create a VPC, a public ingress controller, and a private ingress controller. Sometimes your organization or project will want to change our networking defaults to better suit your deployment.

## VPC Subnet configuration

You’ll want to overwrite our default subnet configuration if you need to add the VPC that Plural creates to any adjacent VPCs/networks in your infrastructure.

Frequently, VPC peering APIs require all subnets to be non-overlapping, which isn't guaranteed from our defaults. This can always be updated in `bootstrap/terrraform/main.tf` (As a reference, CIDR blocks follow this format: `10.xx.xx.xx/yy`, the examples below are placeholders.)

{% tabs %}
{% tab title="AWS" %}
On AWS, update the `aws-bootstrap` modules configuration with:

```shell {% showHeader=false %}
public_subnets = ["your.cidr.pub.1", "your.cidr.pub.2", "your.cidr.pub.3"]
private_subnets = ["your.cidr.priv.1", "your.cidr.priv.2", "your.cidr.priv.3"]
worker_private_subnets = ["your.cidr.worker.1", "your.cidr.worker.2", "your.cidr.worker.3"]
```

{% /tab %}

{% tab title="GCP" %}
On GCP, update the `gcp-bootstrap` modules configuration with:

```shell {% showHeader=false %}
vpc_subnetwork_cidr_range = "your.cidr"

# you might also want to update cluster_secondary_range_cidr
# and services_secondary_range_cidr
```

{% /tab %}

{% tab title="Azure" %}
With Azure, update the `azure-bootstrap` modules configuration with:

```shell {% showHeader=false %}
address_space = "your.cidr"
subnet_prefixes = ["your.cidr.pref"]
```

{% /tab %}
{% /tabs %}

{% callout severity="warning" %}
Note that updating these will likely cause the VPC to be replaced, which will recreate your cluster. We recommend that you [destroy your cluster](/operations/uninstall) before applying network config modifications to it.
{% /callout %}

## Configuring VPC Peering

Plural creates a fresh VPC and Kubernetes cluster for deploying applications. This ensures that we have a clean environment to deploy into and minimizes disruption to existing systems. It does come with the tradeoff of slightly increased network complexity, but most cloud providers can bridge this using VPC peering. This is a technology that effectively allows you to combine the address spaces of two VPCs in the cloud you operate in.

**There is a caveat:** the VPCs should have no overlapping subnets in addition to some other complexities per cloud provider. Refer to the guide above on subnet configuration before proceeding.

Plural makes it easy to add additional Terraform to the stacks we generate. Effectively, as long as you don’t modify the `[main.tf](http://main.tf)` file at the root of a Terraform folder, or any of the module folders, we’ll preserve your Terraform between builds and apply it for you appropriately as changes arise. For configuring a VPC peer, let’s create a new Terraform file called `[network.tf](http://network.tf)` and drop the configuration in there for your respective cloud:

{% tabs %}
{% tab title="AWS" %}

```shell {% showHeader=false %}
resource "aws_vpc_peering_connection" "foo" {
   peer_owner_id = "my-owner-id" # Use appropriate values here.
   peer_vpc_id   = "peer-vpc-id"
   vpc_id        = module.aws-bootstrap.vpc.id
}
```

{% /tab %}

{% tab title="GCP" %}

```shell {% showHeader=false %}
data "google_compute_network" "peer" {
   name = "peer-network"
}

resource "google_compute_network_peering" "peering1" {
   name         = "plrl-peer"
   network      = module.gcp-bootstrap.vpc_network.self_link
   peer_network = data.google_compute_network.peer.self_link
}
```

{% /tab %}

{% tab title="Azure" %}

```shell {% showHeader=false %}
data "azure_rm_virtual_network" "peer" {
   resource_group_name = "your-azure-resource-group" # Use appropriate values here.
   name = "peer-network-name"
}

resource "azurerm_virtual_network_peering" "example-1" {
   name                      = "plrl-peer"
   resource_group_name       = "your-azure-resource-group"
   virtual_network_name      = module.azure-bootstrap.network.name
   remote_virtual_network_id = data.azurerm_virtual_network.peer.id
}
```

{% /tab %}
{% /tabs %}

{% callout severity="warning" %}
As mentioned earlier, consult the section on customizing subnets to ensure your vpc subnets don’t overlap when attempting to peer to existing networks.
{% /callout %}

## Adding an IP Allowlist to the Public Ingress Controller

Plural ships with two ingress controllers, both using the open-source [ingress-nginx](https://github.com/kubernetes/ingress-nginx) project. Some users might want to restrict what IPs the public ingress is available on. For example, this is required for locking it down to an office VPN. We can implement this by updating Kubernetes' `loadBalancerSourceRanges` attribute on `LoadBalancer` services. To configure this, head to your Plural repository and modify `ingress-nginx/helm/ingress-nginx/values.yaml` by overlaying:

```yaml
ingress-nginx:
  ingress-nginx:
    controller:
      service:
        loadBalancerSourceRanges:
          - cidr.1
          - cidr.2
        annotations:
          # this is only needed for aws
          service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: preserve_client_ip.enabled=true
```

Once that’s updated, run `plural deploy --commit "adding ip allowlist"` and it will update the service for you and push the changes upstream to your git repository.

_For many users this will be sufficient, but some may prefer the application not have a public network address at all. In this case, check out the next section on using our private ingress controller._

## Using our Private Ingress Controller

If you only want your application directly addressable on a private network via ingress, e.g. if simply allowlisting source IPs is not secure enough for you, you can rewire an application to use our internal ingress controller. In general, you need to do a little diving to find exactly how the application’s Helm chart configures its ingresses, and modify it to wire in the `internal-nginx` ingress class. Then run `plural deploy --commit "update app to use private ingress"` and it’ll apply for you.

Let's use Dagster as an example. To make Dagster only use the private ingress, apply this yaml on `dagster/helm/dagster/values.yaml`:

```yaml
dagster:
  dagster:
    ingress:
      annotations:
        kubernetes.io/ingress.class: 'internal-nginx'
```

Sometimes an application will require you to update an attribute called `ingressClass`. This will depend on whether the Helm chart is still using the legacy annotation-based ingress class flag or if it has migrated to the new first-class spec field.

We’ll also build out configuration overlays in our console in the “Configuration” tab to edit these, so you don’t have to scavenge for the exact yaml update to do this, although that’s still WIP.

{% callout severity="warning" %}
We’ve occasionally seen it take some time for the ingress controllers to swap classes. If you want to accelerate that, you can run `kubectl delete ingress <ingress-name> -n <app-name>` then `plural bounce <app-name>` to speed things along. You can usually find the ingresses in the components tab in our console.
{% /callout %}
