defmodule Console.AI.Tools.Agent.Coding.GenericPr do
  use Console.AI.Tools.Agent.Base
  import Console.Deployments.Pr.Git
  alias Console.Schema.{
    PrAutomation,
    ScmConnection,
    AgentSession,
    ChatThread,
    AiInsight,
    User
  }
  alias Console.AI.Tool
  alias Console.Deployments.Git, as: GitSvc

  embedded_schema do
    field :repo_url,       :string
    field :branch_name,    :string
    field :pr_title,       :string
    field :pr_description, :string
    field :prompt,         :string
  end

  @valid ~w(repo_url branch_name pr_title pr_description prompt)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:repo_url, :branch_name, :prompt])
  end


  @json_schema Console.priv_file!("tools/agent/coding/generic_pr.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("create_pr")
  def description(), do: "Creates a pull request or merge request for an agent session. You must specify a prompt to describe the changes you want to make, and the subagent taking on this work will handle it for you."

  def implement(%__MODULE__{repo_url: url, branch_name: branch, prompt: prompt} = pr) do
    branch = "plrl/ai/#{branch}-#{Console.rand_alphanum(6)}"
    with {:conn, %ScmConnection{} = conn} <- {:conn, Tool.scm_connection()},
         {:session, %AgentSession{} = session} <- session(),
         %User{} = user <- Tool.actor(),
         url = to_http(conn, url),
         {:ok, identifier} <- slug(conn, url),
         pra = %PrAutomation{
            branch: conn.branch,
            connection: conn,
            title: pr.pr_title,
            message: pr.pr_description,
            ai: %PrAutomation.AI{enabled: true, prompt: prompt},
            identifier: identifier,
            ignore_templates: true,
            write_bindings: [],
            create_bindings: [%{user_id: user.id, group_id: nil}],
          },
        {:ok, pull_request} <- GitSvc.create_pull_request(session_attrs(session), %{}, pra, branch, identifier, user),
        {:ok, _} <- update_session(%{pull_request_id: pull_request.id, branch: branch}) do
      {:ok, "Pull request created at url #{pull_request.url}!  Be sure to explain to the user that it was created successfully."}
    else
      {:conn, _} -> {:ok, "no scm connection configured for AI yet, cannot create pull request"}
      {:error, err} -> {:ok, "failed to create pull request, reason: #{inspect(err)}"}
      nil -> {:error, "no actor found in context, cannot create pull request"}
      err -> {:ok, "failed to create pull request with unknown reason: #{inspect(err)}"}
    end
  end

  defp session_attrs(%AgentSession{} = session) do
    Map.take(session, ~w(stack_id service_id)a)
    |> Map.put(:session_id, session.id)
    |> then(&Map.merge(insight_attrs(Tool.thread()), &1))
  end

  defp insight_attrs(%ChatThread{insight: %AiInsight{} = insight}), do: Map.take(insight, ~w(stack_id service_id)a)
  defp insight_attrs(_), do: %{}
end
