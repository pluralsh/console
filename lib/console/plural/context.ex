defmodule Console.Plural.Context do
  import Console
  alias Console.Deployer

  defstruct [:configuration, :bundles, :smtp, :buckets, :domains, :protect]

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
      bundles: bundles(spec),
      domains: spec["domains"],
      buckets: spec["buckets"]
    }
  end

  def protected?(%__MODULE__{protect: [_ | _] = protect}, repo), do: Enum.member?(protect, repo)
  def protected?(_, _), do: false

  def get() do
    with {:ok, content} <- Deployer.file(location()),
         {:ok, %{"spec" => spec}} <- YamlElixir.read_from_string(content) do
      {:ok, new(spec)}
    else
      _ -> {:error, :not_found}
    end
  end

  def merge(ctx, new_bundles, buckets \\ [], domains \\ []) do
    with {:ok, %{configuration: config, bundles: bundles} = context} <- get() do
      updated = DeepMerge.deep_merge(config, ctx)
      %{context | configuration: updated, bundles: merge_list(new_bundles, bundles)}
      |> add_meta(buckets, domains)
      |> write()
    end
  end

  defp add_meta(%__MODULE__{buckets: buckets, domains: domains} = ctx, new_buckets, new_domains) do
    %{ctx | buckets: merge_list(buckets || [], new_buckets || []), domains: merge_list(domains || [], new_domains || [])}
  end

  defp merge_list(new, bundles) when is_list(new), do: Enum.uniq(new ++ bundles)
  defp merge_list(b, bundles), do: merge_list([b], bundles)

  def write(%__MODULE__{bundles: bundles, configuration: conf, smtp: smtp, domains: d, buckets: b} = context) do
    sanitized = %{
      apiVersion: "plural.sh/v1alpha1",
      kind: "Context",
      spec: %{
        bundles: Enum.map(bundles, &Map.from_struct/1),
        configuration: conf,
        smtp: Smtp.to_map(smtp),
        domains: d,
        buckets: b
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
