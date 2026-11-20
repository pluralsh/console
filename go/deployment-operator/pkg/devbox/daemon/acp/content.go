package acp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"google.golang.org/protobuf/types/known/structpb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// TextType is the type of ACP text content blocks and of text command inputs.
const TextType = "text"

// ---------------------------------------------------------------------------------------------------------------
// ACP JSON -> proto. These build the typed, best-effort `body` views; the verbatim JSON is always kept alongside.
// ---------------------------------------------------------------------------------------------------------------

// MetaStruct converts an `_meta` value into a Struct, or nil.
func MetaStruct(o Object) *structpb.Struct {
	m := Obj(o, "_meta")
	if m == nil {
		return nil
	}
	s, err := structpb.NewStruct(m)
	if err != nil {
		return nil
	}
	return s
}

// StructOf converts an arbitrary object into a Struct, or nil.
func StructOf(m Object) *structpb.Struct {
	if m == nil {
		return nil
	}
	s, err := structpb.NewStruct(m)
	if err != nil {
		return nil
	}
	return s
}

// ValueOf converts an arbitrary JSON value into a Value, or nil when absent.
func ValueOf(v any, present bool) *structpb.Value {
	if !present {
		return nil
	}
	val, err := structpb.NewValue(v)
	if err != nil {
		return nil
	}
	return val
}

func unknownOf(o Object, discriminator string) *devboxv1.UnknownVariant {
	return &devboxv1.UnknownVariant{Type: Str(o, discriminator), RawJson: MustJSON(o)}
}

func annotationsOf(o Object) *devboxv1.Annotations {
	a := Obj(o, "annotations")
	if a == nil {
		return nil
	}
	out := &devboxv1.Annotations{LastModified: Str(a, "lastModified"), Meta: MetaStruct(a)}
	for _, v := range Arr(a, "audience") {
		if s, ok := v.(string); ok {
			out.Audience = append(out.Audience, s)
		}
	}
	if p, ok := Float(a, "priority"); ok {
		out.Priority = &p
	}
	return out
}

// ContentBlockOf converts an ACP ContentBlock. Unknown `type`s become UnknownVariant with the raw object.
func ContentBlockOf(v any) *devboxv1.ContentBlock {
	o, ok := v.(map[string]any)
	if !ok {
		return &devboxv1.ContentBlock{Block: &devboxv1.ContentBlock_Unknown{Unknown: &devboxv1.UnknownVariant{RawJson: MustJSON(v)}}}
	}
	switch Str(o, "type") {
	case TextType:
		return &devboxv1.ContentBlock{Block: &devboxv1.ContentBlock_Text{Text: &devboxv1.TextContent{
			Text: Str(o, "text"), Annotations: annotationsOf(o), Meta: MetaStruct(o),
		}}}
	case "image":
		return &devboxv1.ContentBlock{Block: &devboxv1.ContentBlock_Image{Image: &devboxv1.ImageContent{
			Data: Str(o, "data"), MimeType: Str(o, "mimeType"), Uri: Str(o, "uri"), Annotations: annotationsOf(o), Meta: MetaStruct(o),
		}}}
	case "audio":
		return &devboxv1.ContentBlock{Block: &devboxv1.ContentBlock_Audio{Audio: &devboxv1.AudioContent{
			Data: Str(o, "data"), MimeType: Str(o, "mimeType"), Annotations: annotationsOf(o), Meta: MetaStruct(o),
		}}}
	case "resource_link":
		rl := &devboxv1.ResourceLink{
			Uri: Str(o, "uri"), Name: Str(o, "name"), Title: Str(o, "title"), Description: Str(o, "description"),
			MimeType: Str(o, "mimeType"), Annotations: annotationsOf(o), Meta: MetaStruct(o),
		}
		if size, ok := Int(o, "size"); ok {
			rl.Size = &size
		}
		return &devboxv1.ContentBlock{Block: &devboxv1.ContentBlock_ResourceLink{ResourceLink: rl}}
	case "resource":
		er := &devboxv1.EmbeddedResource{Annotations: annotationsOf(o), Meta: MetaStruct(o)}
		res := Obj(o, "resource")
		switch {
		case res != nil && Has(res, "text"):
			er.Resource = &devboxv1.EmbeddedResource_Text{Text: &devboxv1.TextResourceContents{
				Uri: Str(res, "uri"), MimeType: Str(res, "mimeType"), Text: Str(res, "text"), Meta: MetaStruct(res),
			}}
		case res != nil && Has(res, "blob"):
			er.Resource = &devboxv1.EmbeddedResource_Blob{Blob: &devboxv1.BlobResourceContents{
				Uri: Str(res, "uri"), MimeType: Str(res, "mimeType"), Blob: Str(res, "blob"), Meta: MetaStruct(res),
			}}
		default:
			er.Resource = &devboxv1.EmbeddedResource_Unknown{Unknown: &devboxv1.UnknownVariant{RawJson: MustJSON(res)}}
		}
		return &devboxv1.ContentBlock{Block: &devboxv1.ContentBlock_Resource{Resource: er}}
	default:
		return &devboxv1.ContentBlock{Block: &devboxv1.ContentBlock_Unknown{Unknown: unknownOf(o, "type")}}
	}
}

// ContentBlocksOf converts a JSON array of ContentBlocks.
func ContentBlocksOf(arr []any) []*devboxv1.ContentBlock {
	out := make([]*devboxv1.ContentBlock, 0, len(arr))
	for _, v := range arr {
		out = append(out, ContentBlockOf(v))
	}
	return out
}

// ToolCallContentOf converts ACP tool call content.
func ToolCallContentOf(v any) *devboxv1.ToolCallContent {
	o, ok := v.(map[string]any)
	if !ok {
		return &devboxv1.ToolCallContent{Content: &devboxv1.ToolCallContent_Unknown{Unknown: &devboxv1.UnknownVariant{RawJson: MustJSON(v)}}}
	}
	switch Str(o, "type") {
	case "content":
		return &devboxv1.ToolCallContent{Content: &devboxv1.ToolCallContent_Block{Block: ContentBlockOf(o["content"])}}
	case "diff":
		d := &devboxv1.Diff{Path: Str(o, "path"), NewText: Str(o, "newText"), Meta: MetaStruct(o)}
		if old, ok := o["oldText"].(string); ok {
			d.OldText = &old
		}
		return &devboxv1.ToolCallContent{Content: &devboxv1.ToolCallContent_Diff{Diff: d}}
	case "terminal":
		return &devboxv1.ToolCallContent{Content: &devboxv1.ToolCallContent_Terminal{Terminal: &devboxv1.TerminalRef{
			TerminalId: Str(o, "terminalId"), Meta: MetaStruct(o),
		}}}
	default:
		return &devboxv1.ToolCallContent{Content: &devboxv1.ToolCallContent_Unknown{Unknown: unknownOf(o, "type")}}
	}
}

// ToolCallOf converts an ACP tool call (or merged tool_call_update state).
func ToolCallOf(o Object) *devboxv1.ToolCall {
	tc := &devboxv1.ToolCall{
		ToolCallId: Str(o, "toolCallId"),
		Title:      Str(o, "title"),
		Kind:       Str(o, "kind"),
		Status:     Str(o, "status"),
		RawInput:   ValueOf(o["rawInput"], Has(o, "rawInput")),
		RawOutput:  ValueOf(o["rawOutput"], Has(o, "rawOutput")),
		Meta:       MetaStruct(o),
	}
	for _, c := range Arr(o, "content") {
		tc.Content = append(tc.Content, ToolCallContentOf(c))
	}
	for _, l := range Arr(o, "locations") {
		lo, ok := l.(map[string]any)
		if !ok {
			continue
		}
		loc := &devboxv1.ToolCallLocation{Path: Str(lo, "path"), Meta: MetaStruct(lo)}
		if line, ok := Int(lo, "line"); ok {
			loc.Line = &line
		}
		tc.Locations = append(tc.Locations, loc)
	}
	return tc
}

// PlanOf converts a plan entity.
func PlanOf(o Object) *devboxv1.PlanEntity {
	p := &devboxv1.PlanEntity{PlanId: Str(o, "planId"), Meta: MetaStruct(o)}
	for _, e := range Arr(o, "entries") {
		eo, ok := e.(map[string]any)
		if !ok {
			continue
		}
		p.Entries = append(p.Entries, &devboxv1.PlanEntry{
			Content: Str(eo, "content"), Priority: Str(eo, "priority"), Status: Str(eo, "status"), Meta: MetaStruct(eo),
		})
	}
	return p
}

// ConfigOptionOf converts an ACP session config option. Select options are modelled; other types keep raw JSON.
func ConfigOptionOf(o Object) *devboxv1.ConfigOption {
	co := &devboxv1.ConfigOption{
		Id: Str(o, "id"), Name: Str(o, "name"), Description: Str(o, "description"),
		Category: Str(o, "category"), Type: Str(o, "type"), Meta: MetaStruct(o),
	}
	switch cv := o["currentValue"].(type) {
	case string:
		co.CurrentValue = cv
	case bool:
		co.CurrentValue = strconv.FormatBool(cv)
	case json.Number:
		co.CurrentValue = cv.String()
	}
	if co.Type != "select" && co.Type != "" {
		co.RawJson = MustJSON(o)
		return co
	}
	for _, v := range Arr(o, "options") {
		vo, ok := v.(map[string]any)
		if !ok {
			continue
		}
		if Has(vo, "group") && Has(vo, "options") {
			group := Str(vo, "name")
			if group == "" {
				group = Str(vo, "group")
			}
			for _, gv := range Arr(vo, "options") {
				if gvo, ok := gv.(map[string]any); ok {
					co.Options = append(co.Options, configValueOf(gvo, group))
				}
			}
			continue
		}
		co.Options = append(co.Options, configValueOf(vo, ""))
	}
	return co
}

func configValueOf(o Object, group string) *devboxv1.ConfigOptionValue {
	return &devboxv1.ConfigOptionValue{
		Value: Str(o, "value"), Name: Str(o, "name"), Description: Str(o, "description"), Group: group, Meta: MetaStruct(o),
	}
}

// CommandOf converts an ACP available command, normalizing v1 `input: {hint}` into v2 `{type: "text", hint}`.
func CommandOf(o Object) *devboxv1.AvailableCommand {
	c := &devboxv1.AvailableCommand{Name: Str(o, "name"), Description: Str(o, "description"), Meta: MetaStruct(o)}
	if in := Obj(o, "input"); in != nil {
		t := Str(in, "type")
		if t == "" {
			t = TextType
		}
		c.Input = &devboxv1.CommandInput{Type: t, Hint: Str(in, "hint")}
	}
	return c
}

// NormalizeCommandJSON rewrites a v1 command object into its v2 shape (input.type defaults to "text").
func NormalizeCommandJSON(o Object) Object {
	out := Object{}
	for k, v := range o {
		out[k] = v
	}
	if in := Obj(o, "input"); in != nil {
		nin := Object{}
		for k, v := range in {
			nin[k] = v
		}
		if Str(nin, "type") == "" {
			nin["type"] = TextType
		}
		out["input"] = nin
	}
	return out
}

// ---------------------------------------------------------------------------------------------------------------
// proto -> ACP JSON (prompt content sent by console).
// ---------------------------------------------------------------------------------------------------------------

func setMeta(o Object, s *structpb.Struct) {
	if s != nil {
		o["_meta"] = s.AsMap()
	}
}

func annotationsJSON(a *devboxv1.Annotations) Object {
	if a == nil {
		return nil
	}
	o := Object{}
	if len(a.GetAudience()) > 0 {
		o["audience"] = a.GetAudience()
	}
	if a.Priority != nil {
		o["priority"] = a.GetPriority()
	}
	if a.GetLastModified() != "" {
		o["lastModified"] = a.GetLastModified()
	}
	setMeta(o, a.GetMeta())
	return o
}

func withAnnotations(o Object, a *devboxv1.Annotations) Object {
	if aj := annotationsJSON(a); aj != nil {
		o["annotations"] = aj
	}
	return o
}

// ContentBlockJSON converts a proto ContentBlock back into ACP JSON. Unknown blocks are sent verbatim.
func ContentBlockJSON(b *devboxv1.ContentBlock) (any, error) {
	switch v := b.GetBlock().(type) {
	case *devboxv1.ContentBlock_Text:
		o := withAnnotations(Object{"type": "text", "text": v.Text.GetText()}, v.Text.GetAnnotations())
		setMeta(o, v.Text.GetMeta())
		return o, nil
	case *devboxv1.ContentBlock_Image:
		o := withAnnotations(Object{"type": "image", "data": v.Image.GetData(), "mimeType": v.Image.GetMimeType()}, v.Image.GetAnnotations())
		if v.Image.GetUri() != "" {
			o["uri"] = v.Image.GetUri()
		}
		setMeta(o, v.Image.GetMeta())
		return o, nil
	case *devboxv1.ContentBlock_Audio:
		o := withAnnotations(Object{"type": "audio", "data": v.Audio.GetData(), "mimeType": v.Audio.GetMimeType()}, v.Audio.GetAnnotations())
		setMeta(o, v.Audio.GetMeta())
		return o, nil
	case *devboxv1.ContentBlock_ResourceLink:
		rl := v.ResourceLink
		o := withAnnotations(Object{"type": "resource_link", "uri": rl.GetUri(), "name": rl.GetName()}, rl.GetAnnotations())
		for k, s := range map[string]string{"title": rl.GetTitle(), "description": rl.GetDescription(), "mimeType": rl.GetMimeType()} {
			if s != "" {
				o[k] = s
			}
		}
		if rl.Size != nil {
			o["size"] = rl.GetSize()
		}
		setMeta(o, rl.GetMeta())
		return o, nil
	case *devboxv1.ContentBlock_Resource:
		er := v.Resource
		o := withAnnotations(Object{"type": "resource"}, er.GetAnnotations())
		switch r := er.GetResource().(type) {
		case *devboxv1.EmbeddedResource_Text:
			res := Object{"uri": r.Text.GetUri(), "text": r.Text.GetText()}
			if r.Text.GetMimeType() != "" {
				res["mimeType"] = r.Text.GetMimeType()
			}
			setMeta(res, r.Text.GetMeta())
			o["resource"] = res
		case *devboxv1.EmbeddedResource_Blob:
			res := Object{"uri": r.Blob.GetUri(), "blob": r.Blob.GetBlob()}
			if r.Blob.GetMimeType() != "" {
				res["mimeType"] = r.Blob.GetMimeType()
			}
			setMeta(res, r.Blob.GetMeta())
			o["resource"] = res
		case *devboxv1.EmbeddedResource_Unknown:
			raw, err := Decode(r.Unknown.GetRawJson())
			if err != nil {
				return nil, fmt.Errorf("embedded resource raw_json: %w", err)
			}
			o["resource"] = raw
		}
		setMeta(o, er.GetMeta())
		return o, nil
	case *devboxv1.ContentBlock_Unknown:
		raw, err := Decode(v.Unknown.GetRawJson())
		if err != nil {
			return nil, fmt.Errorf("unknown content block raw_json: %w", err)
		}
		return raw, nil
	default:
		return nil, fmt.Errorf("empty content block")
	}
}

// ContentBlocksJSON converts a prompt into ACP JSON.
func ContentBlocksJSON(blocks []*devboxv1.ContentBlock) ([]any, error) {
	out := make([]any, 0, len(blocks))
	for i, b := range blocks {
		j, err := ContentBlockJSON(b)
		if err != nil {
			return nil, fmt.Errorf("content[%d]: %w", i, err)
		}
		out = append(out, j)
	}
	return out, nil
}
