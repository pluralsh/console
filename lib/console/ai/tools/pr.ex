defmodule Console.AI.Tools.Pr do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.Deployments.Pr.Git
  alias Console.Schema.{PrAutomation, ScmConnection}
  alias Console.AI.Tool
  alias Console.Deployments.Pr.Dispatcher

  embedded_schema do
    field :repo_url,       :string
    field :branch_name,    :string
    field :commit_message, :string
    field :pr_title,       :string
    field :pr_description, :string

    embeds_many :file_updates, FileUpdate, on_replace: :delete do
      field :file_name, :string
      field :content,   :string
    end
  end

  @valid ~w(repo_url branch_name commit_message pr_title pr_description)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:file_updates, with: &file_update_changeset/2)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/pr.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: :create_pr
  def description(), do: "Creates a pull request or merge request against a configured Source Control Management provider"

  def implement(%__MODULE__{repo_url: url, branch_name: branch, commit_message: msg} = pr) do
    IO.inspect(pr, label: "PR TOOL CALL: ")
    with {:conn, %ScmConnection{} = conn} <- {:conn, Tool.scm_connection()},
         conn <- %{conn | author: Tool.actor()},
         url = to_http(conn, url),
         {:ok, %ScmConnection{dir: d} = conn} <- setup(conn, url, branch),
         :ok <- file_updates(pr, d),
         {:ok, _} <- commit(conn, msg),
         {:ok, _} <- push(conn, branch),
         {:ok, identifier} <- slug(conn, url),
         impl <- Dispatcher.dispatcher(conn) do
      impl.create(%PrAutomation{
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

  defp file_updates(%__MODULE__{file_updates: [_ | _] = updates}, dir) do
    Enum.reduce_while(updates, :ok, fn %{file_name: f, content: c}, _ ->
      case File.write(Path.join(dir, f), c) do
        :ok -> {:cont, :ok}
        {:error, err} ->
          {:halt, {:error, "failed to write file #{f}, reason: #{inspect(err)}"}}
      end
    end)
  end
  defp file_updates(_, _), do: {:error, "no updates defined"}

  defp file_update_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(file_name content)a)
    |> validate_required(~w(file_name content)a)
  end
end
