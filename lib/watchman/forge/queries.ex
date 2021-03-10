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
    subscription {
      incidentMessageDelta {
        delta
        payload { id text incident { id } }
      }
    }
  """

  def installation_query(), do: @installation_query

  def external_token_mutation(), do: "mutation { externalToken }"

  def incident_message_subscription(), do: @incident_message_sub
end
