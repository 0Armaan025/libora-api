const axios = require("axios");
const express = require("express");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

// const puppeteer = require("puppeteer");

const cloudscraper = require("cloudscraper");

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

const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
};

router.get("/", async (req, res) => {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ message: "Book name is required" });
    }

    const searchURL = `https://libgen.li/index.php?req=${encodeURIComponent(name)}&columns%5B%5D=t&columns%5B%5D=a&columns%5B%5D=s&columns%5B%5D=y&columns%5B%5D=p&columns%5B%5D=i&objects%5B%5D=f&objects%5B%5D=e&objects%5B%5D=s&objects%5B%5D=a&objects%5B%5D=p&objects%5B%5D=w&topics%5B%5D=l&topics%5B%5D=c&topics%5B%5D=f&topics%5B%5D=a&topics%5B%5D=m&topics%5B%5D=r&topics%5B%5D=s&res=50&filesuns=all`;

    try {
        const html = await cloudscraper.get({ url: searchURL, headers });

        // Extract book details from the HTML
        const bookResults = extractBooks(html);

        if (!bookResults.length) {
            return res.status(404).json({ message: "No books found" });
        }

        return res.status(200).json({
            message: "Books fetched successfully",
            data: bookResults,
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        return res.status(500).json({ message: "Error fetching data", error: error.message });
    }
});
// Function to extract book details from HTML
function extractBooks(html) {
    const cheerio = require("cheerio");
    const $ = cheerio.load(html);
    const books = [];

    $("tbody tr").each((index, row) => {
        const columns = $(row).find("td");

        const titleAnchor = columns.eq(0).find("a");
        const bookTitle = titleAnchor.text().trim() || "Unknown";
        const bookUrl = titleAnchor.attr("href") || "#";

        const mirrorLinks = columns.last().find("a").map((i, el) => $(el).attr("href")).get();

        books.push({
            title: bookTitle,
            author: columns.eq(1).text().trim() || "Unknown",
            publisher: columns.eq(2).text().trim() || "Unknown",
            year: columns.eq(3).text().trim() || "Unknown",
            language: columns.eq(4).text().trim() || "Unknown",
            fileSize: columns.eq(6).text().trim() || "Unknown",
            format: columns.eq(7).text().trim() || "Unknown",
            bookUrl,
            mirrors: mirrorLinks,
            libgenMirror: mirrorLinks.find(link => link.startsWith("https://libgen.li")) || null,
            index,
        });
    });

    return books;
}
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