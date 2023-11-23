defmodule Console.Deployments.Helm.Repository do
  alias Kube.HelmRepository
  alias Console.Deployments.Helm.{Schema, Chart}

  @doc """
  Gets the current status of this repository object
  """
  @spec status(HelmRepository.t) :: {:ok, %{ready: boolean, message: binary}} | Console.error
  def status(%HelmRepository{status: %HelmRepository.Status{conditions: [_ | _] = conditions}}) do
    case Enum.find(conditions, & &1.type == "Ready") do
      %{status: status, message: message} -> {:ok, %{ready: status == "True", message: message}}
      _ -> {:ok, %{ready: false}}
    end
  end
  def status(_), do: {:ok, %{ready: false}}

  @doc """
  it will fetch the charts for a helm repository if they can be found
  """
  @spec charts(HelmRepository.t) :: {:ok, [%{name: binary, chart: Chart.t}]} | Console.error
  def charts(%HelmRepository{status: %HelmRepository.Status{
    artifact: %HelmRepository.Status.Artifact{url: url}
  }}) when is_binary(url) do
    with {:ok, %HTTPoison.Response{status_code: 200, body: body}} <- HTTPoison.get(url),
         {:ok, yaml} <- YamlElixir.read_from_string(body) do
      helm = %Schema{entries: yaml["entries"]}
      helm = Schema.transform(helm)
      {:ok, helm.entries}
    end
  end
  def charts(_), do: {:ok, []}
end
