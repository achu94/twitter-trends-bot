import { PuppeteerLaunchOptions, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import fs from "fs";
import chalk, { Chalk } from "chalk";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const accEmail: string = Bun.env.accEmail!;
const accName: string = Bun.env.accName!;
const accPassword: string = Bun.env.accPassword!;

const browserSettings: PuppeteerLaunchOptions = {
  headless: false,
  ignoreHTTPSErrors: true,
  slowMo: 0,
  args: [
    "--window-size=1400,900",
    "--remote-debugging-port=9222",
    "--remote-debugging-address=0.0.0.0", // You know what your doing?
    "--disable-gpu",
    "--disable-features=IsolateOrigins,site-per-process",
    "--blink-settings=imagesEnabled=true",
  ],
};

export default async () => {
  const browser = await puppeteer.launch(browserSettings);
  const page = await browser.newPage();

  await page.goto("https://twitter.com/explore");
  await setCookies(page);

  await page.waitForNetworkIdle({ idleTime: 1500 });

  const TwoMinsInMs = 120000;
  setInterval(() => {
    setCookies(page);
  }, TwoMinsInMs);

  await logIn(page);
  await getTrendsHashTags(page);
};

const logIn = async (page: Page) => {
  // Select the user input
  await page.waitForSelector("[autocomplete=username]");
  await page.type("input[autocomplete=username]", accEmail, { delay: 50 });

  // Press the Next button
  await page.evaluate(() =>
    document.querySelectorAll('div[role="button"]')[2].click()
  );
  await page.waitForNetworkIdle({ idleTime: 1500 });

  // Sometimes twitter suspect suspicious activties, so it ask for your handle/phone Number
  const extractedText = await page.$eval("*", (el) => el.innerText);
  if (extractedText.includes("Enter your phone number or username")) {
    await page.waitForSelector("[autocomplete=on]");
    await page.type("input[autocomplete=on]", accName, { delay: 50 });
    await page.evaluate(() =>
      document.querySelectorAll('div[role="button"]')[1].click()
    );
    await page.waitForNetworkIdle({ idleTime: 1500 });
  }

  // Select the password input
  await page.waitForSelector('[autocomplete="current-password"]');
  await page.type('[autocomplete="current-password"]', accPassword, {
    delay: 50,
  });
  // Press the Login button
  await page.evaluate(() =>
    document.querySelectorAll('div[role="button"]')[2].click()
  );
  await page.waitForNetworkIdle({ idleTime: 2000 });
};

const setCookies = async (page: Page) => {
  console.log(chalk.green("Setting cookies"));

  const cookies: Buffer = fs.readFileSync("./cookies/cookies.json");

  if (cookies) {
    const cookiesToSet = JSON.parse(cookies.toString());
    await page.setCookie(...cookiesToSet);

    console.log(chalk.green("cookies setted"));
  } else {
    console.log(chalk.yellow("Cookies not found, please Login"));

    setTimeout(async () => {
      console.log(chalk.green("Setting new cookies"));
      const cookies = await page.cookies();
      fs.writeFileSync(
        "./cookies/cookies.json",
        JSON.stringify(cookies, null, 2)
      );

      await page.setCookie(...cookies);
      console.log(chalk.green("cookies setted"));
    }, 30000);
  }
};

const getTrendsHashTags = async (page: Page) => {
  // await page.waitForNetworkIdle({ idleTime: 150 });

  // Selectt and Press the Show Trends button
  await page.waitForSelector("a[href='/i/trends']");
  await page.evaluate(() =>
    document.querySelector("a[href='/i/trends']").click()
  );

  // Get every trend
  await page.waitForSelector("div[aria-label^='Timeline']");
  console.log(chalk.blue("timeline selected"));
  let trendsData: any[] = [];
  await page.evaluate(() => {
    // Example ['#TheCrewMotorfest\nJetzt erhältlich!\nPromoted by The Crew Motorfest\n1\n', '\nFootball ', ' Trending\n#AliKoçİstifa\n6,176 posts\n2\n', ...
    const garbageStringArray = document
      .querySelector("div[aria-label^='Timeline']")
      .innerText.split("·");

    trendsData = garbageStringArray.reduce((acc: {}[], topic: string, i: number) => {
      topic = topic?.trim();

      if (topic.includes("Trending\n")) {
        const topicTheme = garbageStringArray[i - 1].trim();
        const topicArray = topic.split("\n");

        if (topicArray?.length) {
          acc.push({
            trendHashText: topicArray[1],
            trendPosts: topicArray[2],
            trendPosition: parseInt(topicArray[3]) - 1,
            trendTheme: topicTheme,
          });
        }
      }

      return acc;
    }, []);

    console.log(trendsData);
  });
};
