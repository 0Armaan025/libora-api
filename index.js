const dotenv = require("dotenv");
const express = require("express");
const scrapeRoute = require("./routes/scrape/scrape_route");
const userRoute = require("./routes/user/user_route");



const app = express();
const PORT = 5000;

// Middleware to parse JSON
app.use(express.json());

dotenv.config();

// Sample API route
app.get("/", (req, res) => {
    res.send("Welcome to My API!");
});

app.use("/api/scrape", scrapeRoute);
app.use("/api/user", userRoute);

// Sample GET route
app.get("/api/data", (req, res) => {
    res.json({ message: "Hello from the API!" });
});

// Sample POST route
app.post("/api/data", (req, res) => {
    const { name } = req.body;
    res.json({ message: `Hello, ${name}!` });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
