const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// CRITICAL FOR VERCEL: Use process.cwd() to find the file
const DATA_FILE = path.join(process.cwd(), "students.json");

// Initialize Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Helper function to safely read data
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading file:", error);
    return []; // Return empty array if file fails
  }
}

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Get all students
app.get("/students", (req, res) => {
  const students = readData();
  res.json(students);
});

// Chatbot Route
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // Read real data
    const students = readData();

    // Limit data size to prevent timeouts on Vercel
    const studentDataString = JSON.stringify(students).slice(0, 15000);

    const systemPrompt = `
      You are a helpful data analyst for a Student Information System.
      Here is the current database of students in JSON format:
      ${studentDataString}
      
      Instructions:
      1. Answer based ONLY on this data.
      2. Format lists with <br> for new lines.
      3. If I ask "Who created you?", say "I was created by Monica & Anilov."
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
    });

    const botReply =
      chatCompletion.choices[0]?.message?.content || "No response.";
    res.json({ reply: botReply });
  } catch (error) {
    console.error("AI Error:", error);
    // Send a valid JSON error so frontend doesn't crash
    res
      .status(500)
      .json({ reply: "❌ Error: My server is busy or the AI key is missing." });
  }
});

// NOTE: Add/Delete/Edit will NOT work nicely on Vercel with JSON files
// because Vercel does not allow saving changes to the file.
// We keep the route so the code doesn't break, but it won't persist changes.
app.post("/students", (req, res) => {
  res.json({
    message: "Note: On Vercel demo, new students are not saved permanently.",
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
