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
    choices = choices(client, model.table)next =
      case Client.change_get(client, "/change/#{Client.segment(sys_id)}/nextstates") do
        {:ok, next} -> next_states(next)
        {:error, _} -> :unknown
      end

    case next do
      :unknown -> {:ok, resolve(choices, model.state)}
      {allowed, blocked} -> pick_next(allowed, blocked, choices, model.state)
    end
  end

  defp target_state(client, model, _) do
    case choices(client, model.table) do
      [] -> {:ok, model.state}
      choices ->
        case Client.match_state(choices, model.state) do
          {:ok, value} -> {:ok, value}
          :error -> invalid(model.state, choices)
        end
    end
  end

  defp pick_next(allowed, blocked, choices, state) do
    allowed = Enum.map(allowed, &label_from(&1, choices))
    blocked = Enum.map(blocked, &label_from(&1, choices))

    case Client.match_state(allowed ++ blocked ++ choices, state) do
      {:ok, value} ->
        cond do
          Enum.any?(allowed, &(&1["value"] == value)) -> {:ok, value}
          Enum.any?(blocked, &(&1["value"] == value)) ->
            unmet = for %{"value" => ^value, "unmet" => unmet} <- blocked, name <- unmet, uniq: true, do: name
            blocked(state, unmet, allowed)
          true -> invalid(state, allowed)
        end
      :error -> invalid(state, allowed)
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

  # The Change API reports `state_transitions` as a list of lists (one per transition, each with
  # `from_state`, `to_state`, `transition_available` and the `conditions` it needs) and a
  # `state_label` map. `available_states` also lists the current state and states whose conditions
  # are not met, so it is only used when no transitions are reported (model-only states).
  # Returns `{allowed, blocked}`, or `:unknown` when the response has no states at all.
  defp next_states(%{"result" => %{} = result}) do
    labels = if is_map(result["state_label"]), do: result["state_label"], else: %{}

    case transitions(result["state_transitions"]) do
      [] -> available_states(result["available_states"], labels)
      transitions ->
        {open, blocked} = Enum.split_with(transitions, &transition_available?/1)
        {Enum.map(open, &transition_state(&1, labels)), Enum.map(blocked, &transition_state(&1, labels))}
    end
  end
  defp next_states(_), do: :unknown

  defp available_states(states, labels) do
    case states |> List.wrap() |> Enum.flat_map(&state_value/1) |> Enum.uniq() do
      [] -> :unknown
      values -> {Enum.map(values, &%{"value" => &1, "label" => label(labels[&1])}), []}
    end
  end

  defp transitions(transitions) when is_list(transitions) do
    transitions
    |> List.flatten()
    |> Enum.filter(&(is_map(&1) and state_value(&1["to_state"]) != []))
  end
  defp transitions(_), do: []

  # transitions whose conditions are not met are listed too, but cannot be taken
  defp transition_available?(%{"transition_available" => available}), do: available not in [false, "false"]
  defp transition_available?(_), do: true

  defp transition_state(%{"to_state" => state} = transition, labels) do
    [value] = state_value(state)
    %{"value" => value, "label" => label(labels[value]), "unmet" => unmet_conditions(transition)}
  end

  defp unmet_conditions(%{"conditions" => conditions}) when is_list(conditions) do
    for %{"passed" => passed, "condition" => %{"name" => name}} <- conditions, passed in [false, "false"], is_binary(name), do: name
  end
  defp unmet_conditions(_), do: []

  defp label(label) when is_binary(label), do: label
  defp label(%{"display_value" => label}) when is_binary(label), do: label
  defp label(_), do: nil

  defp state_value(%{"value" => value}), do: state_value(value)
  defp state_value(value) when is_binary(value) and byte_size(value) > 0, do: [value]
  defp state_value(value) when is_integer(value), do: [Integer.to_string(value)]
  defp state_value(_), do: []

  defp describe(%{"value" => value, "label" => label}) when is_binary(label) and label != "", do: "#{value} (#{label})"
  defp describe(%{"value" => value}), do: value

  defp invalid(state, []), do: {:error, "State #{inspect(state)} is not available for this ticket. No state can be reached right now."}
  defp invalid(state, options) do
    {:error, "State #{inspect(state)} is not available for this ticket. Available states: #{options |> Enum.map(&describe/1) |> Enum.uniq() |> Enum.join(", ")}."}
  end

  defp blocked(state, unmet, allowed) do
    reason = if unmet == [], do: "its conditions are not met", else: "unmet conditions: #{Enum.join(unmet, ", ")}"
    {:error, "State #{inspect(state)} cannot be reached right now, #{reason}. " <> available(allowed)}
  end

  defp available([]), do: "No other state can be reached right now."
  defp available(allowed), do: "Available states: #{allowed |> Enum.map(&describe/1) |> Enum.uniq() |> Enum.join(", ")}."

  defp update(client, %{table: "change_request"} = model, sys_id, state),
    do: Client.change_patch(client, "/change/#{Client.segment(sys_id)}", body(model, state))

  defp update(client, model, sys_id, state) do
    with {:ok, path} <- Client.table_path(model.table, sys_id),
         do: Client.patch(client, path, body(model, state), %{sysparm_exclude_reference_link: true})
  end

  defp body(model, state), do: Map.put(model.fields || %{}, "state", state)
end
