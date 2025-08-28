package provider

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httputil"
)

func replaceRequestBody[In any, Out any](r *httputil.ProxyRequest, mapFunc func(In) Out) error {
	b, err := io.ReadAll(r.Out.Body)
	if err != nil {
		return err
	}
	defer func() {
		if cerr := r.Out.Body.Close(); cerr != nil && err == nil {
			err = cerr
		}
	}()

	var in In
	err = json.Unmarshal(b, &in)
	if err != nil {
		return err
	}

	out := mapFunc(in)
	outBytes, err := json.Marshal(out)
	if err != nil {
		return err
	}

	r.Out.ContentLength = int64(len(outBytes))
	r.Out.Body = io.NopCloser(bytes.NewReader(outBytes))
	return err
}

func replaceResponseBody[In any, Out any](r *http.Response, mapFunc func(In) Out) error {
	b, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}
	defer func() {
		if cerr := r.Body.Close(); cerr != nil && err == nil {
			err = cerr
		}
	}()

	var in In
	err = json.Unmarshal(b, &in)
	if err != nil {
		return err
	}

	out := mapFunc(in)
	outBytes, err := json.Marshal(out)
	if err != nil {
		return err
	}

	r.ContentLength = int64(len(outBytes))
	r.Body = io.NopCloser(bytes.NewReader(outBytes))
	return err
}
