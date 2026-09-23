SHELL := /usr/bin/env bash

IMAGE ?= embedding-server:local
MODEL_ID ?= nomic-ai/nomic-embed-text-v1.5
MODEL_REVISION ?= e9b6763023c676ca8431644204f50c2b100d9aab
SERVED_MODEL_NAME ?= nomic-ai/nomic-embed-text-v1.5
TEI_VERSION ?= 1.9.4
IMAGE_VERSION ?= dev
GIT_COMMIT ?= $(shell git rev-parse HEAD 2>/dev/null || echo unknown)
PLATFORM ?=

HOST_ARCH := $(shell uname -m)
PLATFORM_ARCH := $(word 2,$(subst /, ,$(PLATFORM)))
TARGET_ARCH := $(if $(PLATFORM),$(if $(PLATFORM_ARCH),$(PLATFORM_ARCH),$(PLATFORM)),$(HOST_ARCH))
ifeq ($(filter arm64 aarch64,$(TARGET_ARCH)),$(TARGET_ARCH))
TEI_IMAGE ?= ghcr.io/huggingface/text-embeddings-inference:cpu-arm64-1.9@sha256:7a1b4aa11c491f39cea38eb0a210afe68a78dd5edee11c8f44f46c3529b27cd8
else
TEI_IMAGE ?= ghcr.io/huggingface/text-embeddings-inference:cpu-1.9@sha256:8419f533857b503ebf6ec292a95d4f1cf9c0464ac8b8abeef39518cf110e5726
endif

DOCKER ?= docker
DOCKER_PLATFORM := $(if $(PLATFORM),--platform $(PLATFORM),)
BUILD_ARGS := \
	--build-arg MODEL_ID=$(MODEL_ID) \
	--build-arg MODEL_REVISION=$(MODEL_REVISION) \
	--build-arg SERVED_MODEL_NAME=$(SERVED_MODEL_NAME) \
	--build-arg TEI_IMAGE=$(TEI_IMAGE) \
	--build-arg TEI_VERSION=$(TEI_VERSION) \
	--build-arg IMAGE_VERSION=$(IMAGE_VERSION) \
	--build-arg GIT_COMMIT=$(GIT_COMMIT)

.PHONY: build run smoke-test test help

build:
	$(DOCKER) build $(DOCKER_PLATFORM) $(BUILD_ARGS) --tag $(IMAGE) .

run: build
	$(DOCKER) run --rm --publish 8080:80 $(IMAGE)

smoke-test: build
	IMAGE=$(IMAGE) SERVED_MODEL_NAME=$(SERVED_MODEL_NAME) ./scripts/smoke-test.sh

test: smoke-test

help:
	@printf '%s\n' \
		'make build        Build the pinned, model-baked image' \
		'make run          Build and run the server on localhost:8080' \
		'make smoke-test   Build and run the network-isolated API smoke test' \
		'make test         Alias for smoke-test' \
		'' \
		'Override MODEL_ID, MODEL_REVISION, SERVED_MODEL_NAME, TEI_IMAGE,' \
		'TEI_VERSION, IMAGE_VERSION, GIT_COMMIT, IMAGE, or PLATFORM as needed.'
