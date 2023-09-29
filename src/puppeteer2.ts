//sudo npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth puppeteer-extra-plugin-adblocker readline
var headless_mode = process.argv[2];

const readline = require("readline");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

async function run() {
  const browser = await puppeteer.launch({
    headless: headless_mode !== "true" ? false : true,
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
  });

  const page = await browser.newPage();

  console.log(`Testing expertflyer.com`);
  //await page.goto('https://www.expertflyer.com')
  await goto_Page("https://www.expertflyer.com");
  await waitForNetworkIdle(page, 3000, 0);
  //await page.waitFor(7000)
  await checking_error(do_2nd_part);

  async function do_2nd_part() {
    try {
      await page.click("#yui-gen2 > a");
    } catch {}
    await page.waitFor(5000);
    var seat = "#headerTitleContainer > h1";
    try {
      console.log(await page.$eval(seat, (e) => e.innerText));
    } catch {}
    await page.screenshot({ path: "expertflyer1.png" });

    await checking_error(do_3nd_part);
  }

  async function do_3nd_part() {
    try {
      await page.click("#yui-gen1 > a");
    } catch {}
    await page.waitFor(5000);
    var pro = "#headerTitleContainer > h1";
    try {
      console.log(await page.$eval(pro, (e) => e.innerText));
    } catch {}
    await page.screenshot({ path: "expertflyer2.png" });

    console.log(`All done, check the screenshots?`);
  }

  async function checking_error(callback) {
    try {
      try {
        var error_found = await page.evaluate(
          () =>
            document.querySelectorAll('a[class="text yuimenubaritemlabel"]')
              .length
        );
      } catch (error) {
        console.log(`catch error ${error}`);
      }

      if (error_found === 0) {
        console.log(`Error found`);
        var captcha_msg =
          "Due to suspicious activity from your computer, we have blocked your access to ExpertFlyer. After completing the CAPTCHA below, you will immediately regain access unless further suspicious behavior is detected.";
        var ip_blocked =
          "Due to recent suspicious activity from your computer, we have blocked your access to ExpertFlyer. If you feel this block is in error, please contact us using the form below.";
        try {
          var error_msg = await page.$eval("h2", (e) => e.innerText);
        } catch {}
        try {
          var error_msg_details = await page.$eval(
            "body > p:nth-child(2)",
            (e) => e.innerText
          );
        } catch {}

        if (error_msg_details == captcha_msg) {
          console.log(
            `Google Captcha found, You have to solve the captch here manually or some automation recaptcha service`
          );

          await verify_User_answer();
          await callback();
        } else if (error_msg_details == ip_blocked) {
          console.log(
            `The current ip address is blocked. The only way is change the ip address.`
          );
        } else {
          console.log(
            `Waiting for error page load... Waiting for 10 sec before rechecking...`
          );
          await page.waitFor(10000);
          await checking_error();
        }
      } else {
        console.log(`Page loaded successfully! You can do things here.`);
        await callback();
      }
    } catch {}
  }

  async function goto_Page(page_URL) {
    try {
      await page.goto(page_URL, { waitUntil: "networkidle2", timeout: 30000 });
    } catch {
      console.log(`Error in loading page, re-trying...`);
      await goto_Page(page_URL);
    }
  }

  async function verify_User_answer(call_back) {
    user_Answer = await readLine();

    if (user_Answer == "yes") {
      console.log(`user_Answer is ${user_Answer}, Processing...`);
      // Not working what i want. Will fix later
      // Have to restart the bot after solving
      await call_back();
    } else {
      console.log(`answer not match. try again...`);

      var user_Answer = await readLine();
      console.log(`user_Answer is ${user_Answer}`);
      await verify_User_answer(call_back);
    }
  }

  async function readLine() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question("Solve the captcha and type yes to continue: ", (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async function waitForNetworkIdle(page, timeout, maxInflightRequests = 0) {
    console.log("waitForNetworkIdle called");
    page.on("request", onRequestStarted);
    page.on("requestfinished", onRequestFinished);
    page.on("requestfailed", onRequestFinished);

    let inflight = 0;
    let fulfill;
    let promise = new Promise((x) => (fulfill = x));
    let timeoutId = setTimeout(onTimeoutDone, timeout);
    return promise;

    function onTimeoutDone() {
      page.removeListener("request", onRequestStarted);
      page.removeListener("requestfinished", onRequestFinished);
      page.removeListener("requestfailed", onRequestFinished);
      fulfill();
    }

    function onRequestStarted() {
      ++inflight;
      if (inflight > maxInflightRequests) clearTimeout(timeoutId);
    }

    function onRequestFinished() {
      if (inflight === 0) return;
      --inflight;
      if (inflight === maxInflightRequests)
        timeoutId = setTimeout(onTimeoutDone, timeout);
    }
  }

  await browser.close();
}

export default run;
