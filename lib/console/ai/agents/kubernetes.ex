defmodule Console.AI.Agents.Kubernetes do
  use Console.AI.Agents.Base
  alias Console.Schema.AgentSession

  def handle_cast(
    {:enqueue, :booted},
    {_, %AgentSession{service_id: id} = session}
  ) when is_binary(id) do
    Logger.info "handling booted kubernetes agent, proceeding to pr generation #{session.id}"
    {thread, session} = setup_context(session)
    Logger.info "context resetup for #{session.id}"
    drive(thread, [
      {:user, """
      Ok we've found the needed files, now create a pr for this to solve for:

      #{session.prompt}
      """}
    ], thread.user)
    |> handle_result(thread, session)
  end

  def handle_cast(_, state), do: {:noreply, state}
end
