package provider

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httputil"
)

func hijackRequest[In any, Out any](r *httputil.ProxyRequest, mapFunc func(In) Out) error {
	b, err := io.ReadAll(r.Out.Body)
	if err != nil {
		return err
	}
	defer r.Out.Body.Close()

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
	return nil
}

func hijackResponse[In any, Out any](r *http.Response, mapFunc func(In) Out) error {
	b, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}
	defer r.Body.Close()

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
	return nil
}
