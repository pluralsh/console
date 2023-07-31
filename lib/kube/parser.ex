defmodule Kube.Parser do
  alias Kazan.Models.{PropertyDesc, ModelDesc}
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1

  defmacro parse(opts) do
    path = Keyword.get(opts, :path)
    module = Keyword.get(opts, :module)
    overrides = Keyword.get(opts, :override, []) |> Map.new()
    {:ok, crd} = YamlElixir.read_from_file(path)
    {group, version, kind, spec} = metadata(crd)
    resource_id = %Kazan.Models.ResourceId{group: group, version: version, kind: kind}
    module = Macro.to_string(module) |> String.split(".") |> Module.concat()

    model = model(spec, module, overrides) |> add_metadata()
    props = Map.keys(model.properties)
    submodels = submodels(model) |> Enum.map(&submodel(&1, module))

    model = prepare(model, module)
            |> Map.put(:resource_ids, [resource_id])
            |> Macro.escape()

    list_module = Module.concat(module, "List")

    quote do
      defmodule unquote(module) do
        @behaviour Kazan.Model

        defstruct unquote(props)

        @impl Kazan.Model
        def decode(data), do: Kazan.Models.decode(data, __MODULE__)

        @impl Kazan.Model
        def encode(data), do: Kazan.Models.encode(data)

        defoverridable Kazan.Model

        @impl Kazan.Model
        def model_desc() do
          unquote(model)
        end

        @doc """
        The kubernetes group, version, kind tuple.  Useful for making api requests and constructing resource
        metadata.
        """
        @spec gvk() :: {binary, binary, binary}
        def gvk(), do: {unquote(group), unquote(version), unquote(kind)}
      end

      defmodule unquote(list_module) do
        use Kazan.Model

        def item_model(), do: unquote(module)

        defmodellist unquote(kind), unquote(group), unquote(version), unquote(module)
      end

      unquote(submodels)
    end
  end

  def submodel(%ModelDesc{module_name: mod, properties: props} = model, module) do
    current_module = Module.concat(module, mod)
    submodels = submodels(model) |> Enum.map(&submodel(&1, current_module))
    model = prepare(model, current_module) |> Macro.escape()
    props = Map.keys(props)

    quote do
      defmodule unquote(current_module) do
        @behaviour Kazan.Model

        defstruct unquote(props)

        @impl Kazan.Model
        def decode(data), do: Kazan.Models.decode(data, __MODULE__)

        @impl Kazan.Model
        def encode(data), do: Kazan.Models.encode(data)

        @impl Kazan.Model
        def model_desc() do
          unquote(model)
        end

        defoverridable Kazan.Model
      end

      unquote(submodels)
    end
  end

  defp submodels(%ModelDesc{properties: props}) do
    for {_, {_, model}} <- props, do: model
  end

  defp prepare(%ModelDesc{properties: props} = model, submodule) do
    props = Enum.into(props, %{}, fn
      {k, {prop, _}} -> {k, fixup(prop, submodule)}
      {k, v} -> {k, v}
    end)
    %{model | properties: props, module_name: submodule}
  end

  defp fixup(%PropertyDesc{type: {:array, t}} = prop, submodule), do: %{prop | type: {:array, Module.concat(submodule, t)}}
  defp fixup(%PropertyDesc{type: t} = prop, submodule), do: %{prop | type: Module.concat(submodule, t)}

  defp prop(f, spec, overrides) when is_map(overrides) do
    case overrides do
      %{^f => name} -> %PropertyDesc{type: name, field: f}
      _ -> prop(f, spec, {:pass, overrides})
    end
  end
  defp prop(f, %{"type" => t}, _) when t in ~w(string boolean integer number),
    do: %PropertyDesc{type: type(t), field: f}
  defp prop(f, %{"type" => "object", "properties" => %{}} = model, {:pass, ovr}) do
    module = mod_name(f)
    {%PropertyDesc{type: module, field: f}, model(model, module, ovr)}
  end
  defp prop(f, %{"type" => "array", "items" => %{"type" => "object", "properties" => %{}} = props}, {:pass, ovr}) do
    module = mod_name(f)
    {%PropertyDesc{type: {:array, module}, field: f}, model(props, module, ovr)}
  end
  defp prop(f, %{"type" => "array", "items" => %{"type" => t}}, _),
    do: %PropertyDesc{type: {:array, type(t)}, field: f}
  defp prop(f, _, _), do: %PropertyDesc{type: :object, field: f}

  defp add_metadata(%ModelDesc{properties: props} = model) do
    props = Map.put(props, :metadata, %PropertyDesc{field: "metadata", type: MetaV1.ObjectMeta})
    %{model | properties: props}
  end

  defp type("string"), do: :string
  defp type("boolean"), do: :boolean
  defp type("integer"), do: :integer
  defp type("number"), do: :number
  defp type("object"), do: :object
  defp type("array"), do: :array

  def model(%{"properties" => props}, module, overrides) do
    %ModelDesc{
      module_name: module,
      properties: Enum.into(props, %{}, fn {n, d} -> {prop_name(n), prop(n, d, overrides)} end)
    }
  end

  defp mod_name(n) do
    Macro.underscore(n)
    |> Macro.camelize()
    |> String.to_atom()
  end

  defp prop_name(key) do
    Macro.underscore(key)
    |> String.to_atom()
  end

  defp metadata(%{
    "spec" => %{
      "group" => group,
      "names" => %{"plural" => k},
      "versions" => [%{"name" => v, "schema" => %{"openAPIV3Schema" => schema}} | _]
    }
  }) do
    {group, v, k, schema}
  end
end
