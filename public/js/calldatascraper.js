// import JSZip from "./jszip.js";
import "./jszip.js";

const scrape = document.getElementById("scrape");
console.log("reached");
scrape.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("clicked");
  getData();
});

async function getData() {
  const response = await fetch("/hotlapdata");

  //returns a promise so we need to convert it json
  const data = await response.json();
  // console.log(JSZip.version);
  // let zip = new JSZip();
  // const zipobj = await data['dataprocessed'];
  // zip = zipobj;
  // zip.generateAsync({type:"blob"}).then(function (blob) { // 1) generate the zip file
  //   saveAs(blob, "hotlap_data.zip");                          // 2) trigger the download
  // });
  if (data['dataprocessed']) {
    console.log('downloading file');
    // let url = window.location.host + '/download';
    // console.log(url);
    // window.open(url);
    await fetch("/download");
    const result = await response.json();
    console.log(result)
  }
  // Creating a Blob for having a csv file format
  // and passing the data with type
//  let csvcontent = "data:text/csv;charset=utf-8," + data['reftimes'];
//  var encodedUri = encodeURI(csvcontent);
//   var link = document.createElement("a");
//   link.setAttribute("href", encodedUri);
//   link.setAttribute("download", "reference_laptimes.csv");
//   // link.setAttribute("target", "_blank")
//   document.body.appendChild(link); // Required for FF

// link.click(); // This will download the data file named "my_data.csv".
}