defmodule Console.Schema.Chat do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, ChatThread, PullRequest, McpServer, PrAutomation}
  alias Console.AI.Provider

  @type msg :: t | %{role: Provider.sender, content: binary} | Provider.message
  @type history :: [msg]

  defenum Role, user: 0, assistant: 1, system: 2
  defenum Type, text: 0, file: 1, tool: 2, error: 3, implementation_plan: 4, pr_call: 5

  schema "chats" do
    field :type,         Type, default: :text
    field :role,         Role
    field :content,      :string
    field :seq,          :integer
    field :confirm,      :boolean, default: false
    field :confirmed_at, :utc_datetime_usec

    embeds_one :attributes, Attributes, on_replace: :update do
      embeds_one :file, FileAttributes, on_replace: :update do
        field :name, :string
      end

      embeds_one :tool, ToolAttributes, on_replace: :update do
        field :call_id,   :string
        field :name,      :string
        field :arguments, :map
      end

      embeds_one :plan, PlanAttributes, on_replace: :update do
        field :required_services, {:array, :string}
        field :open_questions, {:array, :string}
      end

      embeds_one :pr_call, PrCallAttributes, on_replace: :update do
        field :context, :map
      end
    end

    belongs_to :server,        McpServer
    belongs_to :pull_request,  PullRequest
    belongs_to :user,          User
    belongs_to :thread,        ChatThread
    belongs_to :pr_automation, PrAutomation

    timestamps()
  end

  @tool_call_types ~w(tool pr_call)a

  @spec message(msg) :: Provider.message
  def message(%__MODULE__{confirm: true, confirmed_at: nil}), do: nil
  def message(%__MODULE__{type: :file, role: r, content: c, attributes: %{file: %{name: n}}}),
    do: {r, Jason.encode!(%{name: n, content: c})}
  def message(%{type: :implementation_plan, content: c} = attrs),
    do: wrap_tool("<implementation_plan>#{c}</implementation_plan>", attrs)
  def message(%{type: :pr_call, content: c} = attrs),
    do: wrap_tool("<pr_call>#{c}</pr_call>", attrs)
  def message(%{type: t, content: c, attributes: %{tool: %{call_id: id}}}) when t in @tool_call_types and is_binary(id),
    do: {:tool, c, id}
  def message(%{role: r, content: c}), do: {r, c}
  def message({r, c}), do: {r, c}

  defp wrap_tool(msg, %{attributes: %{tool: %{call_id: id}}}) when is_binary(id), do: {:tool, msg, id}
  defp wrap_tool(msg, _), do: {:user, msg}

  @spec attributes(msg | Provider.message) :: msg
  def attributes(%{} = map), do: map
  def attributes({r, c}), do: %{role: r, content: c}

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

  @valid ~w(user_id type thread_id role content seq confirm confirmed_at server_id pull_request_id pr_automation_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:attributes, with: &attributes_changeset/2)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:thread_id)
    |> foreign_key_constraint(:server_id)
    |> validate_required(~w(type user_id thread_id role seq)a)
  end

  defp attributes_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:file, with: &file_changeset/2)
    |> cast_embed(:tool, with: &tool_changeset/2)
    |> cast_embed(:plan, with: &plan_changeset/2)
    |> cast_embed(:pr_call, with: &pr_call_changeset/2)
  end

  defp file_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name)a)
    |> validate_required(~w(name)a)
  end

  defp tool_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(name arguments call_id)a)
    |> validate_required(~w(name arguments)a)
  end

  defp plan_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(required_services open_questions)a)
  end

  defp pr_call_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(context)a)
  end
end
