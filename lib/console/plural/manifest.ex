defmodule Console.Plural.Manifest do
  import Console

  defstruct [:network]

  defmodule Network do
    defstruct [:plural_dns, :subdomain]

    def new(%{"pluralDns" => dns, "subdomain" => sub}) do
      %__MODULE__{plural_dns: dns, subdomain: sub}
    end
    def new(_), do: nil
  end

  defp location(), do: Path.join([workspace(), "workspace.yaml"])

  def get() do
    location()
    |> YamlElixir.read_from_file()
    |> case do
      {:ok, %{"spec" => spec}} ->
        {:ok, %__MODULE__{network: Network.new(spec["network"])}}
      _ -> {:error, :not_found}
    end
  end
end
