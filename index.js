const express = require('express');
const app = express();
const port = 3000;
const puppeteer = require('puppeteer');
const domainToASCII = require("url");
const dotenv  = require("dotenv");
dotenv.config();
const {authenticate} = require('@google-cloud/local-auth');
// const authenticate = require() '@google-cloud/local-auth';
const {google} = require('googleapis');
const {fs} = require('fs');
const path = require('path');
const process = require('process');

//Serving static files
app.use(express.static("public"));
const url =
  "https://www.simracingalliance.com/leaderboards/hot_lap/barcelona/?season=6";
var CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
var API_KEY = process.env.GOOGLE_API_KEY;
var spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  // If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'google-credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });

  console.log(payload)
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function updateReferenceTimes(auth, reference_times) {
  const sheets = google.sheets({version: 'v4', auth});
  // const res = await sheets.spreadsheets.values.get({
  //   spreadsheetId: '1xnZqtEngQ260oMUemdz-iJ1c1iPS0q6hR0UkZdI3_jo',
  //   range: 'Reference Times!A2:N',
  // });
  console.log(await reference_times)
  let tracks = Object.keys(await reference_times);
  const values = await Promise.all(tracks.map(async track => {
    let data = await reference_times[track];
    let row = [
      track,
      data['Alien']['Laptime'],
      data['Division 1']['Laptime'],
      data['Division 1']['Gap'],
      data['Division 2']['Laptime'],
      data['Division 2']['Gap'],
      data['Division 3']['Laptime'],
      data['Division 3']['Gap'],
      data['Division 4']['Laptime'],
      data['Division 4']['Gap'],
      data['Division 5']['Laptime'],
      data['Division 5']['Gap'],
      data['Division 6']['Laptime'],
      data['Division 6']['Gap'],
    ]
    return row;
  }));

  const resource = {
    values,
  };
  try {
    const result = await sheets.spreadsheets.values.update({
      "spreadsheetId": spreadsheetId,
      "range": 'Reference Times!A2:N23',
      "resource": resource,
      resource,
    });
    console.log('%d cells updated.', result.data.updatedCells);
    return result;
  } catch (err) {
    // TODO (Developer) - Handle exception
    throw err;
  }
}

async function launchBrowser() {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  return browser;
}

async function configureTheBrowser(browser, track) {
  let learderboardurl = `https://www.simracingalliance.com/leaderboards/hot_lap/${track}/?season=6`
  console.log(learderboardurl);
  const page = await browser.newPage();
  await page.goto(learderboardurl, { waitUntil: "load", timeout: 0});
  return page;
}

async function referenceLapTimes(browser) {
  let reftime = 'https://www.simracingalliance.com/about/reference_lap_times'
  console.log(reftime);
  const page = await browser.newPage();
  await page.goto(reftime, { waitUntil: "load", timeout: 0});
  return page;
}

// async function checkDetails(page) {
//   let html = await page.evaluate(() => {
//     // let oTable = $('tr.Division-1').toArray();
//     console.log("Getting Division 1")
//     // console.log($('tr.Division-1').toArray());
//     // let data = [...oTable.rows].map(t => [...t.children].map(u => u.innerText))
//     // console.log(data);
//     return {
//       division1: document.getElementsByClassName("Division-1"),
//       division2: document.getElementsByClassName("Division-2"),
//       division3: document.getElementsByClassName("Division-3"),
//       division4: document.getElementsByClassName("Division-4"),
//       division5: document.getElementsByClassName("Division-5"),
//       division6: document.getElementsByClassName("Division-6"),
//     };
//   });
//   return html;
// }

async function processdivision(division) {
  let div = division;
  const drivers = await Promise.all(div.map(async element => {
    let data = {};
    const text = await (await element.getProperty("innerText")).jsonValue();
    let vals = text.split("\t");
    data["rank"] = vals[0];
    const [driver_number, ...name] = vals[1].split(' ');
    data["driver_number"] = driver_number.split('\n')[1];
    data["name"] = name.join(" ");
    data["vehicle"] = vals[2].split("\n")[0];
    const[lap_time, ...gap] = vals[3].split(" ")
    data["fastest_lap_time"] = lap_time;
    data["gap_from_fastest_time"] = gap[0];
    data["sector_1"] = vals[4];
    data["sector_2"] = vals[5];
    data["sector_3"] = vals[6];
    return data;
  }));
  return drivers
}

async function getLeaderboardJSON(page) {
  const divison1 = await page.$$("tr.Division-1");
  const divison2 = await page.$$("tr.Division-2");
  const divison3 = await page.$$("tr.Division-3");
  const divison4 = await page.$$("tr.Division-4");
  const divison5 = await page.$$("tr.Division-5");
  const divison6 = await page.$$("tr.Division-6");
  const div1processed = await processdivision(divison1);
  const div2processed = await processdivision(divison2);
  const div3processed = await processdivision(divison3);
  const div4processed = await processdivision(divison4);
  const div5processed = await processdivision(divison5);
  const div6processed = await processdivision(divison6);
  const results = {
    "division 1": div1processed,
    "division 2": div2processed,
    "division 3": div3processed,
    "division 4": div4processed,
    "division 5": div5processed,
    "division 6": div6processed,
  }

  return results;
}

async function getreftimes(page) {
  // Loop through grabbing everything
  const data = await page.$$('#hot-lap-tab table tr');
  const reftimes = await Promise.all(data.map(async element => {
    const text = await (await element.getProperty("innerText")).jsonValue();
    const res = text.split("\n");

    const cleanedres = res.map(el => {
      return el.trim()
    });
    const reference_time = await cleanedres.filter(n => n);
    // data[reference_time[0]] = {
    //   'Alien': {'Laptime': reference_time[1], 'Gap': '+0.000'},
    //   'Division 1': {'Laptime': reference_time[2].split(" ")[0], 'Gap': reference_time[2].split(" ")[1]},
    //   'Division 2': {'Laptime': reference_time[3].split(" ")[0], 'Gap': reference_time[2].split(" ")[1]},
    //   'Division 3': {'Laptime': reference_time[4].split(" ")[0], 'Gap': reference_time[2].split(" ")[1]},
    //   'Division 4': {'Laptime': reference_time[5].split(" ")[0], 'Gap': reference_time[2].split(" ")[1]},
    //   'Division 5': {'Laptime': reference_time[6].split(" ")[0], 'Gap': reference_time[2].split(" ")[1]},
    //   'Division 6': {'Laptime': reference_time[7].split(" ")[0], 'Gap': reference_time[2].split(" ")[1]},
    // };
    return reference_time;
    // console.log(await text)
  }));
  let times = {};
  for (let index = 2; index <= 23; index++) {
    let proc = await reftimes[index][0].split("\t");
    times[proc[0]] = {
        'Alien': {'Laptime': proc[1], 'Gap': '+0.000'},
        'Division 1': {'Laptime': proc[2].split(" ")[0], 'Gap': proc[2].split(" ")[1]},
        'Division 2': {'Laptime': proc[3].split(" ")[0], 'Gap': proc[3].split(" ")[1]},
        'Division 3': {'Laptime': proc[4].split(" ")[0], 'Gap': proc[4].split(" ")[1]},
        'Division 4': {'Laptime': proc[5].split(" ")[0], 'Gap': proc[5].split(" ")[1]},
        'Division 5': {'Laptime': proc[6].split(" ")[0], 'Gap': proc[6].split(" ")[1]},
        'Division 6': {'Laptime': proc[7].split(" ")[0], 'Gap': proc[7].split(" ")[1]}
      };
  }
  return times;
}

// async function confGoogleSheet() {
  
// }

app.get("/price", async (req, res) => {
  let season6tracks = ['Barcelona', 'Brands_Hatch', 'Imola/wet', 'Misano', 'Mount_Panorama', 'Oulton_Park', 'Silverstone/wet', 'Zolder'];
  browser = launchBrowser();
  const track_leaderboards = await Promise.all(season6tracks.map(async (track) => {
    let page = await configureTheBrowser(browser, track);
    let leaderboard =  await getLeaderboardJSON(page);
    await page.close();
    return leaderboard;
  }));
  let page = await referenceLapTimes(browser);
  let reftimes =  await getreftimes(page);
  await page.close()
  await browser.close()
  // const ref_times = await Promise.all(season6tracks.map(async (track) => {
    
  // }));
  // console.log(ref_times)
  let results = {}
  results['Reference Times'] = reftimes;
  let leaderboards = {}
  for (let i = 0; i < season6tracks.length; i++) {
    leaderboards[season6tracks[i]] = track_leaderboards[i]
  }
  results['Leaderboard Times'] = leaderboards;
  authorize().then(await updateReferenceTimes(this.auth, results['Reference Times'])).catch(console.error);
  // elements.forEach(async element => {
  //   const text = await (await element.getProperty("innerText")).jsonValue();
  //   console.log(await text);
  // });
  // let results = await checkDetails(page);
  // // console.log(results['division1']['1']);
  // // let processdivision1 = await processdivision(results["division1"]);
  res.send(results);
});

app.listen(process.env.PORT || port, () => {
  console.log(`Example app listening at https://sradatacollectioninitiative.herokuapp.com:${port}`);
});