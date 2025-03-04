const axios = require("axios");
const express = require("express");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer");


const router = express.Router();

// Ensure downloads folder exists


// Function to get the direct "GET" download link
const getDownloadLink = async (mirrorUrl) => {
    try {
        const { data } = await axios.get(mirrorUrl);
        const $ = cheerio.load(data);

        // Find the anchor tag containing "GET"
        const getLink = $("a h2:contains('GET')").parent().attr("href");

        if (getLink) {
            return new URL(getLink, mirrorUrl).href; // Convert to absolute URL
        }
    } catch (error) {
        console.error("Error fetching download link:", error);
    }
    return null;
};

// Function to download the file
const downloadFile = async (fileUrl, fileName) => {
    try {
        const response = await axios({
            url: fileUrl,
            method: "GET",
            responseType: "stream",
        });

        const filePath = path.join(downloadsDir, fileName);
        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on("finish", () => resolve(filePath));
            writer.on("error", reject);
        });
    } catch (error) {
        console.error("Error downloading file:", error);
        return null;
    }
};

// Main route to scrape book data and download the 2nd result
router.get("/", async (req, res) => {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ message: "Book name is required" });
    }

    const searchURL = `https://libgen.li/index.php?req=${encodeURIComponent(name)}&columns%5B%5D=t&columns%5B%5D=a&columns%5B%5D=s&columns%5B%5D=y&columns%5B%5D=p&columns%5B%5D=i&objects%5B%5D=f&objects%5B%5D=e&objects%5B%5D=s&objects%5B%5D=a&objects%5B%5D=p&objects%5B%5D=w&topics%5B%5D=l&topics%5B%5D=c&topics%5B%5D=f&topics%5B%5D=a&topics%5B%5D=m&topics%5B%5D=r&topics%5B%5D=s&res=50&filesuns=all`;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            executablePath: "/opt/render/.cache/puppeteer/chrome/linux-133.0.6943.141/chrome",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage"
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
        await page.goto(searchURL, { waitUntil: "networkidle2" });

        // Extract data
        const bookResults = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll("tbody tr"));
            return rows.slice(0, 25).map((row, index) => {
                const columns = row.querySelectorAll("td");

                const titleAnchor = columns[0]?.querySelector("a");
                const bookTitle = titleAnchor?.textContent.trim() || "Unknown";
                const bookUrl = titleAnchor?.href || "#";

                const mirrorLinks = Array.from(columns[columns.length - 1]?.querySelectorAll("a") || [])
                    .map(link => link.href)
                    .filter(link => link.startsWith("http"));

                return {
                    title: bookTitle,
                    author: columns[1]?.textContent.trim() || "Unknown",
                    publisher: columns[2]?.textContent.trim() || "Unknown",
                    year: columns[3]?.textContent.trim() || "Unknown",
                    language: columns[4]?.textContent.trim() || "Unknown",
                    fileSize: columns[6]?.textContent.trim() || "Unknown",
                    format: columns[7]?.textContent.trim() || "Unknown",
                    bookUrl,
                    mirrors: mirrorLinks,
                    libgenMirror: mirrorLinks.find(link => link.startsWith("https://libgen.li")) || null,
                    index
                };
            });
        });

        await browser.close();

        if (!bookResults.length) {
            return res.status(404).json({ message: "No books found" });
        }

        return res.status(200).json({
            message: "Books fetched successfully",
            data: bookResults,
        });
    } catch (error) {
        if (browser) await browser.close();
        console.error("Error fetching data:", error);
        return res.status(500).json({ message: "Error fetching data", error: error.message });
    }
});


// Route to download a file using mirror link
router.get("/download", async (req, res) => {
    const { mirrorUrl, title, format } = req.query;

    if (!mirrorUrl) {
        return res.status(400).json({ message: "Mirror URL is required" });
    }

    try {
        // Get the actual download link from the mirror page
        const downloadUrl = await getDownloadLink(mirrorUrl);

        if (!downloadUrl) {
            return res.status(404).json({ message: "Download link not found" });
        }

        // Generate a filename
        const fileName = `${title || "download"}.${format || "pdf"}`.replace(/[^a-zA-Z0-9.]/g, "_");

        // Stream the file to the client
        const response = await axios({
            url: downloadUrl,
            method: "GET",
            responseType: "stream",
        });

        // Set appropriate headers
        res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

        // Pipe the file data directly to the response
        response.data.pipe(res);
    } catch (error) {
        console.error("Error downloading file:", error);
        return res.status(500).json({ message: "Error downloading file", error: error.message });
    }
});

// Route to download and save the file on the server
router.get("/save-file", async (req, res) => {
    const { mirrorUrl, title, format } = req.query;

    if (!mirrorUrl) {
        return res.status(400).json({ message: "Mirror URL is required" });
    }

    try {
        // Get the actual download link
        const downloadUrl = await getDownloadLink(mirrorUrl);

        if (!downloadUrl) {
            return res.status(404).json({ message: "Download link not found" });
        }

        // Generate a filename
        const fileName = `${title || "download"}.${format || "pdf"}`.replace(/[^a-zA-Z0-9.]/g, "_");

        // Download and save the file
        const filePath = await downloadFile(downloadUrl, fileName);

        if (!filePath) {
            return res.status(500).json({ message: "Failed to save the file" });
        }

        return res.status(200).json({
            message: "File downloaded successfully",
            filePath,
            fileName
        });
    } catch (error) {
        console.error("Error saving file:", error);
        return res.status(500).json({ message: "Error saving file", error: error.message });
    }
});

module.exports = router;