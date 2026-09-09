// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	restfulspec "github.com/emicklei/go-restful-openapi/v2"
	"github.com/emicklei/go-restful/v3"
	"github.com/spf13/pflag"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/kubernetes-agent/api/pkg/args"
	"github.com/pluralsh/console/go/kubernetes-agent/api/pkg/resource/logs"
)

func TestCreateHTTPAPIHandler(t *testing.T) {
	_, err := CreateHTTPAPIHandler(nil)
	if err != nil {
		t.Fatal("CreateHTTPAPIHandler() cannot create HTTP API handler")
	}
}

func TestCreateHTTPAPIHandler_LogRouteParameters(t *testing.T) {
	container, err := CreateHTTPAPIHandler(nil)
	if err != nil {
		t.Fatalf("CreateHTTPAPIHandler() error = %v", err)
	}

	swagger := restfulspec.BuildSwagger(restfulspec.Config{
		WebServices: container.RegisteredWebServices(),
	})

	expected := map[string]struct {
		dataType    string
		description string
	}{
		"referenceTimestamp": {
			dataType:    "string",
			description: "timestamp of the reference log line",
		},
		"referenceLineNum": {
			dataType:    "integer",
			description: "line number of the reference log line",
		},
		"offsetFrom": {
			dataType:    "integer",
			description: "inclusive offset from the reference log line",
		},
		"offsetTo": {
			dataType:    "integer",
			description: "exclusive offset from the reference log line",
		},
		"logFilePosition": {
			dataType:    "string",
			description: "position to load logs from: beginning or end",
		},
		"tailLines": {
			dataType:    "integer",
			description: "maximum number of lines to load from the end of the log",
		},
		"previous": {
			dataType:    "boolean",
			description: "return logs from the previous container instance",
		},
	}

	routes := []struct {
		name string
		path string
	}{
		{
			name: "pod",
			path: "/api/v1/log/{namespace}/{pod}",
		},
		{
			name: "container",
			path: "/api/v1/log/{namespace}/{pod}/{container}",
		},
	}

	for _, route := range routes {
		t.Run(route.name, func(t *testing.T) {
			path, ok := swagger.Paths.Paths[route.path]
			if !ok || path.Get == nil {
				t.Fatal("log route is not included in the OpenAPI specification")
			}

			missing := make(map[string]struct{}, len(expected))
			for name := range expected {
				missing[name] = struct{}{}
			}

			for _, parameter := range path.Get.Parameters {
				want, ok := expected[parameter.Name]
				if !ok {
					continue
				}

				if parameter.In != "query" {
					t.Errorf("parameter %q location = %q, want query", parameter.Name, parameter.In)
				}
				if parameter.Type != want.dataType {
					t.Errorf("parameter %q type = %q, want %q", parameter.Name, parameter.Type, want.dataType)
				}
				if parameter.Description != want.description {
					t.Errorf("parameter %q description = %q, want %q", parameter.Name, parameter.Description, want.description)
				}
				if parameter.Name == "tailLines" {
					if parameter.Minimum == nil || *parameter.Minimum != 1 {
						t.Errorf("tailLines minimum = %v, want 1", parameter.Minimum)
					}
					if parameter.Maximum == nil || *parameter.Maximum != float64(logs.MaxTailLines) {
						t.Errorf("tailLines maximum = %v, want %d", parameter.Maximum, logs.MaxTailLines)
					}
					if parameter.Default != int64(logs.DefaultTailLines) {
						t.Errorf("tailLines default = %#v, want %d", parameter.Default, logs.DefaultTailLines)
					}
				}
				delete(missing, parameter.Name)
			}

			for name := range missing {
				t.Errorf("OpenAPI specification is missing query parameter %q", name)
			}
		})
	}
}

func TestCreateHTTPAPIHandler_ResourceUpdateBodySchema(t *testing.T) {
	container, err := CreateHTTPAPIHandler(nil)
	if err != nil {
		t.Fatalf("CreateHTTPAPIHandler() error = %v", err)
	}

	swagger := restfulspec.BuildSwagger(restfulspec.Config{
		WebServices: container.RegisteredWebServices(),
	})

	jsonDefinition, ok := swagger.Definitions["handler.JSON"]
	if !ok {
		t.Fatal("OpenAPI specification is missing the JSON request body definition")
	}
	if len(jsonDefinition.Type) != 1 || jsonDefinition.Type[0] != "object" {
		t.Errorf("JSON definition type = %v, want [object]", jsonDefinition.Type)
	}

	for _, path := range []string{
		"/api/v1/_raw/{kind}/namespace/{namespace}/name/{name}",
		"/api/v1/_raw/{kind}/name/{name}",
	} {
		pathItem, ok := swagger.Paths.Paths[path]
		if !ok || pathItem.Put == nil {
			t.Fatalf("resource update route %q is not included in the OpenAPI specification", path)
		}

		var bodySchemaRef string
		for _, parameter := range pathItem.Put.Parameters {
			if parameter.In == "body" {
				bodySchemaRef = parameter.Schema.Ref.String()
				break
			}
		}
		if bodySchemaRef != "#/definitions/handler.JSON" {
			t.Errorf("resource update body schema = %q, want %q", bodySchemaRef, "#/definitions/handler.JSON")
		}
	}
}

func TestShouldDoCsrfValidation(t *testing.T) {
	cases := []struct {
		request  *restful.Request
		expected bool
	}{
		{
			&restful.Request{
				Request: &http.Request{
					Method: "PUT",
				},
			},
			false,
		},
		{
			&restful.Request{
				Request: &http.Request{
					Method: "POST",
				},
			},
			true,
		},
	}
	for _, c := range cases {
		actual := shouldDoCsrfValidation(c.request)
		if actual != c.expected {
			t.Errorf("shouldDoCsrfValidation(%#v) returns %#v, expected %#v", c.request, actual, c.expected)
		}
	}
}

func TestFormatRequestLog(t *testing.T) {
	cases := []struct {
		method      string
		uri         string
		content     map[string]string
		expected    string
		apiLogLevel klog.Level
	}{
		{
			"PUT",
			"/api/v1/pod",
			map[string]string{},
			"Incoming HTTP/1.1 PUT /api/v1/pod request",
			args.LogLevelDefault,
		},
		{
			"PUT",
			"/api/v1/pod",
			map[string]string{},
			"",
			args.LogLevelMinimal,
		},
		{
			"POST",
			"/api/v1/login",
			map[string]string{"password": "abc123"},
			"Incoming HTTP/1.1 POST /api/v1/login request from { content hidden }: { content hidden }",
			args.LogLevelDefault,
		},
		{
			"POST",
			"/api/v1/login",
			map[string]string{},
			"",
			args.LogLevelMinimal,
		},
		{
			"POST",
			"/api/v1/login",
			map[string]string{"password": "abc123"},
			"Incoming HTTP/1.1 POST /api/v1/login request from : {\"password\":\"abc123\"}",
			args.LogLevelDebug,
		},
	}

	for _, c := range cases {
		jsonValue, _ := json.Marshal(c.content)

		req, err := http.NewRequest(c.method, c.uri, bytes.NewReader(jsonValue))
		req.Header.Set("Content-Type", "application/json")

		if err != nil {
			t.Error("Cannot mockup request")
		}

		_ = pflag.Set("v", c.apiLogLevel.String())

		var restfulRequest restful.Request
		restfulRequest.Request = req

		actual := formatRequestLog(&restfulRequest)
		if !strings.Contains(actual, c.expected) {
			t.Errorf("formatRequestLog(%#v) returns %#v, expected to contain %#v", req, actual, c.expected)
		}
	}
}
