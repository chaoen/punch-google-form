const axios = require('axios');
const fs = require('fs');
const Path = require('path');
const qs = require('qs');
const user = require('./config.json')

const puppeteer = require('puppeteer');
const check = require('check-types');

const loginRetryTime = [1,2,3,4,5,6,7,8,9,10];
const maxRetryTime = 10;
let errorRetryTime = 0;


// 不觀看畫面
const headless = false;

let browser;

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

// login
const login = async (page) => {
  try {
    console.log('go to login page');
    await page.goto(user.link);

    await sleep(5000); // stop 2s prevent too fast to redirect
    // login
  
    await page.waitForSelector('input[id="identifierId"]')
    await page.type('input[id="identifierId"]', user.email)
    await sleep(1000);

    await page.click('div[id="identifierNext"] > div > button');
    await sleep(10000);


    await page.waitForSelector('input[name="password"]');
    await page.type('input[id="identifierId"]', user.password);
    await sleep(1000);
    await page.click('div[id="passwordNext"] > div > button');

    await sleep(10000);

    try {
      await page.waitForSelector('input[tabindex="0"]', {timeout:8000});
    } catch (error) {
      return false;
    }

    console.log("Login Success");
  } catch (error) {
    console.log('boom');
  }
  return true;
}

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const startBrowser = async () => {
  return await puppeteer.launch({
    headless : headless,
    ignoreHTTPSErrors: true,
    // executablePath: "/opt/google/chrome-unstable/chrome",
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--window-size=1920,1080",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ]
  })
}

const fillForm = async (page) => {
  await page.waitForSelector('input[tabindex="0"]');

  console.log("填寫員工編號");
  await page.type('input[tabindex="0"]', user.user_no);

  await sleep(2000);

  console.log("點擊部門");
  await page.evaluate(() => {
    var allSpan = document.querySelectorAll('span');
    Array.prototype.filter.call(allSpan, (el) => el.textContent === 'MWD(商城產品發展部)')[0].click();
  });

  await sleep(2000);

  console.log("點擊上班或下班");
  await page.evaluate(() => {
    var allSpan = document.querySelectorAll('span');
    Array.prototype.filter.call(allSpan, (el) => el.textContent === '上班')[0].click();
  });

  console.log("填寫完畢，等待送出");

  await sleep(1000000000);
  return;
}

const init = async () => {
  try {
    console.log('start');

    console.log('start browser');
    browser = await startBrowser();
    let page = await browser.newPage();
    console.log('success start browser and page');
    // accept dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    let isLogin = false;
    await asyncForEach(loginRetryTime, async retryTime => {
      console.log(`start login ${retryTime}`, new Date());
      isLogin = await login(page);

      if (isLogin) {
        const postOneTimeNum = 1;
        console.log('start fill form');
        await fillForm(page);
        await browser.close();
        console.log('success');
        process.exit();
      }
    })
  } catch(error) {
    errorRetryTime++;
    console.log(errorRetryTime, error);
    if (errorRetryTime <= maxRetryTime) {
      await browser.close();
      init();
    } else {
      await browser.close();
      console.log(error);
      process.exit();
    }
  }
}

init();
