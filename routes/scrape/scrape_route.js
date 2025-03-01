const axios = require("axios");
const express = require("express");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Ensure downloads folder exists
const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

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

    try {
        const searchURL = `https://libgen.li/index.php?req=${name}&columns%5B%5D=t&columns%5B%5D=a&columns%5B%5D=s&columns%5B%5D=y&columns%5B%5D=p&columns%5B%5D=i&objects%5B%5D=f&objects%5B%5D=e&objects%5B%5D=s&objects%5B%5D=a&objects%5B%5D=p&objects%5B%5D=w&topics%5B%5D=l&topics%5B%5D=c&topics%5B%5D=f&topics%5B%5D=a&topics%5B%5D=m&topics%5B%5D=r&topics%5B%5D=s&res=50&filesuns=all`;

        const { data } = await axios.get(searchURL);
        const $ = cheerio.load(data);

        // Get the top 25 results
        const rows = $("tbody tr").slice(0, 25);
        if (!rows.length) {
            return res.status(404).json({ message: "No books found" });
        }

        let bookResults = [];
        let downloadFilePath = null;

        rows.each((index, row) => {
            const columns = $(row).find("td");

            const titleAnchor = $(columns[0]).find("a");
            const bookTitle = titleAnchor.text().trim();
            const bookUrl = titleAnchor.attr("href") || "#";

            // Extract mirror links
            const mirrorLinks = $(columns[columns.length - 1])
                .find("a")
                .map((i, link) => $(link).attr("href"))
                .get()
                .map((url) => (url.startsWith("http") ? url : `https://libgen.li${url}`));

            // Get the first mirror link that starts with "https://libgen.li"
            const libgenMirror = mirrorLinks.find((link) => link.startsWith("https://libgen.li"));

            let downloadLink = null;

            const bookData = {
                title: bookTitle,
                author: $(columns[1]).text().trim(),
                publisher: $(columns[2]).text().trim(),
                year: $(columns[3]).text().trim(),
                language: $(columns[4]).text().trim(),
                fileSize: $(columns[6]).text().trim(),
                format: $(columns[7]).text().trim(),
                bookUrl: bookUrl.startsWith("http") ? bookUrl : `https://libgen.li/${bookUrl}`,
                mirrors: mirrorLinks,
                downloadLink,
            };

            bookResults.push(bookData);

            // Download the book for the 2nd result only
            if (index === 1 && libgenMirror) {
                getDownloadLink(libgenMirror).then(async (link) => {
                    if (link) {
                        bookData.downloadLink = link;
                        const fileExt = bookData.format.toLowerCase();
                        const fileName = `${bookData.title.replace(/[^\w\s]/gi, "_")}.${fileExt}`;
                        downloadFilePath = await downloadFile(link, fileName);
                    }
                });
            }
        });

        return res.status(200).json({
            message: "Books fetched successfully",
            data: bookResults,
            downloadPath: downloadFilePath || "Download link not found for the 2nd book",
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        return res.status(500).json({ message: "Error fetching data" });
    }
});

module.exports = router;
