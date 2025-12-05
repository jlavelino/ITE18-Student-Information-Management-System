const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");

require("dotenv").config();

const app = express();
const PORT = 3000;
const DATA_FILE = "./students.json";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Get all students
app.get("/students", (req, res) => {
  fs.readFile(DATA_FILE, "utf8", (err, data) => {
    if (err) return res.status(500).json({ message: "Error reading file" });
    const students = JSON.parse(data);
    res.json(students);
  });
});

// chatbot route
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const data = fs.readFileSync(DATA_FILE, "utf8");
    const students = JSON.parse(data);
    const studentDataString = JSON.stringify(students);

    const systemPrompt = `
      You are a helpful data analyst for a Student Information System.
      Here is the current database of students in JSON format:
      ${studentDataString}
      
      Instructions:
      1. Answer the user's question based ONLY on this data.
      2. If asked to count, count accurately.
      3. Format lists clearly with line breaks (use <br> for new lines).
      4. If asked "Who am I?", explain you only know the database, not the user.
    `;

    //  Call Groq API
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
    res.status(500).json({ error: "Failed to process chat request." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
