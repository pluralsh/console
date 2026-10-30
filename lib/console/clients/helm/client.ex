defmodule Console.Helm.Client do
  alias Console.Schema.HelmRepository
  alias Console.Helm.{Interface, Interface.HTTP, Interface.OCI}

  def client(%HelmRepository{url: "oci://" <> _} = repo), do: OCI.client(repo)
  def client(%HelmRepository{} = repo), do: HTTP.client(repo)

  def index(client, prev \\ nil), do: Interface.index(client, prev)

  defdelegate chart(client, idx, chart, vsn), to: Interface

  defdelegate download(client, url, to), to: Interface
end
