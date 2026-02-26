.PHONY: --image-debug
--image-debug: APP_VERSION = debug
--image-debug: --ensure-variables-set --image

.PHONY: --image
--image: --ensure-variables-set
	@VERSION="latest" ; \
	if [ ! -z $(APP_VERSION) ] ; then \
  		VERSION="$(APP_VERSION)" ; \
    fi ; \
	echo "Building '$(APP_NAME):$${VERSION}'" ; \
	docker build \
		-f $(DOCKERFILE) \
		-t $(APP_NAME):$${VERSION} \
		$(ROOT_DIRECTORY) ; \

.PHONY: --ensure-variables-set
--ensure-variables-set:
	@if [ -z "$(DOCKERFILE)" ]; then \
  	echo "DOCKERFILE variable not set" ; \
  	exit 1 ; \
  fi ; \
	if [ -z "$(APP_NAME)" ]; then \
		echo "APP_NAME variable not set" ; \
		exit 1 ; \
	fi ; \