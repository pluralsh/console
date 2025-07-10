defmodule Console.AI.Tools.Agent.Coding.Pr do
  use Console.AI.Tools.Agent.Base
  import Console.Deployments.Pr.Git
  alias Console.Schema.{
    PrAutomation,
    PullRequest,
    ScmConnection,
    Stack,
    GitRepository,
    User
  }
  alias Console.AI.{Tool, File.Editor}
  alias Console.Deployments.Pr.Dispatcher

  embedded_schema do
    field :stack_id,       :string
    field :branch_name,    :string
    field :commit_message, :string
    field :pr_title,       :string
    field :pr_description, :string

    embeds_many :file_updates, FileUpdate, on_replace: :delete do
      field :file_name,   :string
      field :previous,    :string
      field :replacement, :string
    end

    embeds_many :file_creates, FileCreate, on_replace: :delete do
      field :file_name,   :string
      field :content,     :string
    end

    embeds_many :file_deletes, FileDelete, on_replace: :delete do
      field :file_name,   :string
    end
  end

  @valid ~w(stack_id branch_name commit_message pr_title pr_description)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:file_updates, with: &file_update_changeset/2)
    |> cast_embed(:file_creates, with: &file_create_changeset/2)
    |> cast_embed(:file_deletes, with: &file_delete_changeset/2)
    |> infer_commit_message()
    |> infer_title()
    |> validate_required(@valid)
  end

  defp infer_commit_message(cs) do
    with nil <- get_field(cs, :commit_message),
         {:session, %AgentSession{prompt: p}} when is_binary(p) <- session() do
      put_change(cs, :commit_message, "Plural AI agentic fix for prompt: #{p}")
    else
      _ -> cs
    end
  end

  defp infer_title(cs) do
    with {nil, msg} when is_binary(msg) <- {get_field(cs, :pr_title), get_field(cs, :commit_message)},
         [l | _] <- String.split(msg, "\n") do
      put_change(cs, :pr_title, String.slice(l, 0, 50))
    else
      _ -> cs
    end
  end

  @json_schema Console.priv_file!("tools/agent/coding/pr.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("create_pr")
  def description(), do: "Creates a pull request or merge request for an agent session. You must specify at least one of file_creates, file_updates or file_deletes to make a valid diff for this PR."

  def implement(%__MODULE__{stack_id: id, branch_name: branch, commit_message: msg} = pr) do
    branch = "plrl/ai/#{branch}-#{Console.rand_alphanum(6)}"
    stack = Console.Deployments.Stacks.get_stack(id) |> IO.inspect(label: "stack")
    with %Stack{repository: %GitRepository{url: url}} = stack <- Console.Repo.preload(stack, [:repository]),
         %User{} = user <- Tool.actor(),
         {:ok, stack} <- Policies.allow(stack, user, :write),
         {:conn, %ScmConnection{} = conn} <- {:conn, Tool.scm_connection()},
         conn <- %{conn | author: Tool.actor()},
         url = to_http(conn, url),
         {:ok, %ScmConnection{dir: d} = conn} <- setup(conn, url, branch),
         :ok <- apply_fs_changes(pr, d),
         {:ok, _} <- commit(conn, msg),
         {:ok, _} <- push(conn, branch),
         {:ok, identifier} <- slug(conn, url),
         impl = Dispatcher.dispatcher(conn),
         {:ok, attrs} <- impl.create(%PrAutomation{
                          branch: conn.branch,
                          connection: conn,
                          title: pr.pr_title,
                          message: pr.pr_description,
                          identifier: identifier,
                        }, branch, %{}),
        {:session, %AgentSession{id: session_id}} <- session(),
        {:ok, pull_request} <- create_pr(attrs, %{stack_id: stack.id, session_id: session_id}),
        {:ok, _} <- update_session(%{pull_request_id: pull_request.id, branch: branch}) do
      {:ok, "Pull request created at url #{pull_request.url}"}
    else
      {:conn, _} -> {:ok, "no scm connection configured for AI yet, cannot create pull request"}
      {:error, err} -> {:ok, "failed to create pull request, reason: #{inspect(err)}"}
      err -> {:ok, "failed to create pull request with unknown reason: #{inspect(err)}"}
    end
  end

  defp create_pr(attrs, additional) do
    %PullRequest{}
    |> PullRequest.changeset(Map.merge(attrs, additional))
    |> Console.Repo.insert()
  end

  def apply_fs_changes(pr, dir) do
    with :ok <- file_updates(pr, dir),
         :ok <- file_deletes(pr, dir),
      do: file_creates(pr, dir)
  end

  defp file_updates(%{file_updates: [_ | _] = updates}, dir) do
    Enum.reduce_while(updates, :ok, fn %__MODULE__.FileUpdate{file_name: f, previous: p, replacement: r}, _ ->
      with {:ok, path} <- Path.safe_relative(f, dir),
           :ok <- Editor.replace(path, p, r) do
        {:cont, :ok}
      else
        :error -> {:halt, {:error, "unsafe file path #{f}"}}
        {:error, err} -> {:halt, {:error, "failed to write file #{f}, reason: #{inspect(err)}"}}
      end
    end)
  end
  defp file_updates(_, _), do: {:error, "no updates defined"}

  defp file_deletes(%{file_deletes: [_ | _] = deletes}, dir) do
    Enum.reduce_while(deletes, :ok, fn %__MODULE__.FileDelete{file_name: f}, _ ->
      with {:ok, path} <- Path.safe_relative(f, dir),
           :ok <- File.rm(path) do
        {:cont, :ok}
      else
        :error -> {:halt, {:error, "unsafe file path #{f}"}}
        {:error, err} -> {:halt, {:error, "failed to delete file #{f}, reason: #{inspect(err)}"}}
      end
    end)
  end
  defp file_deletes(_, _), do: {:error, "no deletes defined"}

  defp file_creates(%{file_creates: [_ | _] = creates}, dir) do
    Enum.reduce_while(creates, :ok, fn %__MODULE__.FileCreate{file_name: f, content: c}, _ ->
      with {:ok, path} <- Path.safe_relative(f, dir),
           :ok <- File.write(path, c) do
        {:cont, :ok}
      else
        :error -> {:halt, {:error, "unsafe file path #{f}"}}
        {:error, err} -> {:halt, {:error, "failed to create file #{f}, reason: #{inspect(err)}"}}
      end
    end)
  end

  def file_update_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(file_name previous replacement)a)
    |> validate_required(~w(file_name replacement)a)
  end

  def file_create_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(file_name content)a)
    |> validate_required(~w(file_name content)a)
  end

  def file_delete_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(file_name)a)
    |> validate_required(~w(file_name)a)
  end
end
