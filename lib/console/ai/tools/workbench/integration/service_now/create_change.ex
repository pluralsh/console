defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.CreateChange do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  @plans ~w(description implementation_plan backout_plan test_plan)a

  embedded_schema do
    field :tool,                :map, virtual: true
    field :type,                :string, default: "normal"
    field :model,               :string
    field :template_id,         :string
    field :short_description,   :string
    field :description,         :string
    field :implementation_plan, :string
    field :backout_plan,        :string
    field :test_plan,           :string
    field :fields,              :map, default: %{}
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/create_change.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_create_change"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Create a ServiceNow change request through the Change Management API using the #{name} connection. Pick the type (normal, emergency, standard) and optionally a change model. Include the implementation, backout and test plans for normal and emergency changes."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:type, :model, :template_id, :short_description, :fields | @plans])
    |> validate_required([:short_description, :type])
    |> validate_inclusion(:type, ~w(normal emergency standard))
    |> validate_template()
    |> validate_standard()
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, change} <- Client.change_post(client, path(model), body(model), query(model)) do
      Jason.encode(change)
    end
  end

  defp validate_template(changeset) do
    case {get_field(changeset, :type), get_field(changeset, :template_id)} do
      {"standard", id} when not nonempty_string(id) ->
        add_error(changeset, :template_id, "is required for standard changes")
      _ -> changeset
    end
  end

  # standard changes take their content from the template, so these cannot be set on them
  defp validate_standard(changeset) do
    case get_field(changeset, :type) do
      "standard" ->
        acc =
          Enum.reduce(@plans, changeset, fn key, acc ->
            case get_field(acc, key) do
              value when nonempty_string(value) -> add_error(acc, key, "cannot be set on a standard change")
              _ -> acc
            end
          end)

        extra = Map.keys(get_field(acc, :fields) || %{}) |> Enum.filter(&(&1 in Enum.map(@plans, fn p -> Atom.to_string(p) end)))

        cond do
          nonempty_string(get_field(acc, :model)) -> add_error(acc, :model, "cannot be set on a standard change, the template decides")
          extra != [] -> add_error(acc, :fields, "cannot set #{Enum.join(extra, ", ")} on a standard change")
          true -> acc
        end
      _ -> changeset
    end
  end

  defp path(%{type: "standard", template_id: id}), do: "/change/standard/#{Client.segment(id)}"
  defp path(%{model: model}) when nonempty_string(model), do: "/change"
  defp path(%{type: type}) when type in ~w(normal emergency), do: "/change/#{type}"

  # a model is only honored on the generic endpoint, which takes the type as a parameter
  defp query(%{type: "standard"}), do: %{}
  defp query(%{type: type, model: model}) when nonempty_string(model), do: %{type: type, chg_model: model}
  defp query(_), do: %{}

  defp body(model) do
    (model.fields || %{})
    |> Map.new()
    |> Map.put("short_description", model.short_description)
    |> put_plans(model)
  end

  defp put_plans(body, model) do
    Enum.reduce(@plans, body, fn key, acc ->
      case Map.get(model, key) do
        value when nonempty_string(value) -> Map.put(acc, Atom.to_string(key), value)
        _ -> acc
      end
    end)
  end
end
