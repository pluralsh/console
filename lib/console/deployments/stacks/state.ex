defmodule Console.Deployments.Stacks.State do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Schema.TerraformState

  def lock(%TerraformState.Lock{} = lock) do
    %{
      ID: lock.id,
      Operation: lock.operation,
      Info: lock.info,
      Who: lock.who,
      Path: lock.path,
      Created: lock.created
    }
  end

  def get_tf(stack_id), do: Repo.get_by(TerraformState, stack_id: stack_id)

  def get_terraform_state(stack_id, actor) do
    case get_tf(stack_id) do
      %TerraformState{} = state -> allow(state, actor, :state)
      nil ->
        stack = Console.Deployments.Stacks.get_stack!(stack_id)
        with {:ok, _} <- allow(stack, actor, :state),
          do: {:ok, nil}
    end
  end

  def update_terraform_state(state, lock_id \\ nil, stack_id, actor),
    do: upsert_terraform_state(%{state: state, lock_id: lock_id}, stack_id, actor)

  def lock_terraform_state(%{"id" => id} = lock_info, stack_id, actor) do
    case get_tf(stack_id) do
      nil -> upsert_terraform_state(%{lock: lock_info}, stack_id, actor)
      %TerraformState{lock: %{id: ^id}} = state -> set_lock(lock_info, state, actor)
      %TerraformState{lock: %{id: _} = lock} -> {:error, {:locked, lock}}
      state -> set_lock(lock_info, state, actor)
    end
  end

  def unlock_terraform_state(stack_id, actor) do
    get_tf(stack_id)
    |> TerraformState.changeset(%{lock: nil})
    |> allow(actor, :state)
    |> when_ok(:update)
  end

  defp upsert_terraform_state(attrs, stack_id, actor) do
    case get_tf(stack_id) do
      %TerraformState{} = state -> state
      _ -> %TerraformState{stack_id: stack_id}
    end
    |> TerraformState.changeset(attrs)
    |> allow(actor, :state)
    |> when_ok(&Repo.insert_or_update/1)
  end

  defp set_lock(lock_info, state, actor) do
    TerraformState.changeset(state, %{lock: lock_info})
    |> allow(actor, :state)
    |> when_ok(:update)
  end
end
