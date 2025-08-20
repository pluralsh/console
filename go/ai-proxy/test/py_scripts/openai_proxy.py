import openai

def test_chat_completion():
    """Test basic chat completion functionality"""
    print("Testing chat completion...\n")
    
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": "write a haiku"}
        ],
        stream=False
    )
    
    print(f"Model: {response.model}")
    print(f"Response: {response.choices[0].message.content}\n")
    print("-" * 50 + "\n")

def test_embeddings():
    """Test embeddings functionality"""
    print("Testing embeddings...\n")
    
    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=["Hello world", "Test embedding"]
    )
    
    print(f"Model: {response.model}")
    print(f"Number of embeddings: {len(response.data)}")
    print(f"Embedding dimensions: {len(response.data[0].embedding)}")
    print(f"First few dimensions of first embedding: {response.data[0].embedding[:5]}...\n")
    print("-" * 50 + "\n")

if __name__ == "__main__":
    print("Testing OpenAI proxy with OpenAI SDK\n")

    # Configure the client to use the proxy
    client = openai.OpenAI(
        api_key="not-needed",  # Proxy handles authentication
        base_url="http://localhost:8000/openai/v1"  # Your proxy address
    )
    
    # Test chat completion
    test_chat_completion()
    
    # Test embeddings
    test_embeddings()
