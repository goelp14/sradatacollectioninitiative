const scrape = document.getElementById("scrape");
console.log("reached");
scrape.addEventListener("click", async (e) => {
  e.preventDefault();
  console.log("clicked");
  var T = document.getElementById("status");
  T.innerHTML = "<p>Preparing Data...</p>"
  T.style.display = "block";  // <-- Set it to block
  const dataprocessed = await getData();
  console.log(dataprocessed['dataprocessed'])
  if (dataprocessed['dataprocessed'] == true) {
    await download();
  }
  
});

async function getData() {
  const response = await fetch("/hotlapdata");
  console.log(response);
  //returns a promise so we need to convert it json
  const data = await response.json();
  console.log(data['dataprocessed']);
  var T = document.getElementById("status");
  T.innerHTML = "<p>Finished Collecting Data. Preparing Download Link...</p>"
  // let zip = new JSZip();
  // const zipobj = await data['dataprocessed'];
  // zip = zipobj;
  // zip.generateAsync({type:"blob"}).then(function (blob) { // 1) generate the zip file
  //   saveAs(blob, "hotlap_data.zip");                          // 2) trigger the download
  // });
  return data;
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

async function download(){
  console.log('downloading file');
  var T = document.getElementById("status");
  let url = window.location.host + '/download';
  T.innerHTML = `<a href='https://${url}'>Download Hotlap Data!</a>`
  // let url = window.location.host + '/download';
  // console.log(url);
  // window.open(url);
  // await fetch("/download");
  // const result = await response.json();
  // console.log(result)
}