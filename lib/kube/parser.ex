defmodule Kube.Parser do
  alias Kazan.Models.{PropertyDesc, ModelDesc}
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1

  defmacro parse(opts) do
    path = Keyword.get(opts, :path)
    overrides = Keyword.get(opts, :override, []) |> Map.new()
    module = Keyword.get(opts, :module) |> Macro.to_string() |> String.split(".") |> Module.concat()
    list_module = Module.concat(module, "List")

    {:ok, crd} = YamlElixir.read_from_file(path)
    {group, version, name, kind, spec} = metadata(crd)

    model = model(spec, module, overrides)
            |> add_metadata(%Kazan.Models.ResourceId{group: group, version: version, kind: kind})
    props = model_props(model.properties, kind, "#{group}/#{version}")
    submodels = submodels(model, module)
    model = prepare(model, module) |> Macro.escape()

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
        def gvk(), do: {unquote(group), unquote(version), unquote(name)}
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
    submodels = submodels(model, current_module)
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

  defp submodels(%ModelDesc{properties: props}, module) do
    for {_, {_, model}} <- props, do: submodel(model, module)
  end

  defp prepare(%ModelDesc{properties: props} = model, module) do
    props = Enum.into(props, %{}, fn
      {k, {%PropertyDesc{type: {:array, t}} = prop, _}} -> {k, %{prop | type: {:array, Module.concat(module, t)}}}
      {k, {%PropertyDesc{type: t} = prop, _}} -> {k, %{prop | type: Module.concat(module, t)}}
      {k, v} -> {k, v}
    end)
    %{model | properties: props, module_name: module}
  end

  defp add_metadata(%ModelDesc{properties: props} = model, resource_id) do
    props = Map.put(props, :metadata, %PropertyDesc{field: "metadata", type: MetaV1.ObjectMeta})
    put_in(model.properties, props)
    |> Map.put(:resource_ids, [resource_id])
  end

  def model(%{"properties" => props}, module, overrides) do
    %ModelDesc{
      module_name: module,
      properties: Enum.into(props, %{}, fn {n, d} -> {prop_name(n), prop(n, d, overrides)} end)
    }
  end

  defp model_props(%{kind: _} = props, kind, api_version) do
    other = Map.drop(props, ~w(kind api_version)a) |> Map.keys()
    other ++ [kind: kind, api_version: api_version]
  end

  defp prop(f, spec, overrides) when is_map(overrides) do
    case overrides do
      %{^f => name} -> %PropertyDesc{type: name, field: f}
      _ -> _prop(f, spec, overrides)
    end
  end

  defp _prop(f, %{"type" => t}, _) when t in ~w(string boolean integer number),
    do: %PropertyDesc{type: type(t), field: f}
  defp _prop(f, %{"type" => "object", "properties" => %{}} = model, ovr) do
    module = mod_name(f)
    {%PropertyDesc{type: module, field: f}, model(model, module, ovr)}
  end
  defp _prop(f, %{"type" => "array", "items" => %{"type" => "object", "properties" => %{}} = props}, ovr) do
    module = mod_name(f)
    {%PropertyDesc{type: {:array, module}, field: f}, model(props, module, ovr)}
  end
  defp _prop(f, %{"type" => "array", "items" => %{"type" => t}}, _),
    do: %PropertyDesc{type: {:array, type(t)}, field: f}
  defp _prop(f, _, _), do: %PropertyDesc{type: :object, field: f}

  defp type("string"), do: :string
  defp type("boolean"), do: :boolean
  defp type("integer"), do: :integer
  defp type("number"), do: :number
  defp type("object"), do: :object
  defp type("array"), do: :array

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
      "names" => %{"plural" => path, "kind" => kind},
      "versions" => [_ | _] = vsns
    }
  }) do
    %{"name" => v, "schema" => %{"openAPIV3Schema" => schema}} = List.last(vsns)
    {group, v, path, kind, schema}
  end
end
