defmodule Console.Deployments.Issues.Webhook.ServiceNow do
  @moduledoc """
  Handles ServiceNow webhook payloads.

  ServiceNow has no native outbound webhook, so payloads come from a Business Rule
  that posts the record as JSON (see the ServiceNow webhook setup guide). The
  expected shape is a flat record:

      {"table": "incident", "instance_url": "https://example.service-now.com",
       "sys_id": "...", "number": "INC0010001", "short_description": "...",
       "description": "...", "state": "2"}

  A `{"result": {...}}` wrapper (as returned by the Table API) is also accepted, and
  any field may be a `{"display_value": ..., "value": ...}` pair. Only the ticket
  tables in `tables/0` are handled, anything else is ignored.

  Call `record/1` first and pass its result to the provider callbacks.
  """
  @behaviour Console.Deployments.Issues.Provider

  @tables ~w(incident change_request problem sc_task)

  @spec tables() :: [binary]
  def tables, do: @tables

  @doc """
  Normalizes a webhook payload into a flat record with raw values, keeping display
  values under `"display"`. Returns an error for unsupported tables.
  """
  @spec record(map) :: {:ok, map} | {:error, binary}
  def record(%{"result" => %{} = result} = payload),
    do: record(Map.merge(Map.delete(payload, "result"), result))
  def record(%{} = payload) do
    rec = Map.new(payload, fn {k, v} -> {k, raw(v)} end)
    display = Map.new(payload, fn {k, v} -> {k, display(v)} end)

    case table(rec) do
      t when t in @tables -> {:ok, Map.merge(rec, %{"table" => t, "display" => display})}
      t -> {:error, "unsupported servicenow table #{inspect(t)}"}
    end
  end
  def record(_), do: {:error, "invalid servicenow payload"}

  def body(%{"description" => body}) when is_binary(body) and byte_size(body) > 0, do: body
  def body(_), do: "{empty}"

  # Record numbers and sys_ids are only unique within an instance, and the payload comes from
  # a user-written Business Rule, so the receiving webhook (one per instance) scopes the key
  # rather than payload data. The sys_id is preferred as it never changes, unlike the number.
  def external_id(%{} = rec), do: external_id(nil, rec)
  def external_id(_), do: nil

  @spec external_id(binary | nil, map) :: binary | nil
  def external_id(scope, %{} = rec) do
    case record_id(rec) do
      nil -> nil
      id -> Enum.join(Enum.reject([scope, table(rec), id], &is_nil/1), ":")
    end
  end

  defp record_id(%{"sys_id" => id}) when is_binary(id) and byte_size(id) > 0, do: id
  defp record_id(%{"number" => number}) when is_binary(number) and byte_size(number) > 0, do: number
  defp record_id(_), do: nil

  def title(%{"short_description" => title}) when is_binary(title), do: title
  def title(_), do: nil

  # Links are rendered in the UI, so only http(s) URLs are kept.
  def url(%{"url" => url} = rec) when is_binary(url) and byte_size(url) > 0 do
    case web_url?(url) do
      true -> url
      false -> url(Map.delete(rec, "url"))
    end
  end
  def url(%{"instance_url" => base, "table" => table, "sys_id" => id})
      when is_binary(base) and is_binary(id) do
    case web_url?(base) do
      true ->
        target = URI.encode_www_form("#{table}.do?sys_id=#{id}")
        "#{String.trim_trailing(base, "/")}/nav_to.do?uri=#{target}"
      false -> nil
    end
  end
  def url(_), do: nil

  defp web_url?(url) do
    case URI.parse(String.trim(url)) do
      %URI{scheme: scheme, host: host} when scheme in ["http", "https"] and is_binary(host) and host != "" -> true
      _ -> false
    end
  end

  def status(%{"table" => table, "state" => state} = rec) do
    with nil <- state_code(table, code(state)),
      do: state_label(get_in(rec, ["display", "state"]))
  end
  def status(_), do: :open

  # Base system state values. Instances can add their own, which fall back to the label.
  defp state_code("incident", c) when c in [1, 3], do: :open
  defp state_code("incident", 2), do: :in_progress
  defp state_code("incident", c) when c in [6, 7], do: :completed
  defp state_code("incident", 8), do: :cancelled
  defp state_code("problem", 101), do: :open
  defp state_code("problem", c) when c in 102..105, do: :in_progress
  defp state_code("problem", c) when c in [106, 107], do: :completed
  defp state_code("change_request", -5), do: :open
  defp state_code("change_request", c) when c in -4..0, do: :in_progress
  defp state_code("change_request", 3), do: :completed
  defp state_code("change_request", 4), do: :cancelled
  defp state_code("sc_task", c) when c in [1, -5], do: :open
  defp state_code("sc_task", 2), do: :in_progress
  defp state_code("sc_task", 3), do: :completed
  defp state_code("sc_task", c) when c in [4, 7], do: :cancelled
  defp state_code(_, _), do: nil

  defp state_label(label) when is_binary(label) do
    label
    |> String.downcase()
    |> String.replace(~r/[^a-z]/, "")
    |> case do
      l when l in ~w(inprogress workinprogress fixinprogress rootcauseanalysis assess authorize scheduled implement review) ->
        :in_progress
      l when l in ~w(resolved closed closedcomplete complete completed) -> :completed
      l when l in ~w(canceled cancelled closedincomplete closedskipped) -> :cancelled
      _ -> :open
    end
  end
  defp state_label(_), do: :open

  defp code(state) when is_integer(state), do: state
  defp code(state) when is_binary(state) do
    case Integer.parse(state) do
      {code, ""} -> code
      _ -> nil
    end
  end
  defp code(_), do: nil

  defp table(%{"table" => t}) when is_binary(t), do: t
  defp table(%{"sys_class_name" => t}) when is_binary(t), do: t
  defp table(_), do: nil

  defp raw(%{"value" => v}), do: v
  defp raw(%{"display_value" => v}), do: v
  defp raw(v), do: v

  defp display(%{"display_value" => v}), do: v
  defp display(v), do: raw(v)
end
