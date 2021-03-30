defmodule Watchman.Forge.Queries do
  @page_info """
    fragment PageInfo on PageInfo {
      end_cursor
      has_next_page
    }
  """

  @dashboard_fragment """
    fragment DashboardFragment on Dashboard {
      name
      uid
    }
  """

  @repository_fragment """
    fragment RepositoryFragment on Repository {
      id
      name
      icon
      description
      dashboards { ...DashboardFragment }
    }
    #{@dashboard_fragment}
  """

  @installation_fragment """
    fragment InstallationFragment on Installation {
      id
      repository { ...RepositoryFragment }
    }
    #{@repository_fragment}
  """

  @installation_query """
    query Installations($first: Int!, $cursor: String) {
      installations(first: $first, after: $cursor) {
        pageInfo { endCursor hasNextPage }
        edges {
          node { ...InstallationFragment }
        }
      }
    }
    #{@installation_fragment}
  """

  @incident_message_sub """
    subscription Incident($id: ID) {
      incidentMessageDelta(incidentId: $id) {
        delta
        payload { id text incident { id repository { name } } }
      }
    }
  """

  @create_message """
    mutation Create($incidentId: ID!, $attributes: IncidentMessageAttributes!) {
      createMessage(incidentId: $incidentId, attributes: $attributes) {
        id
      }
    }
  """

  @me_query """
    query {
      me { id }
    }
  """

  def installation_query(), do: @installation_query

  def external_token_mutation(), do: "mutation { externalToken }"

  def incident_message_subscription(), do: @incident_message_sub

  def create_message_mutation(), do: @create_message

  def me_query(), do: @me_query
end
