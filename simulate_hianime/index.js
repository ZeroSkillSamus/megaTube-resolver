const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

const js = fs.readFileSync(`${__dirname}/megaJs.js`, 'utf-8');

puppeteer.use(StealthPlugin());

async function megatubeScraperHeadless(url) {
    const browser = await puppeteer.launch({
        headless: false,
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
    });

    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
        Referer: url,
    });

    await page.setViewport({ width: 1366, height: 768 });
    await page.setRequestInterception(true);

    page.on('request', (request) => {
        const requestUrl = request.url();
        // console.log('Request URL:', requestUrl);

        if (requestUrl.includes('e1-player.min.js') || requestUrl.includes('google') ) {
            // console.log('Blocking request to:', requestUrl);
            request.abort();
        } else {
            request.continue();
        }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Inject JavaScript into the page
    await page.evaluate((jsContent) => {
        try {
            eval(jsContent);
        } catch (error) {
            console.error('Error executing JS:', error);
        }
    }, js);

    // Set up a listener for the console output
    return new Promise((resolve, reject) => {
        page.on('console', async (msg) => {
            try {
                const args = msg.args();
                for (const arg of args) {
                    const value = await arg.jsonValue();
                    console.log(value)
                    if (typeof value === 'object' && value.sources !== undefined) {
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
            reject(new Error('Timeout waiting for sources'));
        }, 100000000); // 10 seconds timeout
    });
}

// Export the function
module.exports = megatubeScraperHeadless;

// Example usage
megatubeScraperHeadless('https://megacloud.tv/embed-2/e-1/P9MZKlDdCGFi?k=1&autoPlay=1&oa=0&asi=1').then(e => console.log).catch(console.error);
