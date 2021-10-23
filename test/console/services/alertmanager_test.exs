defmodule Console.Services.AlertmanagerTest do
  use Console.DataCase, async: true
  use Mimic
  import KubernetesScaffolds

  alias Alertmanager.Alert
  alias Console.Services.Alertmanager
  alias Console.Alertmanager.Incidents
  alias Console.Plural.Queries

  describe "#handle_alert/1" do
    test "new alerts create incidents" do
      alert = %Alert{
        status: :firing,
        name: "alertname",
        summary: "some summary",
        description: "some description",
        fingerprint: "adsfsfasd",
        labels: %{"namespace" => "repo", "severity" => "critical"}
      }

      version = version_info()
      expect(Kazan, :run, fn _ -> {:ok, version} end)

      body = Jason.encode!(%{
        query: Queries.create_incident_mutation(),
        variables: %{repository: "repo", attributes: %{
          title: alert.summary,
          description: Incidents.description(alert.description),
          severity: 1,
          tags: [%{tag: "alertmanager"}, %{tag: "console"}],
          cluster_information: Map.take(version, [:git_commit, :platform, :version])
        }}
      })

      id = Ecto.UUID.generate()
      expect(HTTPoison, :post, fn
        _, ^body, _ ->
          {:ok, %{body: Jason.encode!(%{data: %{createIncident: %{id: id}}})}}
      end)

      %{incident: mapping, notification: notif} = Alertmanager.handle_alert(alert)

      assert mapping.fingerprint == alert.fingerprint
      assert mapping.incident_id == id

      assert notif.title == alert.summary
      assert notif.fingerprint == alert.fingerprint
      assert notif.seen_at
    end

    test "it will update existing, mapped incidents" do
      mapping = insert(:alertmanager_incident, fingerprint: "print")
      alert = %Alert{
        status: :firing,
        name: "alertname",
        summary: "some summary",
        description: "some description",
        fingerprint: "print",
        labels: %{"namespace" => "repo", "severity" => "critical"}
      }

      get_body = Jason.encode!(%{
        query: Queries.get_incident_query(),
        variables: %{id: mapping.incident_id}
      })
      incident = %{
        id: mapping.incident_id,
        status: "RESOLVED"
      }

      update_body = Jason.encode!(%{
        query: Queries.update_incident_mutation(),
        variables: %{id: mapping.incident_id, attributes: %{
          title: alert.summary,
          description: Incidents.description(alert.description),
          status: "IN_PROGRESS",
        }}
      })

      expect(HTTPoison, :post, 2, fn
        _, ^get_body, _ -> {:ok, %{body: Jason.encode!(%{data: %{incident: incident}})}}
        _, ^update_body, _ -> {:ok, %{
          body: Jason.encode!(%{
            data: %{updateIncident: Map.put(incident, :status, "IN_PROGRESS")}
          })}
        }
      end)

      %{incident: result} = Alertmanager.handle_alert(alert)

      assert result.id == mapping.incident_id
      assert result.status == "IN_PROGRESS"
    end

    test "it will ignore if an existing incident is still in progress" do
      mapping = insert(:alertmanager_incident, fingerprint: "print")
      alert = %Alert{
        status: :firing,
        name: "alertname",
        summary: "some summary",
        description: "some description",
        fingerprint: "print",
        labels: %{"namespace" => "repo", "severity" => "critical"}
      }

      get_body = Jason.encode!(%{
        query: Queries.get_incident_query(),
        variables: %{id: mapping.incident_id}
      })

      incident = %{
        id: mapping.incident_id,
        status: "IN_PROGRESS"
      }

      update_body = Jason.encode!(%{
        query: Queries.update_incident_mutation(),
        variables: %{id: mapping.incident_id, attributes: %{
          title: alert.summary,
          description: Incidents.description(alert.description)
        }}
      })

      expect(HTTPoison, :post, 2, fn
        _, ^get_body, _ -> {:ok, %{body: Jason.encode!(%{data: %{incident: incident}})}}
        _, ^update_body, _ -> {:ok, %{
          body: Jason.encode!(%{
            data: %{updateIncident: Map.put(incident, :status, "IN_PROGRESS")}
          })}
        }
      end)

      %{incident: result} = Alertmanager.handle_alert(alert)

      assert result.id == mapping.incident_id
      assert result.status == "IN_PROGRESS"
    end
  end
end
