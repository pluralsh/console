local result, err = utils.merge(base, patch)
values["items"] = result["metadata"]["finalizers"]