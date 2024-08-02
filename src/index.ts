import { Hono } from "hono";
import { IUrl } from "./modal/urlModal";

type Bindings = {
  [key in keyof CloudflareBindings]: CloudflareBindings[key];
};

export interface HonoBindings {
  Bindings: Bindings;
}

const app = new Hono<HonoBindings>();

app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URL Shortener - MGTech</title>
</head>
<body style="font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f5f5f5;">

    <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #333;">MGTech URL Shortener</h1>
    </div>

    <div style="background-color: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); width: 100%; max-width: 400px;">
        <form action="/shorten" method="POST" style="display: flex; flex-direction: column;">
            <label for="url" style="margin-bottom: 10px; font-size: 1.2em; color: #555;">Enter URL to shorten:</label>
            <input type="text" id="url" name="url" style="padding: 10px; font-size: 1em; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
            <button type="submit" style="padding: 10px; font-size: 1em; color: #fff; background-color: #007bff; border: none; border-radius: 5px; cursor: pointer;">Shorten</button>
        </form>
    </div>

</body>
</html>

  `);
});
const html = (shortenedUrl: string) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URL Shortener - MGTech</title>
</head>
<body style="font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f5f5f5;">

    <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #333;">MGTech URL Shortener</h1>
    </div>

    <div style="background-color: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); width: 100%; max-width: 400px;">
        <div id="result" style="margin-top: 20px; display: block;">
            <p style="font-size: 1.1em; color: #555;">Shortened URL:</p>
            <div style="display: flex; align-items: center;">
                <input type="text" id="shortenedUrl" value="${shortenedUrl}" readonly style="flex: 1; padding: 10px; font-size: 1em; border: 1px solid #ddd; border-radius: 5px; margin-right: 10px;">
                <button onclick="copyToClipboard()" style="padding: 10px; font-size: 1em; color: #fff; background-color: #28a745; border: none; border-radius: 5px; cursor: pointer;">Copy</button>
            </div>
        </div>
    </div>

    <script>
        function copyToClipboard() {
            const shortenedUrlField = document.getElementById('shortenedUrl');
            shortenedUrlField.select();
            shortenedUrlField.setSelectionRange(0, 99999); // For mobile devices
            document.execCommand('copy');
            alert('Shortened URL copied to clipboard: ' + shortenedUrlField.value);
        }
    </script>

</body>
</html>
`;
// Route to handle URL shortening
app.post("/shorten", async (c) => {
  const url = (await c.req.parseBody()).url as string;

  if (!url) {
    return c.text("URL is required", 400);
  }

  // Check if the URL already exists in the database
  const { results } = await c.env.DB.prepare(
    "SELECT code FROM urls WHERE url = ?"
  )
    .bind(url)
    .all();

  if (results.length > 0) {
    // URL already exists, return the existing short code
    const { code } = results[0];
    const requestUrl = new URL(c.req.url, `https://${c.req.header("host")}`);
    const shortenedUrl = `${requestUrl.origin}/${code}`;
    return c.render(html(shortenedUrl));
  }

  // URL does not exist, generate a new short code
  const shortCode = Math.random().toString(36).substring(2, 8);

  // Insert the URL and short code into the database
  await c.env.DB.prepare("INSERT INTO urls (url, code) VALUES (?, ?)")
    .bind(url, shortCode)
    .run();

  const requestUrl = new URL(c.req.url, `https://${c.req.header("host")}`);
  const shortenedUrl = `${requestUrl.origin}/${shortCode}`;

  return c.html(html(shortenedUrl));
});

// Route to handle redirection from short URLs
app.get("/:code", async (c) => {
  const { code } = c.req.param();

  // Query the database for the original URL
  const { results } = await c.env.DB.prepare(
    "SELECT url FROM urls WHERE code = ?"
  )
    .bind(code)
    .all<IUrl>();

  if (results.length === 0) {
    return c.text("URL not found", 404);
  }

  const { url } = results[0];
  return c.redirect(url);
});

export default app;
