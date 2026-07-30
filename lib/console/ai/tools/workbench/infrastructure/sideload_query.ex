defmodule Console.AI.Tools.Workbench.Infrastructure.SideloadQuery do
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :fetch, :boolean, default: false
    field :search, :string
  end

  @valid ~w(fetch search)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:fetch])
    |> validate_regex()
  end

  def filter(
    [_ | _] = items,
    %__MODULE__{fetch: true, search: search},
    target_fun
  ) when is_binary(search) and is_function(target_fun, 1) do
    with search when byte_size(search) > 0 <- String.trim(search),
         {:ok, regex} <- Regex.compile(search, "i") do
      Enum.filter(items, fn item ->
        target_fun.(item)
        |> Enum.any?(&matches?(&1, regex))
      end)
    else
      _ -> items
    end
  end
  def filter(items, %__MODULE__{fetch: true, search: nil}, _), do: items
  def filter(_, _, _), do: []

  defp matches?(value, regex) when is_binary(value), do: Regex.match?(regex, value)
  defp matches?(value, regex), do: matches?(to_string(value),regex)

  defp validate_regex(changeset) do
    validate_change(changeset, :search, fn
      :search, search when is_binary(search) ->
        case Regex.compile(String.trim(search), "i") do
          {:ok, _} -> []
          {:error, {reason, _}} -> [search: "is not a valid regex: #{inspect(reason)}"]
        end

      _, _ ->
        []
    end)
  end
end
