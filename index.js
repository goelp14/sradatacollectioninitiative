const express = require('express');
const app = express();
const port = 5000;
const puppeteer = require('puppeteer');
const domainToASCII = require("url");
const dotenv  = require("dotenv");
dotenv.config();
const fs = require('fs');
const process = require('process');
var JSZip = require("jszip");

//Serving static files
process.setMaxListeners(Infinity)
app.use(express.static("public"));
const url =
  "https://www.simracingalliance.com/leaderboards/hot_lap/barcelona/?season=6";

async function updateReferenceTimes(reference_times) {
  let tracks = Object.keys(await reference_times);
  headers = ['Track', 'Alien',	'Division 1',	'Gap',	'Division 2',	'Gap',	'Division 3',	'Gap',	'Division 4',	'Gap',	'Division 5',	'Gap',	'Division 6',	'Gap']
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
    return row.join(',');
  }));
  values.unshift(headers.join(','));
  return await values.join('\n');
}

async function launchBrowser() {
  console.log("launching browser")
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
    // console.log(data)
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

async function build_div_csv(header, data) {
  const driverscsv = await Promise.all(data.map(async element => {
    let row = [
      element['rank'], 
      element['driver_number'], 
      element['name'], 
      element['vehicle'], 
      element['fastest_laptime'], 
      element['gap_from_fastest_time'], 
      element['sector_1'],
      element['sector_2'],
      element['sector_3']]
    return row.join(",");
  }));
  driverscsv.unshift(header);
  return driverscsv.join('\n');
}

async function make_leaderboard_csv(leaderboard) {
  let headers = ["rank", "driver number", "name", "vehicle", "fastest laptime", "gap from fastest laptime", "sector 1", "sector 2", "sector 3"]
  let hcsv = headers.join(",")
  division1 = await build_div_csv(hcsv, leaderboard['division 1']);
  division2 = await build_div_csv(hcsv, leaderboard['division 2']);
  division3 = await build_div_csv(hcsv, leaderboard['division 3']);
  division4 = await build_div_csv(hcsv, leaderboard['division 4']);
  division5 = await build_div_csv(hcsv, leaderboard['division 5']);
  division6 = await build_div_csv(hcsv, leaderboard['division 6']);

  return [division1, division2, division3, division4, division5, division6]

}

// async function confGoogleSheet() {
  
// }

app.get("/hotlapdata", async (req, res) => {
  let season6tracks = ['Barcelona', 'Brands_Hatch', 'Imola/Wet', 'Misano', 'Mount_Panorama', 'Oulton_Park', 'Silverstone/Wet', 'Zolder'];
  let browser = await launchBrowser();
  const track_leaderboards = await Promise.all(season6tracks.map(async (track) => {
    let page = await configureTheBrowser(browser, track);
    let leaderboard =  await getLeaderboardJSON(page);
    await page.close();
    return leaderboard;
  }));
  await browser.close();
  let browser2 = await launchBrowser();
  let page = await referenceLapTimes(browser2);
  let reftimes =  await getreftimes(page);
  await page.close()
  await browser2.close()
  // const ref_times = await Promise.all(season6tracks.map(async (track) => {
    
  // }));
  // console.log(ref_times)
  let results = {}
  results['Reference Times'] = reftimes;
  let leaderboards = {}
  let response = {}
  for (let i = 0; i < season6tracks.length; i++) {
    leaderboards[season6tracks[i]] = track_leaderboards[i]
    response[season6tracks[i]] = await make_leaderboard_csv(track_leaderboards[i]);
  }
  results['Leaderboard Times'] = leaderboards;
  let reftimescsv = await updateReferenceTimes(results['Reference Times']);
  // console.log(reftimescsv)

  // elements.forEach(async element => {
  //   const text = await (await element.getProperty("innerText")).jsonValue();
  //   console.log(await text);
  // });
  // let results = await checkDetails(page);
  // // console.log(results['division1']['1']);
  // // let processdivision1 = await processdivision(results["division1"]);
  // let csvcontent = "data:text/csv;charset=utf-8," + reftimescsv;
  // var encodedUri = encodeURI(csvcontent);
  var zip = await new JSZip();
  zip.file("reference_laptimes.csv", reftimescsv);
  season6tracks.forEach(track => {
    let csvs = response[track];
    zip.file(`${track}/Division1Stats.csv`, csvs[0]);
    zip.file(`${track}/Division2Stats.csv`, csvs[1]);
    zip.file(`${track}/Division3Stats.csv`, csvs[2]);
    zip.file(`${track}/Division4Stats.csv`, csvs[3]);
    zip.file(`${track}/Division5Stats.csv`, csvs[4]);
    zip.file(`${track}/Division6Stats.csv`, csvs[5]);
  });

  zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
  .pipe(fs.createWriteStream('hotlapdata.zip'))
  .on('finish', function () {
      // JSZip generates a readable stream with a "end" event,
      // but is piped here in a writable stream which emits a "finish" event.
      console.log("hotlapdata.zip written.");
  });
  res.send({'dataprocessed': true});
  // await fs.writeFileSync("./reference_laptimes.csv", reftimescsv);
  // res.setHeader('Content-Length', blob.length);
  // res.write(blob, 'binary');
  // res.end();
});

app.get('/download', function(req, res){
  console.log('Download Triggered')
  const file = `${__dirname}/hotlapdata.zip`;
  console.log(file);
  res.download(file); // Set disposition and send it.
  // res.send({"downloaded": true});
});

app.listen(process.env.PORT || port, () => {
  console.log(`Example app listening at https://sradatacollectioninitiative.herokuapp.com:${port}`);
});