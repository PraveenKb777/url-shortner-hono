import { Hono } from "hono";
import { IUrl } from "./modal/urlModal";
import { nanoid } from "nanoid";

type Bindings = {
  [key in keyof CloudflareBindings]: CloudflareBindings[key];
};

export interface HonoBindings {
  Bindings: Bindings;
}

const app = new Hono<HonoBindings>();

app.get("/", (c) => {
  return c.html(
    `<!doctypehtml><html lang=en><meta charset=UTF-8><title>URL Shortener - Quickly Shorten and Share URLs | MGTech</title><meta content="Use MGtech's Url shortner to shorten long URLs in seconds. Easily create  short links for sharing on social media, emails, and more. Get started now!"name=description><meta content="URL shortener, shorten URLs, link shortener, short links, free URL shortener, online URL shortener"name=keywords><link href=https://www.short.pkbmg.shop/ rel=canonical><meta content="Shorten URLs with MGTech's URL Shortner"property=og:title><meta content="Quickly shorten long URLs and share them easily with our free URL shortener."property=og:description><meta content=https://www.short.pkbmg.shop/ property=og:url><meta content=website property=og:type><meta content=summary_large_image name=twitter:card><meta content="Shorten URLs with YourAppName"name=twitter:title><meta content="Use our free tool to shorten long URLs quickly and easily."name=twitter:description><meta content="width=device-width,initial-scale=1"name=viewport><meta content="index, follow"name=robots><meta content="width=device-width,initial-scale=1"name=viewport><body style=font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background-color:#f5f5f5><div style=text-align:center;margin-bottom:20px><h1 style=color:#333>MGTech URL Shortener</h1></div><div style="background-color:#fff;padding:20px;border-radius:10px;box-shadow:0 4px 8px rgba(0,0,0,.1);width:100%;max-width:400px"><form action=/shorten method=POST style=display:flex;flex-direction:column><label for=url style=margin-bottom:10px;font-size:1.2em;color:#555>Enter URL to shorten:</label> <input id=url name=url style="padding:10px;font-size:1em;border:1px solid #ddd;border-radius:5px;margin-bottom:20px"> <button style=padding:10px;font-size:1em;color:#fff;background-color:#007bff;border:none;border-radius:5px;cursor:pointer type=submit>Shorten</button></form></div>`
  );
});
const html = (
  shortenedUrl: string
) => `<!doctypehtml><html lang=en><meta charset=UTF-8><title>URL Shortener - Quickly Shorten and Share URLs | MGTech</title><meta content="Use MGtech's Url shortner to shorten long URLs in seconds. Easily create  short links for sharing on social media, emails, and more. Get started now!"name=description><meta content="URL shortener, shorten URLs, link shortener, short links, free URL shortener, online URL shortener"name=keywords><link href=https://www.short.pkbmg.shop/ rel=canonical><meta content="Shorten URLs with MGTech's URL Shortner"property=og:title><meta content="Quickly shorten long URLs and share them easily with our free URL shortener."property=og:description><meta content=https://www.short.pkbmg.shop/ property=og:url><meta content=website property=og:type><meta content=summary_large_image name=twitter:card><meta content="Shorten URLs with YourAppName"name=twitter:title><meta content="Use our free tool to shorten long URLs quickly and easily."name=twitter:description><meta content="width=device-width,initial-scale=1"name=viewport><meta content="index, follow"name=robots><meta content="width=device-width,initial-scale=1"name=viewport><body style=font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background-color:#f5f5f5><div style=text-align:center;margin-bottom:20px><h1 style=color:#333>MGTech URL Shortener</h1></div><div style="background-color:#fff;padding:20px;border-radius:10px;box-shadow:0 4px 8px rgba(0,0,0,.1);width:100%;max-width:400px"><div style=margin-top:20px;display:block id=result><p style=font-size:1.1em;color:#555>Shortened URL:<div style=display:flex;align-items:center><input id=shortenedUrl readonly style="flex:1;padding:10px;font-size:1em;border:1px solid #ddd;border-radius:5px;margin-right:10px"value=${shortenedUrl}> <button onclick=copyToClipboard() style=padding:10px;font-size:1em;color:#fff;background-color:#28a745;border:none;border-radius:5px;cursor:pointer>Copy</button></div></div></div><script>function copyToClipboard() {
            const shortenedUrlField = document.getElementById('shortenedUrl');
            shortenedUrlField.select();
            shortenedUrlField.setSelectionRange(0, 99999); // For mobile devices
            document.execCommand('copy');
            alert('Shortened URL copied to clipboard: ' + shortenedUrlField.value);
        }</script>`;

function getRandomNumber(min: number = 2, max: number = 36): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
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
  const shortCode = Math.random().toString(getRandomNumber()).substring(2, 8);
  const id = nanoid();
  // Insert the URL and short code into the database
  await c.env.DB.prepare("INSERT INTO urls (id,url, code) VALUES (?,?, ?)")
    .bind(id, url, shortCode)
    .run();

  const requestUrl = new URL(c.req.url, `https://${c.req.header("host")}`);
  console.log(c.req);
  const shortenedUrl = `${requestUrl.origin}/${shortCode}`;

  return c.html(html(shortenedUrl));
});

app.get("/:code", async (c) => {
  const { code } = c.req.param();

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
