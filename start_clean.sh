#!/bin/bash
kill $(lsof -t -i:10947) 2>/dev/null || true
godspeed serve


# Open a terminal

# Navigate to your Godspeed project directory:
# cd "/path/to/your/Godspeed Project/RAG"

# Run the command:
# chmod +x start-clean.sh


# {
#   "command": "/bin/bash",
#   "args": [
#     "-c",
#     "chmod +x start-clean.sh && ./start-clean.sh"
#   ],
#   "cwd": "/your/project/path",
#   "type": "stdio"
# }
