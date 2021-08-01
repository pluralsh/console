defmodule Console.Plural.Context do
  import Console

  defstruct [:configuration, :bundles]

  defmodule Bundle, do: defstruct [:repository, :name]

  defp location(), do: Path.join([workspace(), "context.yaml"])

  def get() do
    location()
    |> YamlElixir.read_from_file()
    |> case do
      {:ok, %{"spec" => %{"configuration" => config} = spec}} ->
        {:ok, %__MODULE__{configuration: config, bundles: bundles(spec)}}
      _ -> {:error, :not_found}
    end
  end

  def merge(ctx, bundle) do
    with {:ok, %{configuration: config, bundles: bundles} = context} <- get() do
      updated = DeepMerge.deep_merge(config, ctx)
      write(%{context | configuration: updated, bundles: [bundle | bundles]})
    end
  end

  def write(%__MODULE__{bundles: bundles, configuration: conf} = context) do
    sanitized = %{
      apiVersion: "plural.sh/v1alpha1",
      kind: "Context",
      spec: %{
        bundles: Enum.map(bundles, &Map.from_struct/1),
        configuration: conf
      }
    }

    with {:ok, doc} <- Ymlr.document(sanitized),
         :ok <- File.write(location(), String.trim_leading(doc, "---\n")),
      do: {:ok, context}
  end

  defp bundles(%{"bundles" => bunds}) when is_list(bunds) do
    Enum.map(bunds, fn %{"repository" => r, "name" => n} ->
      %Bundle{repository: r, name: n}
    end)
  end
  defp bundles(_), do: []
end
