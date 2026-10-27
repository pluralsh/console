defmodule Console.AI.Workbench.SandboxPool do
  @moduledoc """
  Caps how many python sandboxes run at once on a node.  A busy sandbox pins a dirty cpu scheduler for
  its whole time budget, and a workbench fans out to many subagents that can each run one, so without a
  cap a single job can saturate the pod.

  The pool hands out permits rather than workers: the sandbox runs in the caller, and the permit is
  returned when it finishes or the caller dies.
  """
  @behaviour NimblePool

  # not lazy: a lazy pool only replaces a permit lost with a dead caller on the next checkout, stranding
  # callers already queued for it
  def child_spec(_) do
    NimblePool.child_spec(worker: {__MODULE__, :ok}, pool_size: size(), name: __MODULE__)
  end

  @doc """
  Runs `fun` once a permit is free, or returns `{:error, :busy}` if none frees up within `timeout`.
  """
  @spec run((-> result), timeout) :: result | {:error, :busy} when result: term
  def run(fun, timeout) when is_function(fun, 0) do
    NimblePool.checkout!(__MODULE__, :run, fn _, _ -> {fun.(), :ok} end, timeout)
  catch
    :exit, {:timeout, {NimblePool, :checkout, _}} -> {:error, :busy}
  end

  # half the dirty cpu schedulers, so other dirty nifs still have room
  def size() do
    case Console.conf(:sandbox_concurrency) do
      n when is_integer(n) and n > 0 -> n
      _ -> max(div(:erlang.system_info(:dirty_cpu_schedulers_online), 2), 1)
    end
  end

  @impl NimblePool
  def init_worker(state), do: {:ok, :permit, state}

  @impl NimblePool
  def handle_checkout(:run, _from, permit, state), do: {:ok, permit, permit, state}

  @impl NimblePool
  def handle_checkin(:ok, _from, permit, state), do: {:ok, permit, state}
end
