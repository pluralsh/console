defmodule Console.Plural.Workspace do
  import Console

  defstruct [:cluster, :bucket, :project, :provider, :region]

  defp location(), do: Path.join([workspace(), "workspace.yaml"])

  def get() do
    location()
    |> YamlElixir.read_from_file()
    |> case do
      {:ok, %{"spec" => workspace}} ->
        wkspace = %__MODULE__{
          cluster: workspace["cluster"],
          bucket: workspace["bucket"],
          project: workspace["project"],
          provider: workspace["provider"],
          region: workspace["region"]
        }
        {:ok, wkspace}
      _ -> {:error, :not_found}
    end
  end

  def provider() do
    case get() do
      {:ok, %{provider: "google"}} -> :gcp
      {:ok, %{provider: "aws"}} -> :aws
      {:ok, %{provider: "azure"}} -> :azure
      _ -> :baremetal
    end
  end
end
