defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.TransitionRecord do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,      :map, virtual: true
    field :table,     :string
    field :record_id, :string
    field :state,     :string
    field :fields,    :map, default: %{}
  end

  @json_schema Console.priv_file!("tools/workbench/integration/service_now/transition_record.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "service_now_#{name}_transition_record"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Move a ServiceNow ticket to another state using the #{name} connection. The target state is checked against list_states when ServiceNow reports them, and a rejection by ServiceNow (for example a missing close_code or close_notes when resolving an incident) is returned as is. Pass the fields the transition needs in fields."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:table, :record_id, :state, :fields])
    |> validate_required([:table, :record_id, :state])
    |> validate_inclusion(:table, Client.tables())
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, sys_id} <- Client.resolve_sys_id(client, model.table, model.record_id),
         {:ok, state} <- target_state(client, model, sys_id),
         {:ok, record} <- update(client, model, sys_id, state) do
      Jason.encode(%{"table" => model.table, "sysId" => sys_id, "state" => state, "record" => record["result"] || record})
    end
  end

  # Changes are checked against the states they can move to next. Anything that cannot be read
  # (no access to the choices, a response of an unknown shape) is not validated, ServiceNow decides.
  defp target_state(client, %{table: "change_request"} = model, sys_id) do
    choices = choices(client, model.table)

    allowed =
      case Client.change_get(client, "/change/#{Client.segment(sys_id)}/nextstates") do
        {:ok, next} -> next_states(next)
        {:error, _} -> []
      end

    case allowed do
      [] -> {:ok, resolve(choices, model.state)}
      allowed -> pick_next(allowed, choices, model.state)
    end
  end

  defp target_state(client, model, _) do
    case choices(client, model.table) do
      [] -> {:ok, model.state}
      choices ->
        case Client.match_state(choices, model.state) do
          {:ok, value} -> {:ok, value}
          :error -> invalid(model.state, Enum.map(choices, &describe/1))
        end
    end
  end

  defp pick_next(allowed, choices, state) do
    labelled = Enum.map(allowed, &label_from(&1, choices))

    case Client.match_state(labelled ++ choices, state) do
      {:ok, value} ->
        if Enum.any?(labelled, &(&1["value"] == value)), do: {:ok, value}, else: invalid(state, Enum.map(labelled, &describe/1))
      :error -> invalid(state, Enum.map(labelled, &describe/1))
    end
  end

  # a state without a label of its own takes the one from the table's choices
  defp label_from(%{"label" => label} = state, _) when is_binary(label) and label != "", do: state
  defp label_from(%{"value" => value} = state, choices) do
    %{state | "label" => Enum.find_value(choices, &(&1["value"] == value && &1["label"]))}
  end

  defp resolve(choices, state) do
    case Client.match_state(choices, state) do
      {:ok, value} -> value
      :error -> state
    end
  end

  defp choices(client, table) do
    case Client.state_choices(client, table) do
      {:ok, choices} -> choices
      {:error, _} -> []
    end
  end

  # The Change API reports the reachable states as `available_states` (raw values) with a
  # `state_label` map, and the transitions with their `to_state`. Anything else is ignored.
  defp next_states(%{"result" => %{} = result}) do
    labels = if is_map(result["state_label"]), do: result["state_label"], else: %{}

    (List.wrap(result["available_states"]) ++ Enum.map(List.wrap(result["state_transitions"]), &transition_state/1))
    |> Enum.flat_map(&state_value/1)
    |> Enum.uniq()
    |> Enum.map(&%{"value" => &1, "label" => label(labels[&1])})
  end
  defp next_states(_), do: []

  # transitions whose conditions are not met are listed too, but cannot be taken
  defp transition_state(%{"transition_available" => false}), do: nil
  defp transition_state(%{"to_state" => state}), do: state
  defp transition_state(_), do: nil

  defp label(label) when is_binary(label), do: label
  defp label(%{"display_value" => label}) when is_binary(label), do: label
  defp label(_), do: nil

  defp state_value(%{"value" => value}), do: state_value(value)
  defp state_value(value) when is_binary(value) and byte_size(value) > 0, do: [value]
  defp state_value(value) when is_integer(value), do: [Integer.to_string(value)]
  defp state_value(_), do: []

  defp describe(%{"value" => value, "label" => label}) when is_binary(label) and label != "", do: "#{value} (#{label})"
  defp describe(%{"value" => value}), do: value

  defp invalid(state, options) do
    {:error, "State #{inspect(state)} is not available for this ticket. Available states: #{Enum.join(Enum.uniq(options), ", ")}."}
  end

  defp update(client, %{table: "change_request"} = model, sys_id, state),
    do: Client.change_patch(client, "/change/#{Client.segment(sys_id)}", body(model, state))

  defp update(client, model, sys_id, state) do
    with {:ok, path} <- Client.table_path(model.table, sys_id),
         do: Client.patch(client, path, body(model, state), %{sysparm_exclude_reference_link: true})
  end

  defp body(model, state), do: Map.put(model.fields || %{}, "state", state)
end
