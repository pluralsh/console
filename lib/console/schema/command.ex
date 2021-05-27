defmodule Console.Schema.Command do
  use Piazza.Ecto.Schema
  alias Console.Schema.Build

  schema "commands" do
    field :command,      :string
    field :exit_code,    :integer
    field :stdout,       :binary
    field :completed_at, :utc_datetime_usec

    belongs_to :build, Build

    timestamps()
  end

  def for_build(query \\ __MODULE__, build_id),
    do: from(c in query, where: c.build_id == ^build_id)

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]),
    do: from(c in query, order_by: ^order)

  defimpl Collectable, for: __MODULE__ do
    alias Console.Services.Base

    def into(command) do
      {command, fn
        %{stdout: stdo} = command, {:cont, line} when is_binary(line) ->
          IO.write(line)
          maybe_persist(command, line)
          |> Base.broadcast(:update)
        command, :done -> command
        _, :halt -> :ok
      end}
    end

    defp maybe_persist(%{stdout: stdo} = cmd, line) do
      stdo = safe_concat(stdo, line)
      with true <- String.contains?(line, "\n"),
           {:ok, command} <- Ecto.Changeset.change(cmd, %{stdout: stdo})
                             |> Console.Repo.update() do
        command
      else
        _ -> %{cmd | stdout: stdo}
      end
    end

    defp safe_concat(nil, line), do: line
    defp safe_concat(prev, line) when is_binary(prev), do: prev <> line
  end

  @valid ~w(command exit_code stdout completed_at build_id)a

  def changeset(schema, attrs \\ %{}) do
    schema
    |> cast(attrs, @valid)
    |> validate_required([:command, :build_id])
    |> foreign_key_constraint(:build_id)
  end
end
