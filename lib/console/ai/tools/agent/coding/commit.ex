defmodule Console.AI.Tools.Agent.Coding.Commit do
  use Console.AI.Tools.Agent.Base
  import Console.Deployments.Pr.Git
  alias Console.Schema.{AgentSession, ScmConnection}
  alias Console.AI.Tools.Pra.Commit
  alias Console.AI.Agents.Pr

  embedded_schema do
    field :repo_url,       :string
    field :prompt,         :string
  end

  @valid ~w(repo_url prompt)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/agent/coding/commit.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("commit")
  def description(), do: "Commits changes to a git repository for an agent session and pushes them to the current branch. This will be handled by a subagent which will follow your prompt to make the changes accordingly."

  @commit_max 5

  def implement(%__MODULE__{repo_url: url, prompt: prompt}) do
    with {:session, %AgentSession{branch: branch, commit_count: count}}
            when is_nil(count) or count < @commit_max <- session(),
         {:conn, %ScmConnection{} = conn} <- {:conn, Tool.scm_connection()},
         conn <- %{conn | author: Tool.actor()},
         url = to_http(conn, url),
         {:ok, %ScmConnection{dir: d} = conn} <- clone_branch(conn, url, branch),
         {:ok, %Commit{message: msg}} <- Pr.exec(d, prompt),
         {:ok, _} <- commit(conn, msg),
         {:ok, _} <- push(conn),
         {:ok, _} <- update_session(%{commit_count: (count || 0) + 1}) do
      {:ok, "Changes committed and pushed to #{branch}"}
    else
      {:session, _} -> {:error, "You've made too many commits, any future commits are blocked in this session."}
      {:conn, _} -> {:error, "no scm connection configured for AI yet"}
      err -> {:error, "unknown failure committing changes, reason: #{inspect(err)}"}
    end
  end
end
