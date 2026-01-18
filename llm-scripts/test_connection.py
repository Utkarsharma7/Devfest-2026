#!/usr/bin/env python3
"""Test Ollama connection from WSL"""
import ollama
import os

def get_windows_host():
    """Get Windows host IP from WSL"""
    hosts_to_try = []
    try:
        with open('/etc/resolv.conf', 'r') as f:
            for line in f:
                if line.startswith('nameserver'):
                    hosts_to_try.append(line.split()[1])
    except:
        pass
    hosts_to_try.append('localhost')
    hosts_to_try.append('127.0.0.1')
    return hosts_to_try[0] if hosts_to_try else 'localhost'

print("Testing Ollama connections...")
print("=" * 50)

hosts_to_test = [
    'http://localhost:11434',
    f'http://{get_windows_host()}:11434',
    'http://127.0.0.1:11434',
]

for host in hosts_to_test:
    try:
        print(f"\nTrying: {host}")
        client = ollama.Client(host=host)
        models = client.list()
        print(f"✅ SUCCESS! Connected to {host}")
        print(f"   Available models: {[m['name'] for m in models.get('models', [])]}")
        break
    except Exception as e:
        print(f"❌ Failed: {str(e)[:100]}")

print("\n" + "=" * 50)
