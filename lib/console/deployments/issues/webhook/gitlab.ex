defmodule Console.Deployments.Issues.Webhook.Gitlab do
  @behaviour Console.Deployments.Issues.Provider

  def body(%{"object_kind" => "note", "object_attributes" => %{"note" => body}}) when is_binary(body), do: body
  def body(%{"object_attributes" => %{"description" => body}}) when is_binary(body), do: body
  def body(_), do: "{empty}"

  def external_id(%{"object_kind" => "note", "object_attributes" => %{"id" => id}} = payload)
      when is_integer(id),
      do: "#{infer_project(payload)}:comment:#{id}"
  def external_id(%{"object_kind" => "note", "object_attributes" => %{"id" => id}} = payload)
      when is_binary(id),
      do: "#{infer_project(payload)}:comment:#{id}"
  def external_id(%{"object_kind" => "work_item", "object_attributes" => %{"iid" => iid}} = payload)
      when is_integer(iid),
      do: "#{infer_project(payload)}:work_item:#{iid}"
  def external_id(%{"object_kind" => "work_item", "object_attributes" => %{"iid" => iid}} = payload)
      when is_binary(iid),
      do: "#{infer_project(payload)}:work_item:#{iid}"
  def external_id(%{"object_attributes" => %{"iid" => iid}} = payload) when is_integer(iid),
    do: "#{infer_project(payload)}:issue:#{iid}"
  def external_id(%{"object_attributes" => %{"iid" => iid}} = payload) when is_binary(iid),
    do: "#{infer_project(payload)}:issue:#{iid}"
  def external_id(_), do: nil

  def title(
        %{
          "object_kind" => "note",
          "object_attributes" => %{"id" => id},
          "merge_request" => %{"title" => mr_title}
        }
      ),
      do: "Comment on MR: #{mr_title} (##{id})"
  def title(%{"object_attributes" => %{"title" => title}}), do: title
  def title(_), do: nil

  def url(%{"object_kind" => "note", "object_attributes" => %{"url" => url}}), do: url
  def url(%{"object_kind" => "note", "merge_request" => %{"url" => url}}), do: url
  def url(%{"object_attributes" => %{"url" => url}}), do: url
  def url(_), do: nil

  def status(%{"object_kind" => "note", "merge_request" => %{"state" => state}}), do: map_status(state)
  def status(%{"object_attributes" => %{"state" => state}}), do: map_status(state)
  def status(%{"object_attributes" => %{"action" => action}}), do: map_status(action)
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
end
