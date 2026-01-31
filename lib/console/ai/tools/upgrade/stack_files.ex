defmodule Console.AI.Tools.Upgrade.Coding.StackFiles do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{Stack, User}
  alias Console.Deployments.Stacks
  alias Console.AI.Fixer.Stack, as: StackFixer

  embedded_schema do
    field :stack_id, :string
  end

  @valid ~w(stack_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:stack_id)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/agent/coding/stack_files.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("stack_files")
  def description(), do: "Finds the terraform files for a stack and renders them as a yaml list"

  def implement(%__MODULE__{stack_id: id}) do
    Console.AI.Fixer.Base.raw()
    with %Stack{} = stack <- Stacks.get_stack(id) |> Console.Repo.preload([:repository]),
         %User{} = user <- Tool.actor(),
         {:ok, stack} <- Policies.allow(stack, user, :write),
         {:ok, details} <- StackFixer.healthy_prompt(stack) do
      Jason.encode(details)
    else
      {:error, err} ->
        {:error, "failed to get stack files, reason: #{inspect(err)}"}
      nil ->
        {:error, "could not find stack with id #{id}"}
    end
  end
end
