defmodule Console.Schema.WorkbenchWebhook do
  use Console.Schema.Base
  alias Console.Schema.{ObservabilityWebhook, Workbench, IssueWebhook}

  schema "workbench_webhooks" do
    field :name,    :string

    embeds_one :matches, Matches, on_replace: :update do
      field :regex,            :string
      field :substring,        :string
      field :case_insensitive, :boolean
    end

    belongs_to :webhook,       ObservabilityWebhook
    belongs_to :issue_webhook, IssueWebhook
    belongs_to :workbench,     Workbench

    timestamps()
  end

  def matches?(%__MODULE__{matches: %{regex: regex, case_insensitive: caseless}}, body) when is_binary(body) and is_binary(regex) do
    Regex.compile!(regex, caseless: caseless)
    |> Regex.match?(body)
  end
  def matches?(%__MODULE__{matches: %{substring: substring, case_insensitive: true}}, body) when is_binary(body) and is_binary(substring) do
    String.downcase(body)
    |> String.contains?(String.downcase(substring))
  end
  def matches?(%__MODULE__{matches: %{substring: substring}}, body) when is_binary(body) and is_binary(substring),
    do: String.contains?(body, substring)
  def matches?(_, _), do: false

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(w in query, order_by: ^order)
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(w in query, where: w.workbench_id == ^workbench_id)
  end

  def for_webhook(query \\ __MODULE__, webhook_id) do
    from(w in query, where: w.webhook_id == ^webhook_id)
  end

  def for_issue_webhook(query \\ __MODULE__, issue_webhook_id) do
    from(w in query, where: w.issue_webhook_id == ^issue_webhook_id)
  end

  @valid ~w(name webhook_id issue_webhook_id workbench_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:matches, with: &matches_changeset/2)
    |> foreign_key_constraint(:webhook_id)
    |> foreign_key_constraint(:issue_webhook_id)
    |> foreign_key_constraint(:workbench_id)
    |> unique_constraint([:workbench_id, :name])
    |> validate_required([:name, :workbench_id])
    |> validate_webhook_or_issue_webhook()
  end

  defp validate_webhook_or_issue_webhook(changeset) do
    case {get_field(changeset, :webhook_id), get_field(changeset, :issue_webhook_id)} do
      {nil, nil} -> add_error(changeset, :webhook_id, "must have either webhook_id or issue_webhook_id")
      {_, _} -> changeset
    end
  end

  defp matches_changeset(model, attrs) do
    model
    |> cast(attrs, [:regex, :substring, :case_insensitive])
    |> validate_change(:regex, fn
      :regex, regex when is_binary(regex) and byte_size(regex) > 0 ->
        case Regex.compile(regex) do
          {:ok, _} -> []
          {:error, reason} -> [regex: "Invalid regex #{regex}: #{inspect(reason)}"]
        end
      _, _ -> []
    end)
  end
end
