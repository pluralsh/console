package client

import (
	"context"
	"net/http"
	"reflect"
	"testing"
)

// dashboardResponse returns a dashboard as Console returns it: graph options and datasource inputs are JSON objects.
func dashboardResponse(operation string) string {
	return `{"data":{"` + operation + `":{
		"id":"dashboard-id",
		"name":"overview",
		"graphs":[
			{
				"identifier":"requests",
				"type":"TIMESERIES",
				"options":{"stacked":true,"legend":{"position":"bottom"}},
				"layout":{"x":0,"y":0,"w":6,"h":4},
				"datasource":{"type":"METRICS","tool":"prometheus","input":{"query":"up"}}
			},
			{
				"identifier":"overview",
				"type":"SECTION",
				"options":null,
				"layout":{"x":0,"y":4,"w":12,"h":1}
			}
		],
		"inputs":[
			{
				"name":"namespace",
				"type":"SELECT",
				"datasource":{"type":"LABELS","tool":"prometheus","input":{"metric":"kube_pod_info","label":"namespace"}}
			}
		]
	}}}`
}

func TestDashboardResponsesDecodeJSONObjects(t *testing.T) {
	tests := []struct {
		operation string
		call      func(ConsoleClient) (*WorkbenchDashboardFragment, error)
	}{
		{
			operation: "workbenchDashboard",
			call: func(c ConsoleClient) (*WorkbenchDashboardFragment, error) {
				response, err := c.GetWorkbenchDashboard(context.Background(), "dashboard-id")
				if err != nil {
					return nil, err
				}
				return response.WorkbenchDashboard, nil
			},
		},
		{
			operation: "createDashboard",
			call: func(c ConsoleClient) (*WorkbenchDashboardFragment, error) {
				response, err := c.CreateDashboard(context.Background(), DashboardAttributes{})
				if err != nil {
					return nil, err
				}
				return response.CreateDashboard, nil
			},
		},
		{
			operation: "updateDashboard",
			call: func(c ConsoleClient) (*WorkbenchDashboardFragment, error) {
				response, err := c.UpdateDashboard(context.Background(), "dashboard-id", DashboardAttributes{})
				if err != nil {
					return nil, err
				}
				return response.UpdateDashboard, nil
			},
		},
	}

	for _, test := range tests {
		t.Run(test.operation, func(t *testing.T) {
			server := newGraphQLTestServer(http.StatusOK, dashboardResponse(test.operation))
			defer server.Close()

			dashboard, err := test.call(NewClient(server.Client(), server.URL, nil))
			if err != nil {
				t.Fatalf("failed to decode dashboard response: %v", err)
			}
			if dashboard == nil || len(dashboard.Graphs) != 2 || len(dashboard.Inputs) != 1 {
				t.Fatalf("unexpected dashboard: %+v", dashboard)
			}

			graph := dashboard.Graphs[0]
			expectDecoded(t, "graph options", graph.Options, map[string]any{"stacked": true, "legend": map[string]any{"position": "bottom"}})
			expectDecoded(t, "graph datasource input", graph.Datasource.Input, map[string]any{"query": "up"})

			if section := dashboard.Graphs[1]; section.Options != nil || section.Datasource != nil {
				t.Fatalf("expected null options and missing datasource to decode as nil, got %+v", section)
			}

			input := dashboard.Inputs[0]
			expectDecoded(t, "input datasource input", input.Datasource.Input, map[string]any{"metric": "kube_pod_info", "label": "namespace"})
		})
	}
}

func expectDecoded(t *testing.T, name string, actual, expected map[string]any) {
	t.Helper()

	if !reflect.DeepEqual(actual, expected) {
		t.Fatalf("expected %s to decode as %v, got %v", name, expected, actual)
	}
}
