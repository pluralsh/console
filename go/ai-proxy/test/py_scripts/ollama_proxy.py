import openai
import json

def test_tool_registry():
    """Test that the tool registry maintains consistent IDs and indices"""
    print("Testing tool registry consistency...\n")
    
    # Make two separate calls with the same tool to verify ID/index consistency
    for i in range(2):
        print(f"Call {i+1}:")
        response = client.chat.completions.create(
            model="llama3.1:8b",
            messages=[
                {"role": "user", "content": "What's the weather like in New York?"}
            ],
            tools=[{
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Get the current weather in a location",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "The location to get weather for"
                            }
                        },
                        "required": ["location"]
                    }
                }
            }],
            stream=False
        )

        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            print(f"Tool ID: {tool_call.id}")
            print(f"Tool Index: {tool_call.index}")
            print(f"Tool Name: {tool_call.function.name}")
            print(f"Tool Arguments: {tool_call.function.arguments}\n")
        else:
            print("No tool calls in response\n")
            
    print("-" * 50 + "\n")

# Configure the client to use your local proxy
client = openai.OpenAI(
    api_key="not-needed",  # Your proxy doesn't require an API key
    base_url="http://localhost:8000/openai/v1"  # Your proxy address
)
def test_embeddings():
    """Test embeddings endpoint"""
    print("Testing embeddings functionality...\n")
    
    response = client.embeddings.create(
        model="all-minilm",  # Use your Ollama model
        input=["Hello world", "Test embedding"]
    )
    
    print(f"Model: {response.model}")
    print(f"Embedding dimensions: {len(response.data[0].embedding)}")
    print(f"First embedding vector: {response.data[0].embedding[:5]}...\n")  # Show first 5 dimensions
    print("-" * 50 + "\n")

def test_text_completion():
    """Test a simple text completion request"""
    print("Testing basic text completion...\n")
    
    response = client.chat.completions.create(
        model="llama3.1:8b",  # Use your Ollama model
        messages=[
            {"role": "user", "content": "What is the capital of France?"}
        ],
        stream=False
    )
    
    print(f"Model: {response.model}")
    print(f"Response: {response.choices[0].message.content}\n")
    print("-" * 50 + "\n")

def test_tool_calling():
    """Test a request with tool calling"""
    print("Testing tool calling functionality...\n")
    
    response = client.chat.completions.create(
        model="llama3.1:8b",  # Use your Ollama model
        messages=[
            {"role": "user", "content": "What's the weather like in New York?"}
        ],
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Get the current weather in a location",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "The city and state"
                            },
                            "unit": {
                                "type": "string",
                                "enum": ["celsius", "fahrenheit"]
                            }
                        },
                        "required": ["location"]
                    }
                }
            }
        ],
        stream=False
    )
    
    print(f"Model: {response.model}")
    print(f"Response text: {response.choices[0].message.content}")
    
    if response.choices[0].message.tool_calls:
        for tool_call in response.choices[0].message.tool_calls:
            print("\nTool call detected:")
            print(f"Function: {tool_call.function.name}")
            print(f"Arguments: {tool_call.function.arguments}")
            
            # Parse arguments to show them in a readable format
            args = json.loads(tool_call.function.arguments)
            print("Parsed arguments:")
            for key, value in args.items():
                print(f"  - {key}: {value}")

def test_tool_calling_stream():
    """Test a request with tool calling and streaming enabled"""
    print("Testing tool calling with streaming...\n")
    
    stream = client.chat.completions.create(
        model="llama3.1:8b",  # Use your Ollama model
        messages=[
            {"role": "user", "content": "What's the weather like in New York?"}
        ],
        tools=[
            {
                "type": "function",
                "function": {
                    "name": "get_weather", 
                    "description": "Get the current weather in a location",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "The city and state"
                            },
                            "unit": {
                                "type": "string", 
                                "enum": ["celsius", "fahrenheit"]
                            }
                        },
                        "required": ["location"]
                    }
                }
            }
        ],
        stream=True
    )
    
    print("Streaming response:")
    full_content = ""
    tool_calls = []
    
    for chunk in stream:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            print(content, end="", flush=True)
            full_content += content
            
        if chunk.choices[0].delta.tool_calls:
            tool_calls.extend(chunk.choices[0].delta.tool_calls)
    
    print("\n\nTool calls detected:")
    for tool_call in tool_calls:
        print(f"\nFunction: {tool_call.function.name}")
        print(f"Arguments: {tool_call.function.arguments}")
        
        # Parse arguments to show them in a readable format
        args = json.loads(tool_call.function.arguments)
        print("Parsed arguments:")
        for key, value in args.items():
            print(f"  - {key}: {value}")
    
    print("\nComplete response received.\n")
    print("-" * 50 + "\n")


def test_streaming():
    """Test streaming functionality"""
    print("Testing streaming response...\n")
    
    stream = client.chat.completions.create(
        model="llama3.1:8b",  # Use your Ollama model
        messages=[
            {"role": "user", "content": "Tell me haiku about a robot."}
        ],
        stream=True
    )
    
    # Collect the complete response for printing at the end
    full_content = ""
    
    print("Streaming response:")
    for chunk in stream:
        content = chunk.choices[0].delta.content or ""
        print(content, end="", flush=True)
        full_content += content
    
    print("\n\nComplete response received.\n")
    print("-" * 50 + "\n")

if __name__ == "__main__":
    print("Testing Ollama proxy with OpenAI SDK\n")

    test_tool_registry()
    
    # Test regular text completion
    test_text_completion()

    # Test tool calling
    test_tool_calling()

    # Test tool calling stream
    test_tool_calling_stream()

    # Test embeddings
    test_embeddings()