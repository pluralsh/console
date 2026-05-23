package tool

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/pluralsh/console/go/deployment-operator/internal/mcpserver/agent/exa"
)

type WebSearchExa struct {
	id          ID
	description string
	client      *exa.Client
}

func NewWebSearchExa(client *exa.Client) *WebSearchExa {
	return &WebSearchExa{
		id: WebSearchExaTool,
		description: `Search the web for any topic and get clean, ready-to-use content.

Best for: Finding current information, news, facts, people, companies, or answering questions about any topic.
Returns: YAML encoding of the Exa /search API response.

Query tips:
describe the ideal page, not keywords. "blog post comparing React and Vue performance" not "React vs Vue".
Use category:people / category:company to search through Linkedin profiles / companies respectively.
If highlights are insufficient, follow up with web_fetch_exa on the best URLs.`,
		client: client,
	}
}

func (in *WebSearchExa) ID() ID { return in.id }

func (in *WebSearchExa) Install(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithString("query",
				mcp.Required(),
				mcp.Description("Natural language search query. Should be a semantically rich description of the ideal page, not just keywords. Optionally include category:<type> (company, people) to focus results."),
			),
			mcp.WithNumber("numResults",
				mcp.Description("Number of search results to return (default: 10, max: 100)."),
			),
		),
		in.handler,
	)
}

func (in *WebSearchExa) handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	query, err := request.RequireString("query")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("missing query: %v", err)), nil
	}

	args := request.GetArguments()

	numResults := 0
	if raw, ok := args["numResults"]; ok {
		switch v := raw.(type) {
		case float64:
			numResults = int(v)
		case int:
			numResults = v
		}
	}

	text, err := in.client.Search(ctx, query, numResults)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("exa search failed: %v", err)), nil
	}

	return mcp.NewToolResultText(text), nil
}

type WebFetchExa struct {
	id          ID
	description string
	client      *exa.Client
}

func NewWebFetchExa(client *exa.Client) *WebFetchExa {
	return &WebFetchExa{
		id: WebFetchExaTool,
		description: `Read a webpage's full content as clean markdown. Use after web_search_exa when highlights are insufficient or to read any URL.

Best for: Extracting full content from known URLs. Batch multiple URLs in one call.
Returns: YAML encoding of the Exa /contents API response.`,
		client: client,
	}
}

func (in *WebFetchExa) ID() ID { return in.id }

func (in *WebFetchExa) Install(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithArray("urls",
				mcp.Required(),
				mcp.Description("URLs to read. Batch multiple URLs in one call."),
			),
			mcp.WithNumber("maxCharacters",
				mcp.Description("Maximum characters to extract per page (default: 3000)."),
			),
		),
		in.handler,
	)
}

func (in *WebFetchExa) handler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := request.GetArguments()

	rawURLs, ok := args["urls"]
	if !ok {
		return mcp.NewToolResultError("missing urls"), nil
	}

	urls, err := parseStringArray(rawURLs)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("invalid urls: %v", err)), nil
	}

	maxCharacters := 0
	if raw, ok := args["maxCharacters"]; ok {
		switch v := raw.(type) {
		case float64:
			maxCharacters = int(v)
		case int:
			maxCharacters = v
		}
	}

	text, err := in.client.FetchContents(ctx, urls, maxCharacters)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("exa fetch failed: %v", err)), nil
	}

	return mcp.NewToolResultText(text), nil
}

func parseStringArray(raw any) ([]string, error) {
	switch v := raw.(type) {
	case []any:
		result := make([]string, 0, len(v))
		for _, item := range v {
			s, ok := item.(string)
			if !ok {
				return nil, fmt.Errorf("expected string array")
			}
			result = append(result, s)
		}
		return result, nil
	case []string:
		return v, nil
	case string:
		return []string{v}, nil
	default:
		return nil, fmt.Errorf("expected string array")
	}
}
