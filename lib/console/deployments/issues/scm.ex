defmodule Console.Deployments.Issues.Scm do
  alias Console.Deployments.Issues.Webhook.{
    AzureDevops,
    Bitbucket,
    BitbucketDatacenter,
    Github,
    Gitlab
  }

  @callback pull_request?(map) :: boolean
  @callback reference_urls(binary) :: [binary]

  def reference_urls(:azure_devops, payload, url) when is_map(payload) and is_binary(url),
    do: provider_reference_urls(AzureDevops, payload, url)
  def reference_urls(:bitbucket, payload, url) when is_map(payload) and is_binary(url),
    do: provider_reference_urls(Bitbucket, payload, url)
  def reference_urls(:bitbucket_datacenter, payload, url) when is_map(payload) and is_binary(url),
    do: provider_reference_urls(BitbucketDatacenter, payload, url)
  def reference_urls(:github, payload, url) when is_map(payload) and is_binary(url),
    do: provider_reference_urls(Github, payload, url)
  def reference_urls(:gitlab, payload, url) when is_map(payload) and is_binary(url),
    do: provider_reference_urls(Gitlab, payload, url)

  def reference_urls(_, _, _), do: []

  defp provider_reference_urls(implementation, payload, url) do
    if implementation.pull_request?(payload), do: implementation.reference_urls(url), else: []
  end

  def base_reference_url(url) when is_binary(url) do
    uri = URI.parse(url)
    URI.to_string(%{uri | query: nil, fragment: nil})
  end
end
