defmodule Console.Logs.Level do
  @moduledoc """
  Log levels as loki's `detected_level` normalizes them, which every log provider filters and groups by
  """

  @levels ~w(trace debug info warn error critical fatal unknown)a

  @type t :: :trace | :debug | :info | :warn | :error | :critical | :fatal | :unknown

  def levels, do: @levels

  @spec normalize(binary | atom | nil) :: t()
  def normalize(nil), do: :unknown
  def normalize(level) when is_atom(level), do: normalize(Atom.to_string(level))
  def normalize(level) when is_binary(level) do
    case String.downcase(String.trim(level)) do
      l when l in ~w(trace trc) -> :trace
      l when l in ~w(debug dbg) -> :debug
      l when l in ~w(info inf information notice) -> :info
      l when l in ~w(warn warning wrn) -> :warn
      l when l in ~w(error err eror) -> :error
      l when l in ~w(critical crit alert emerg emergency) -> :critical
      l when l in ~w(fatal panic dpanic) -> :fatal
      _ -> :unknown
    end
  end

  @doc """
  The ways shippers spell a level, for backends that only match a level field exactly
  """
  @spec spellings(t()) :: [binary]
  def spellings(level) do
    base = case level do
      :warn -> ~w(warn warning)
      :error -> ~w(error err)
      :critical -> ~w(critical crit)
      :fatal -> ~w(fatal panic)
      level -> [Atom.to_string(level)]
    end
    Enum.flat_map(base, &[&1, String.upcase(&1), String.capitalize(&1)])
  end
end
