defmodule Console.Plural.Manifest do
  import Console

  defstruct [:network, :bucket_prefix, :cluster]

  defmodule Network do
    defstruct [:plural_dns, :subdomain]

    def new(map) when is_map(map) do
      %__MODULE__{
        plural_dns: map["pluraldns"] || map["pluralDns"],
        subdomain: map["subdomain"]
      }
    end
    def new(_), do: nil
  end

  defp location(), do: Path.join([workspace(), "workspace.yaml"])

  def get() do
    location()
    |> YamlElixir.read_from_file()
    |> case do
      {:ok, %{"spec" => spec}} ->
        {:ok, %__MODULE__{
          network: Network.new(spec["network"]),
          bucket_prefix: spec["bucketPrefix"],
          cluster: spec["cluster"],
        }}
      _ -> {:error, :not_found}
    end
  end
end
