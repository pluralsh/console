---
title: Creating a DNS Zone in Console
---

{% tabs %}
{% tab title="AWS Route53" %}

1. Sign in to the AWS Management Console and open the Route 53 console at [https://console.aws.amazon.com/route53/](https://console.aws.amazon.com/route53/).
2. If you're new to Route 53, choose **Get started** under **DNS management**, and then choose **Create hosted zones**.

   If you're already using Route 53, choose **Hosted zones** in the navigation pane, and then choose **Create hosted zones**.

3. In the **Create hosted zone** pane, enter a newly registered domain (eg `pluraldemo.com`), or a subdomain (eg, `plural.pinterest.com` ).
4. For **Type**, accept the default value of **Public hosted zone**.
5. Choose **Create hosted zone**.
6. Now in the navigation pane, click **Hosted zones**. On the **Hosted zones** page, choose the radio button (not the name) for the hosted zone, then choose **View details**.
7. On the details page for the hosted zone, choose **Hosted zone details**. Make note of the four servers listed for **Name servers**. You will need these records to proceed with Step 3.

{% /tab %}

{% tab title="Google Cloud DNS" %}

1. In your Google Cloud Console, go to your Plural project and [enable the Cloud DNS API](https://console.cloud.google.com/flows/enableapi?apiid=dns&_ga=2.143906805.1313565175.1629139974-335821397.1624570886).
2. In your Google Cloud Console, go to the **Create a DNS zone** page.

   [Go to Create a DNS zone](https://console.cloud.google.com/networking/dns/zones/~new)

3. For the **Zone type**, select **Public**.
4. For the **Zone name**, enter an appropriate string.
5. For the **DNS name**, enter a DNS name for the zone , enter a newly registered domain (eg `pluraldemo.com`), or a subdomain (eg, `plural.pinterest.com` ).
6. Under **DNSSEC**, ensure that the `Off` setting is selected.
7. Click **Create** to create a zone populated with the NS and SOA records.
8. On the **Zone details** page, retrieve the **Name server (NS)** records. You need these records to proceed with Step 3.

![](</assets/Screen Shot 2021-08-18 at 12.39.37 PM.png>)

####

{% /tab %}

{% tab title="Azure DNS" %}

1. In your Azure console, at upper left, select **Create a resource**, then **Networking**, and then **DNS zone**.
2. On the **Create DNS zone** page, type or select the following values:
   - **Name**: The DNS zone name can be any value that is not already configured on the Azure DNS servers. A real-world value would be a newly registered domain (eg `pluraldemo.com`), or a subdomain (eg, `plural.pinterest.com` ).
   - **Resource group**: Select **Create new**, enter _MyResourceGroup_, and select **OK**. The resource group name must be unique within the Azure subscription.
3. Select **Create**.
4. With the DNS zone created, in the Azure portal **Favorites** pane, select **All resources**. On the **All resources** page, select your DNS zone. If the subscription you've selected already has several resources in it, you can enter your domain name in the **Filter by name** box to easily access the application gateway.
5. Retrieve the name servers from the DNS zone page. In this example, the zone `contoso.net` has been assigned name servers `ns1-01.azure-dns.com`, `ns2-01.azure-dns.net`, \*`ns3-01.azure-dns.org`, and `ns4-01.azure-dns.info`

![](https://docs.microsoft.com/en-us/azure/dns/media/dns-delegate-domain-azure-dns/viewzonens500.png 'List of name servers')
{% /tab %}
{% /tabs %}
