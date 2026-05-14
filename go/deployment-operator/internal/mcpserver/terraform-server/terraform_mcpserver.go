package mcpserver

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/terraform-docs/terraform-docs/format"
	"github.com/terraform-docs/terraform-docs/print"
	"github.com/terraform-docs/terraform-docs/terraform"
)

type TerraformMCPServer struct {
	server *server.MCPServer
	dir    string
}

func NewTerraformMCPServer() *TerraformMCPServer {
	m := &TerraformMCPServer{
		server: server.NewMCPServer(
			"Terraform MCP Server",
			"1.0.0",
			server.WithToolCapabilities(true),
		),
	}

	m.registerTools()

	return m
}

func (m *TerraformMCPServer) Start() error {
	fmt.Println("Starting Terraform MCP Server...")
	fmt.Printf("Terraform directory: %s\n", m.dir)
	fmt.Println("Waiting for MCP client connection via stdio...")

	return server.ServeStdio(m.server)
}

func (m *TerraformMCPServer) registerTools() {
	// Primary tool for recursive module metadata
	moduleMetadataTool := mcp.NewTool("getTerraformModuleMetadata",
		mcp.WithDescription("Get comprehensive metadata about Terraform modules including inputs, outputs, providers, resources, and submodules recursively"),
		mcp.WithString("directory",
			mcp.Required(),
			mcp.Description("Path to the Terraform project root directory"),
		),
	)

	// Secondary tool for single module
	singleModuleTool := mcp.NewTool("getTerraformModuleInfo",
		mcp.WithDescription("Get metadata for a specific Terraform module without recursion"),
		mcp.WithString("directory",
			mcp.Required(),
			mcp.Description("Path to the specific Terraform module directory"),
		),
	)

	m.server.AddTool(moduleMetadataTool, m.moduleMetadataHandler)
	m.server.AddTool(singleModuleTool, m.singleModuleHandler)
}

func (m *TerraformMCPServer) moduleMetadataHandler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	dir, err := request.RequireString("directory")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Missing directory: %v", err)), nil
	}

	metadata, err := m.getTerraformMetadata(dir, true)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to get Terraform metadata: %v", err)), nil
	}

	return mcp.NewToolResultText(metadata), nil
}

func (m *TerraformMCPServer) singleModuleHandler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	dir, err := request.RequireString("directory")
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Missing directory: %v", err)), nil
	}

	metadata, err := m.getTerraformMetadata(dir, false)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("Failed to get Terraform metadata: %v", err)), nil
	}

	return mcp.NewToolResultText(metadata), nil
}

func (m *TerraformMCPServer) getTerraformMetadata(path string, recursive bool) (string, error) {
	config := print.DefaultConfig()
	config.ModuleRoot = path

	// Enable recursive processing for submodules
	if recursive {
		config.Recursive.Enabled = true
		config.Recursive.Path = "modules" // or configure as needed
	}

	module, err := terraform.LoadWithOptions(config)
	if err != nil {
		return "", err
	}

	// Generate in JSON format
	formatter := format.NewJSON(config)
	if err := formatter.Generate(module); err != nil {
		return "", err
	}

	return formatter.Content(), nil
}
