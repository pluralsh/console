defmodule Console.Local.Base do
  defmacro __using__(_) do
    quote do
      use Ecto.Schema
      import Ecto.Query
      import Ecto.Changeset
      import Piazza.Ecto.Schema
      import EctoEnum

      @timestamps_opts [type: :utc_datetime_usec]

      @type t :: %__MODULE__{}
    end
  end
end
