defmodule Console.Deployments.Issues.Webhook.Gitlab do
  @behaviour Console.Deployments.Issues.Provider

  def body(%{"object_kind" => "note", "object_attributes" => %{"note" => body}}) when is_binary(body), do: body
  def body(%{} = payload), do: string_field(payload, "description") || "{empty}"

  def external_id(%{"object_kind" => "note", "object_attributes" => %{"id" => id}} = payload)
      when is_integer(id),
      do: "#{infer_project(payload)}:comment:#{id}"
  def external_id(%{"object_kind" => "note", "object_attributes" => %{"id" => id}} = payload)
      when is_binary(id),
      do: "#{infer_project(payload)}:comment:#{id}"
  def external_id(%{"object_kind" => "work_item"} = payload) do
    iid = field(payload, "iid")
    work_item_external_id(payload, iid)
  end
  def external_id(%{} = payload) do
    iid = field(payload, "iid")
    issue_external_id(payload, iid)
  end
  def external_id(_), do: nil

  defp work_item_external_id(payload, iid) when is_integer(iid),
      do: "#{infer_project(payload)}:work_item:#{iid}"
  defp work_item_external_id(payload, iid) when is_binary(iid),
      do: "#{infer_project(payload)}:work_item:#{iid}"
  defp work_item_external_id(_, _), do: nil

  defp issue_external_id(payload, iid) when is_integer(iid),
    do: "#{infer_project(payload)}:issue:#{iid}"
  defp issue_external_id(payload, iid) when is_binary(iid),
    do: "#{infer_project(payload)}:issue:#{iid}"
  defp issue_external_id(_, _), do: nil

  def title(
        %{
          "object_kind" => "note",
          "object_attributes" => %{"id" => id},
          "merge_request" => %{"title" => mr_title}
        }
      ),
      do: "Comment on MR: #{mr_title} (##{id})"
  def title(%{} = payload), do: string_field(payload, "title")
  def title(_), do: nil

  def url(%{"object_kind" => "note", "object_attributes" => %{"url" => url}}), do: url
  def url(%{"object_kind" => "note", "merge_request" => %{"url" => url}}), do: url
  def url(%{} = payload), do: string_field(payload, "url")
  def url(_), do: nil

  def status(%{"object_kind" => "note", "merge_request" => %{"state" => state}}), do: map_status(state)
  def status(%{} = payload) do
    field(payload, "state")
    |> map_status()
    |> case do
      :open -> field(payload, "action") |> map_status()
      status -> status
    end
  end
  def status(_), do: :open

  defp map_status("open"), do: :open
  defp map_status("opened"), do: :open
  defp map_status("reopen"), do: :open
  defp map_status("reopened"), do: :open
  defp map_status("close"), do: :completed
  defp map_status("closed"), do: :completed
  defp map_status(_), do: :open

  defp infer_project(%{"project" => %{"path_with_namespace" => path}}) when is_binary(path), do: path
  defp infer_project(%{} = payload) do
    payload
    |> url()
    |> parse_project_from_url()
  end

  defp parse_project_from_url(url) when is_binary(url) do
    with %URI{path: path} when is_binary(path) <- URI.parse(url),
         [project | _] <- String.split(path, "-", trim: true) do
      String.trim(project, "/")
    else
      _ -> "unknown"
    end
  end
  defp parse_project_from_url(_), do: "unknown"

  defp string_field(payload, key) do
    case field(payload, key) do
      value when is_binary(value) -> value
      _ -> nil
    end
  end

  defp field(%{"object_attributes" => attrs} = payload, key) when is_map(attrs) do
    case current_value(Map.get(attrs, key)) do
      nil -> changed_field(payload, key)
      value -> value
    end
  end
  defp field(%{} = payload, key), do: changed_field(payload, key)

  defp changed_field(%{"changes" => changes}, key) when is_map(changes),
    do: Map.get(changes, key) |> current_value()
  defp changed_field(_, _), do: nil

  defp current_value(%{"current" => current}), do: current
  defp current_value(%{current: current}), do: current
  defp current_value(value), do: value
end
