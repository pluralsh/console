defmodule Console.AI.Tools.Workbench.Integration.Jira.SaveComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.AI.Tools.Workbench.Integration.Jira.Client
  alias Console.Schema.WorkbenchTool

  embedded_schema do
    field :tool,       :map, virtual: true
    field :issue_id,   :string
    field :comment_id, :string
    field :body,       :string
    field :visibility, :map
  end

  @json_schema Console.priv_file!("tools/workbench/integration/jira/save_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "jira_#{name}_save_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Create or update a comment on a Jira issue using the #{name} connection. Omit comment_id to create a comment."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:issue_id, :comment_id, :body, :visibility])
    |> validate_required([:issue_id, :body])
  end

  def implement(%__MODULE__{comment_id: comment_id} = model)
      when nonempty_string(comment_id) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, response} <-
           Client.put(
             client,
             "/issue/#{Client.segment(model.issue_id)}/comment/#{Client.segment(comment_id)}",
             body(model)
           ) do
      Jason.encode(response)
    end
  end

  def implement(%__MODULE__{} = model) do
    with {:ok, client} <- Client.build(model.tool),
         {:ok, response} <-
           Client.post(
             client,
             "/issue/#{Client.segment(model.issue_id)}/comment",
             body(model)
           ) do
      Jason.encode(response)
    end
  end

  defp body(%__MODULE__{body: body, visibility: %{} = visibility}),
    do: %{"body" => body, "visibility" => visibility}

  defp body(%__MODULE__{body: body}), do: %{"body" => body}
end
