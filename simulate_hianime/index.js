/** @format */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import axios from "axios";
import * as cheerio from "cheerio";
import path from "path";
import { fileURLToPath } from "url";
import CryptoJS from "crypto-js";
// const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
// const __dirname = path.dirname(__filename); // get the name of the directory
// const js = fs.readFileSync(`${__dirname}/megaJs.js`, "utf-8");

// puppeteer.use(StealthPlugin());

async function getKey() {
  let url = "https://justarion.github.io/keys/e1-player/src/data/keys.json";

  let response = await axios.get(url);
  return response.data["megacloud"]["anime"]["key"];
}

async function fetch_video_src(episode_id) {
  let key = await getKey();
  const url = new URL(
    `https://hianime.to/ajax/v2/episode/sources?id=${episode_id}`
  );
  try {
    let response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    let link = response.data.link;
    let newResponse = await axios.get(link, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        Referer: "https://hianime.to",
      },
    });

    let $ = cheerio.load(newResponse.data);
    let dataID = $("#megacloud-player").attr("data-id");
    let sourceURL = `https://megacloud.blog/embed-2/v2/e-1/getSources?id=${dataID}`;
    let sourceResponse = await axios.get(sourceURL, {
      headers: {
        Referer: link,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    let source = sourceResponse.data.sources;
    let decrypted = CryptoJS.AES.decrypt(source, key);
    let extract = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    let m3u8_links = await fetch_qualities(extract[0].file);
    let headers = {
      referer: "https://megacloud.blog/",
      origin: "https://megacloud.blog",
    };
    return {
      headers: headers,
      m3u8_links: m3u8_links,
      tracks: sourceResponse.data.tracks,
      intro: sourceResponse.data.intro,
      outro: sourceResponse.data.outro,
    };
    // return {
    //   sss: "s",
    // };
    // let link = JSON.parse(JSON.stringify(response.data)).link;
    // //let link = `https://cdnstreame.net/embed-1/v2/e-1/cfFPfawnD86r?z=`;
    // //console.log(link);
    // let data = await megatubeScraperHeadless(link);
    // let m3u8_url = data.sources[0].file.toString();

    // let m3u8_files = await fetch_qualities(m3u8_url);

    // return {
    //   m3u8_links: m3u8_files,
    //   tracks: data.tracks,
    // };
  } catch (e) {
    console.error(e);
  }
}

async function fetch_qualities(default_url) {
  //const test = 'RESOLUTION=1920x1080,FRAME-RATE=23.974,CODECS'
  let iframeLinks = [];
  try {
    let response = await axios.get(default_url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        Referer: "https://megacloud.blog/",
        Origin: "https://megacloud.blog",
      },
    });
    let resolutions = response.data.match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);
    resolutions?.forEach((str) => {
      const index = default_url.lastIndexOf("/");
      const resolution = str.split(",")[0].split("x")[1];
      const top_half = default_url.slice(0, index);
      const full_url = `${top_half}/${str.split("\n")[1]}`;
      if (str.split("\n")[1].includes("index"))
        iframeLinks.push({
          is_m3u8: full_url.includes(".m3u8"),
          quality: resolution,
          url: full_url,
        });
    });

    return iframeLinks;
  } catch (e) {
    console.error(e);
    return iframeLinks;
  }
}

/*
async function megatubeScraperHeadless(url) {
	const browser = await puppeteer.launch({
		headless: true,
		executablePath: '/usr/bin/chromium-browser',
		devtools: false,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-infobars',
			'--disable-extensions',
			'--disable-gpu',
			'--disable-dev-shm-usage',
			'--disable-software-rasterizer',
			'--mute-audio',
			'--start-maximized',
		],
	})

	const page = await browser.newPage()

	await page.setExtraHTTPHeaders({
		Referer: 'https://hianime.to',
	})

	await page.setViewport({ width: 1366, height: 768 })
	await page.setRequestInterception(true)

	page.on('request', (request) => {
		const requestUrl = request.url()
		// console.log('Request URL:', requestUrl);

		if (requestUrl.includes('e1-player.min.js') || requestUrl.includes('google')) {
			// console.log('Blocking request to:', requestUrl);
			request.abort()
		} else {
			request.continue()
		}
	})

	await page.goto(url, { waitUntil: 'domcontentloaded' })

	// Inject JavaScript into the page
	await page.evaluate((jsContent) => {
		try {
			eval(jsContent)
		} catch (error) {
			console.error('Error executing JS:', error)
		}
	}, js)

	// Set up a listener for the console output
	return new Promise((resolve, reject) => {
		page.on('console', async (msg) => {
			try {
				const args = msg.args()
				for (const arg of args) {
					const value = await arg.jsonValue()
					//console.log(value)

					if (typeof value === 'object' && value.sources !== undefined) {
						// console.log('Found sources:', value);
						await browser.close()
						resolve(value) // Resolve the promise with the value
						return
					}
				}
			} catch (error) {
				reject(error) // Reject the promise if there's an error
			}
		})

		// Optional timeout to ensure the browser doesn't hang indefinitely
		setTimeout(async () => {
			await browser.close()
			reject(new Error('Timeout waiting for sources'))
		}, 100000000) // 10 seconds timeout
	})
  const browser = await puppeteer.launch({
    headless: false,
    devtools: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--disable-extensions",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-software-rasterizer",
      "--mute-audio",
      "--start-maximized",
    ],
  });

  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    Referer: "https://hianime.to/",
  });

  await page.setViewport({ width: 1366, height: 768 });
  await page.setRequestInterception(true);

  page.on("request", (request) => {
    const requestUrl = request.url();

    if (
      requestUrl.includes("e1-player.min.js") ||
      requestUrl.includes("google")
    ) {
      // console.log('Blocking request to:', requestUrl);
      request.abort();
    } else {
      console.log("Request URL:", requestUrl);
      request.continue();
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Inject JavaScript into the page
  await page.evaluate((jsContent) => {
    try {
      eval(jsContent);
    } catch (error) {
      console.error("Error executing JS:", error);
    }
  }, js);

  // Set up a listener for the console output
  return new Promise((resolve, reject) => {
    page.on("console", async (msg) => {
      try {
        const args = msg.args();
        for (const arg of args) {
          const value = await arg.jsonValue();
          //console.log(value)

          if (typeof value === "object" && value.sources !== undefined) {
            // console.log('Found sources:', value);
            await browser.close();
            resolve(value); // Resolve the promise with the value
            return;
          }
        }
      } catch (error) {
        reject(error); // Reject the promise if there's an error
      }
    });

    // Optional timeout to ensure the browser doesn't hang indefinitely
    setTimeout(async () => {
      await browser.close();
      reject(new Error("Timeout waiting for sources"));
    }, 100000000); // 10 seconds timeout
  });

}
*/
// Export the function
export default fetch_video_src;

// Example usage
// megatubeScraperHeadless('https://megacloud.tv/embed-2/e-1/P9MZKlDdCGFi?k=1&autoPlay=1&oa=0&asi=1')
// 	.then((e) => console.log)
// 	.catch(console.error)
