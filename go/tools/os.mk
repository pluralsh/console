PROTOC_OS := ""
UNAME_S := $(shell go env GOOS)
ifeq ($(UNAME_S),linux)
	PROTOC_OS = "linux"
endif
ifeq ($(UNAME_S),darwin)
	PROTOC_OS = "osx"
endif

PROTOC_ARCH := ""
UNAME_P := $(shell go env GOARCH)
ifeq ($(UNAME_P),amd64)
	PROTOC_ARCH = "x86_64"
endif
ifeq ($(UNAME_P),arm64)
	PROTOC_ARCH = "aarch_64"
endif
ifeq ($(UNAME_P),386)
	PROTOC_ARCH = "x86_32"
endif
