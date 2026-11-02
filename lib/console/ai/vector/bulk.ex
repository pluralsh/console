defmodule Console.AI.Vector.Bulk do
  @moduledoc """
  Callbacks for vector stores with a bulk write api.  Inserts and deletes into these stores are prepared
  (eg embedded) in the calling process, then accumulated in `Console.AI.Vector.Buffer` and written in
  batches no larger than the store's `limits/1`.  A store reports when a new entry `conflicts?/3` with the
  pending batch (eg a delete that would remove a buffered insert), in which case the batch is flushed first.
  `bulk_write/2` returns `{:retry, _}` for transient failures, which the buffer retries in order.
  """

  @type store :: struct
  @type entry :: term
  @type limits :: %{max_bytes: pos_integer, max_count: pos_integer}

  @callback prepare(store, struct, keyword) :: {:ok, entry} | :ignore | Console.error
  @callback prepare_delete(store, keyword) :: {:ok, entry} | Console.error
  @callback conflicts?(store, [entry], entry) :: boolean
  @callback size(entry) :: non_neg_integer
  @callback limits(store) :: limits
  @callback bulk_write(store, [entry]) :: :ok | {:retry, term} | Console.error

  @spec bulk?(module) :: boolean
  def bulk?(Console.AI.Vector.Plural), do: true
  def bulk?(_), do: false
end
