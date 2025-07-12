defmodule Console.AI.Tools.Pr do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.Deployments.Pr.Git
  alias Console.Schema.{PrAutomation, ScmConnection}
  alias Console.AI.{Tool, File.Editor}
  alias Console.Deployments.Pr.Dispatcher

  embedded_schema do
    field :repo_url,       :string
    field :branch_name,    :string
    field :commit_message, :string
    field :pr_title,       :string
    field :pr_description, :string
    field :patch,          :string

    embeds_many :file_updates, FileUpdate, on_replace: :delete do
      field :file_name,   :string
      field :previous,    :string
      field :replacement, :string
    end

    embeds_one :confidence, Confidence, on_replace: :update do
      field :confident, :boolean
      field :reason,    :string
    end
  end

  @valid ~w(repo_url patch branch_name commit_message pr_title pr_description)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:file_updates, with: &file_update_changeset/2)
    |> cast_embed(:confidence, with: &confidence_changeset/2)
    |> infer_title()
    |> validate_required(@valid -- [:patch])
    |> ensure_confident()
  end

  defp infer_title(cs) do
    with {nil, msg} when is_binary(msg) <- {get_field(cs, :pr_title), get_field(cs, :commit_message)},
         [l | _] <- String.split(msg, "\n") do
      put_change(cs, :pr_title, String.slice(l, 0, 50))
    else
      _ -> cs
    end
  end

  @json_schema Console.priv_file!("tools/pr.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: :create_pr
  def description(), do: "Creates a pull request or merge request against a configured Source Control Management provider"

  def implement(%__MODULE__{repo_url: url, branch_name: branch, commit_message: msg} = pr) do
    branch = "plrl/ai/#{branch}-#{Console.rand_alphanum(6)}"
    with {:conn, %ScmConnection{} = conn} <- {:conn, Tool.scm_connection()},
         conn <- %{conn | author: Tool.actor()},
         url = to_http(conn, url),
         {:ok, %ScmConnection{dir: d} = conn} <- setup(conn, url, branch),
         :ok <- file_updates(conn, pr, d),
         {:ok, _} <- commit(conn, msg),
         {:ok, _} <- push(conn, branch),
         {:ok, identifier} <- slug(conn, url),
         impl = Dispatcher.dispatcher(conn) do
      impl.create(%PrAutomation{
        branch: conn.branch,
        connection: conn,
        title: pr.pr_title,
        message: pr.pr_description,
        identifier: identifier,
      }, branch, %{})
    else
      {:conn, _} -> {:error, "no scm connection configured for AI yet"}
      err -> err
    end
  end

  defp file_updates(_, %__MODULE__{file_updates: [_ | _] = updates}, dir) do
    Enum.reduce_while(updates, :ok, fn %__MODULE__.FileUpdate{file_name: f, previous: p, replacement: r}, _ ->
      with {:ok, path} <- relpath(dir, f),
           :ok <- Editor.replace(path, p, r) do
        {:cont, :ok}
      else
        :error -> {:halt, {:error, "unsafe file path #{f}"}}
        {:error, err} -> {:halt, {:error, "failed to update file #{f}, reason: #{inspect(err)}"}}
      end
    end)
  end

  defp file_updates(_, _, _), do: {:error, "no updates defined"}

  defp relpath(dir, f) do
    with {:ok, sanitized} <- Path.safe_relative(f, dir),
      do: {:ok, Path.join(dir, sanitized)}
  end

  defp file_update_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(file_name previous replacement)a)
    |> validate_required(~w(file_name replacement)a)
  end

  defp confidence_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(confident reason)a)
  end

  defp ensure_confident(cs) do
    case get_field(cs, :confidence) do
      %__MODULE__.Confidence{confident: false, reason: reason} ->
        add_error(cs, :confidence, "There's not sufficient confidence to apply this PR, the reason is: #{reason}")
      _ -> cs
    end
  end
end
