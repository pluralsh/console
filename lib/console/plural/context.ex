defmodule Console.Plural.Context do
  import Console
  alias Console.Deployer

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
    with {:ok, content} <- Deployer.file(location()),
         {:ok, %{"spec" => spec}} <- YamlElixir.read_from_string(content) do
      {:ok, new(spec)}
    else
      _ -> {:error, :not_found}
    end
  end

  def merge(ctx, new_bundles) do
    with {:ok, %{configuration: config, bundles: bundles} = context} <- get() do
      updated = DeepMerge.deep_merge(config, ctx)
      write(%{context | configuration: updated, bundles: merge_bundles(new_bundles, bundles)})
    end
  end

  defp merge_bundles([_ | _] = new, bundles), do: Enum.uniq(new ++ bundles)
  defp merge_bundles(b, bundles), do: merge_bundles([b], bundles)

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
