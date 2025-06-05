const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Store current markdown content
let currentMarkdown = `# Welcome to Real-time Markdown Editor

## Features
- **Real-time collaboration** - Multiple users can edit simultaneously
- **Live preview** - See your markdown rendered instantly
- **Syntax highlighting** - Beautiful code blocks

### Try editing this content!

You can write:
- Lists like this
- **Bold text**
- *Italic text*
- \`inline code\`

\`\`\`javascript
// Code blocks with syntax highlighting
function hello() {
    console.log("Hello, World!");
}
\`\`\`

> Blockquotes for important notes

[Links work too](https://example.com)
`;

// Routes
app.get("/", (req, res) => {
  res.render("index", {
    title: "Real-time Markdown Viewer",
    initialMarkdown: currentMarkdown,
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // Send current markdown to new user
  socket.emit("markdown-update", currentMarkdown);

  // Handle markdown changes
  socket.on("markdown-change", (data) => {
    currentMarkdown = data.markdown;
    // Broadcast to all other connected users
    socket.broadcast.emit("markdown-update", currentMarkdown);
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
