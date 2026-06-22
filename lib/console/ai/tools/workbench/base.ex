defmodule Console.AI.Tools.Workbench.Base do
  alias Console.Schema.{Service, WorkbenchJob}

  defmacro __using__(_) do
    quote do
      use Ecto.Schema
      import Ecto.Changeset
      import Console.AI.Tools.Workbench.Base
    end
  end

  def check_flow(%Service{flow_id: id} = svc, %WorkbenchJob{flow_id: id}), do: {:ok, svc}
  def check_flow(_, %WorkbenchJob{flow_id: id}) when is_binary(id), do: {:error, "this service is not associated with the job's flow"}
  def check_flow(svc, _), do: {:ok, svc}

  defguard nonempty_string(str) when is_binary(str) and byte_size(str) > 0
end
