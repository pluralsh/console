defmodule Console.Plural.Context do
  import Console

  defstruct [:configuration, :bundles, :smtp]

  defmodule Smtp do
    defstruct [:user, :password, :server, :port, :sender]

    def new(%{} = map) do
      %__MODULE__{
        user: map["user"],
        password: map["password"],
        server: map["server"],
        port: map["port"],
        sender: map["sender"],
      }
    end
    def new(_), do: nil

    def to_map(%__MODULE__{} = smtp), do: Map.from_struct(smtp)
    def to_map(v), do: v
  end

  defmodule Bundle, do: defstruct [:repository, :name]

  defp location(), do: Path.join([workspace(), "context.yaml"])

  def new(%{"configuration" => config} = spec) do
    %__MODULE__{
      configuration: config,
      smtp: Smtp.new(spec["smtp"]),
      bundles: bundles(spec)
    }
  end

  def get() do
    location()
    |> YamlElixir.read_from_file()
    |> case do
      {:ok, %{"spec" => spec}} -> {:ok, new(spec)}
      _ -> {:error, :not_found}
    end
  end

  def merge(ctx, bundle) do
    with {:ok, %{configuration: config, bundles: bundles} = context} <- get() do
      updated = DeepMerge.deep_merge(config, ctx)
      write(%{context | configuration: updated, bundles: Enum.uniq([bundle | bundles])})
    end
  end

  def write(%__MODULE__{bundles: bundles, configuration: conf, smtp: smtp} = context) do
    sanitized = %{
      apiVersion: "plural.sh/v1alpha1",
      kind: "Context",
      spec: %{
        bundles: Enum.map(bundles, &Map.from_struct/1),
        configuration: conf,
        smtp: Smtp.to_map(smtp)
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
