defmodule Console.Plural.Incidents do
  use Console.Plural.Base
  alias Console.Plural.{Incident}

  defmodule Query, do: defstruct [:incident]
  defmodule Mutation, do: defstruct [:createMessage, :createIncident, :updateIncident]

  def create_message(incident_id, text) do
    create_message_mutation()
    |> Client.run(
      %{incidentId: incident_id, attributes: %{text: text}},
      %Mutation{}
    )
  end

  def get_incident(id) do
    get_incident_query()
    |> Client.run(%{id: id}, %Query{incident: %Incident{}})
    |> when_ok(& &1.incident)
  end

  def create_incident(repo, attrs) do
    create_incident_mutation()
    |> Client.run(%{repository: repo, attributes: attrs}, %Mutation{createIncident: %Incident{}})
    |> when_ok(& &1.createIncident)
  end

  def update_incident(id, attrs) do
    update_incident_mutation()
    |> Client.run(%{id: id, attributes: attrs}, %Mutation{updateIncident: %Incident{}})
    |> when_ok(& &1.updateIncident)
  end
end
