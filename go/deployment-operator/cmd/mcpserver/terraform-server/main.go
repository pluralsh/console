package main

import (
	"log"

	terraformserver "github.com/pluralsh/console/godeployment-operator/internal/mcpserver/terraform-server"
)

func main() {
	// Create MCP server
	server := terraformserver.NewTerraformMCPServer()

	// Start server
	if err := server.Start(); err != nil {
		log.Fatalf("Failed to start MCP server: %v", err)
	}
}
