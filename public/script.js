// Initialize Socket.IO
const socket = io();

// Get DOM elements
const markdownInput = document.getElementById("markdown-input");
const previewContent = document.getElementById("preview-content");
const connectionStatus = document.getElementById("connection-status");
const userCount = document.getElementById("user-count");

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {}
    }
    return hljs.highlightAuto(code).value;
  },
});

// Debounce function to limit how often we send updates
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Convert markdown to HTML and update preview
function updatePreview(markdown) {
  const html = marked.parse(markdown);
  previewContent.innerHTML = html;

  // Re-highlight code blocks
  previewContent.querySelectorAll("pre code").forEach((block) => {
    hljs.highlightElement(block);
  });
}

// Send markdown changes to server (debounced)
const sendMarkdownChange = debounce((markdown) => {
  socket.emit("markdown-change", { markdown });
}, 300);

// Handle input changes
markdownInput.addEventListener("input", (e) => {
  const markdown = e.target.value;
  updatePreview(markdown);
  sendMarkdownChange(markdown);
});

// Handle tab key for indentation
markdownInput.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    const value = markdownInput.value;

    // Insert tab character
    markdownInput.value =
      value.substring(0, start) + "    " + value.substring(end);
    markdownInput.selectionStart = markdownInput.selectionEnd = start + 4;

    // Trigger input event to update preview
    markdownInput.dispatchEvent(new Event("input"));
  }
});

// Socket event listeners
socket.on("connect", () => {
  console.log("Connected to server");
  connectionStatus.textContent = "Connected";
  connectionStatus.className = "status-connected";
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
  connectionStatus.textContent = "Disconnected";
  connectionStatus.className = "status-disconnected";
});

socket.on("markdown-update", (markdown) => {
  // Only update if the content is different to avoid cursor jumping
  if (markdownInput.value !== markdown) {
    const cursorPosition = markdownInput.selectionStart;
    markdownInput.value = markdown;
    updatePreview(markdown);

    // Try to restore cursor position
    markdownInput.selectionStart = Math.min(cursorPosition, markdown.length);
    markdownInput.selectionEnd = markdownInput.selectionStart;
  }
});

// Track connected users (optional feature)
socket.on("user-count", (count) => {
  userCount.textContent = `${count} user${count !== 1 ? "s" : ""} online`;
});

// Handle connection errors
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  connectionStatus.textContent = "Connection Error";
  connectionStatus.className = "status-disconnected";
});

// Initial preview update
updatePreview(markdownInput.value);

// Auto-resize textarea based on content
function autoResize() {
  markdownInput.style.height = "auto";
  markdownInput.style.height = markdownInput.scrollHeight + "px";
}

// Optional: Sync scroll positions
let isPreviewScrolling = false;
let isEditorScrolling = false;

markdownInput.addEventListener("scroll", () => {
  if (isPreviewScrolling) return;

  isEditorScrolling = true;
  const percentage =
    markdownInput.scrollTop /
    (markdownInput.scrollHeight - markdownInput.clientHeight);
  previewContent.scrollTop =
    percentage * (previewContent.scrollHeight - previewContent.clientHeight);

  setTimeout(() => {
    isEditorScrolling = false;
  }, 100);
});

previewContent.addEventListener("scroll", () => {
  if (isEditorScrolling) return;

  isPreviewScrolling = true;
  const percentage =
    previewContent.scrollTop /
    (previewContent.scrollHeight - previewContent.clientHeight);
  markdownInput.scrollTop =
    percentage * (markdownInput.scrollHeight - markdownInput.clientHeight);

  setTimeout(() => {
    isPreviewScrolling = false;
  }, 100);
});
