defmodule Console.JSON do
  @moduledoc """
  Torque-backed JSON codec, used as Phoenix's `:json_library` and Absinthe.Plug's `:json_codec`.

  Torque only encodes structs that implement `Torque.Encoder` (it ships ones for the date and time
  structs), so any struct sent over the wire needs a derived or explicit implementation.

  Encodes run on a dirty scheduler: their output size can't be known up front, and GraphQL responses
  reach megabytes. Decodes over 20 KB move to one on their own.
  """

  defmodule DecodeError do
    defexception [:message]
  end

  def encode!(term, opts \\ []), do: Torque.encode!(term, Keyword.put(opts, :dirty, true))

  def encode_to_iodata!(term, opts \\ []), do: Torque.encode_to_iodata!(term, Keyword.put(opts, :dirty, true))

  @doc "decode errors are exceptions, which Absinthe.Plug turns into a 400 rather than crashing on"
  def decode(json) when is_binary(json) do
    case Torque.decode(json) do
      {:ok, _} = ok -> ok
      {:error, reason} -> {:error, %DecodeError{message: "invalid json: #{reason}"}}
    end
  end

  def decode!(json) when is_binary(json) do
    case decode(json) do
      {:ok, term} -> term
      {:error, error} -> raise error
    end
  end
end

defmodule Console.JSON.Postgres do
  @moduledoc """
  Postgrex `json`/`jsonb` codec, wired in through `Console.PostgrexTypes`.

  It runs once per parameter and per decoded row, so encodes stay on the normal scheduler: a column
  value is small next to the cost of a dirty dispatch.
  """

  def encode_to_iodata!(term), do: Torque.encode_to_iodata!(term)

  def decode!(json), do: Torque.decode!(json)
end

defimpl Torque.Encoder, for: Decimal do
  def encode(decimal), do: Decimal.to_string(decimal)
end
