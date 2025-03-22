defmodule Console.Schema.Chat do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, ChatThread, PullRequest}
  alias Console.AI.Provider

  @type msg :: t | %{role: Provider.sender, content: binary} | Provider.message
  @type history :: [msg]

  defenum Role, user: 0, assistant: 1, system: 2
  defenum Type, text: 0, file: 1, tool: 2

  schema "chats" do
    field :type,    Type, default: :text
    field :role,    Role
    field :content, :string
    field :seq,     :integer
    field :confirm, :boolean, default: false

    embeds_one :attributes, Attributes, on_replace: :update do
      embeds_one :file, FileAttributes, on_replace: :update do
        field :name, :string
      end

      embeds_one :tool, ToolAttributes, on_replace: :update do
        field :name, :string
        field :arguments, :map
      end
    end

    belongs_to :server,       McpServer
    belongs_to :pull_request, PullRequest
    belongs_to :user,         User
    belongs_to :thread,       ChatThread

    timestamps()
  end

  @spec message(msg) :: {Provider.sender, binary}
  def message(%__MODULE__{type: :file, role: r, content: c, attributes: %{file: %{name: n}}}),
    do: {r, Jason.encode!(%{name: n, content: c})}
  def message(%{role: r, content: c}), do: {r, c}
  def message({r, c}), do: {r, c}

  def for_thread(query \\ __MODULE__, thread_id) do
    from(c in query, where: c.thread_id == ^thread_id)
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(c in query, where: c.user_id == ^user_id)
  end

  def for_pull_request(query \\ __MODULE__, pr_id) do
    from(c in query, where: c.pull_request_id == ^pr_id)
  end

  def rollup(query \\ __MODULE__) do
    from(c in query, where: c.seq < 0)
  end

  def before(query \\ __MODULE__, seq)
  def before(query, nil), do: query
  def before(query, seq) when is_integer(seq), do: from(c in query, where: c.seq <= ^seq)

  def summarizable(query \\ __MODULE__) do
    from(c in query, where: c.inserted_at < ^expiry() or c.seq < 0)
  end

  def expired(query \\ __MODULE__) do
    from(c in query, where: c.inserted_at < ^expiry())
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :seq, asc: :inserted_at]) do
    from(c in query, order_by: ^order)
  end

  defp expiry(), do: Timex.now() |> Timex.shift(days: -5)

  @valid ~w(user_id type thread_id role content seq confirm server_id pull_request_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:attributes, with: &attributes_changeset/2)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:thread_id)
    |> validate_required(~w(type user_id thread_id role content seq)a)
  end

  defp attributes_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:file, with: &file_changeset/2)
    |> cast_embed(:tool, with: &tool_changeset/2)
  end

  defp file_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name)a)
    |> validate_required(~w(name)a)
  end

  defp tool_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name arguments)a)
    |> validate_required(~w(name arguments)a)
  end
end
