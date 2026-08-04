defmodule Console.Deployments.Local.PersistentEts do
  @moduledoc """
  Owns an ETS table's on-disk snapshot and periodic flush timer.

  The process that creates this struct owns the ETS table and receives
  `{:persistent_ets, :flush}` messages. It is responsible for handling those
  messages by calling `flush/1`.
  """
  require Logger

  @default_flush_interval :timer.seconds(10)

  @type t :: %__MODULE__{
          table: :ets.tab(),
          file: Path.t(),
          timer: :timer.tref()
        }

  defstruct [:table, :file, :timer]

  @doc """
  Restores an ETS table from `file`, or creates an empty table when it is absent.

  `ets_opts` are passed to `:ets.new/2`. The calling process receives a flush
  message at the configured interval.
  """
  @spec new(atom, Path.t(), list, keyword) :: t
  def new(name, sfile, ets_opts \\ [], opts \\ []) when is_atom(name) and is_binary(sfile) do
    flush_interval = Keyword.get(opts, :flush_interval, @default_flush_interval)
    file = String.to_charlist(sfile)
    table = restore(name, file, ets_opts)
    {:ok, timer} = :timer.send_interval(flush_interval, {:persistent_ets, :flush})

    %__MODULE__{table: table, file: file, timer: timer}
  end

  @doc "Writes the table's current contents to its configured file."
  @spec flush(t) :: :ok | {:error, term}
  def flush(%__MODULE__{table: table, file: file}), do: :ets.tab2file(table, file)

  defp restore(name, file, ets_opts) do
    with true <- File.exists?(file),
         {:ok, table} <- :ets.file2tab(file) do
      table
    else
      false -> :ets.new(name, ets_opts)
      {:error, reason} ->
        Logger.error("could not restore ETS table from #{file}: #{inspect(reason)}")
        :ets.new(name, ets_opts)
    end
  end
end
