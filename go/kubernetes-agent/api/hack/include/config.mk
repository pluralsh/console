### Application details
APP_NAME := $(PROJECT_NAME)-api

### Dirs and paths
API_DIST_DIR = $(API_DIR)/.dist
API_DIST_BINARY = $(API_DIST_DIR)/$(APP_NAME)
SCHEMA_DIRECTORY = $(API_DIR)/schema

### Codegen configuration
INPUT = "apis/v1alpha1"
CLIENTSET_NAME = clientset
OUTPUT_BASE = $(BASE_DIR)
OUTPUT_PACKAGE = $(INPUT_BASE)/client
VERIFY_ONLY = false
CODEGEN_EXTRA_ARGS = ""

### API Arguments (overridable)
KUBECONFIG ?= $(HOME)/.kube/config
SIDECAR_HOST ?= http://scraper:8000
AUTO_GENERATE_CERTIFICATES ?= false
BIND_ADDRESS ?= 127.0.0.1
PORT ?= 8000
