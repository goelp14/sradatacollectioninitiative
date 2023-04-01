const scrape = document.getElementById("scrape");
console.log("reached");
scrape.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("clicked");
  getData();
});

async function getData() {
  const response = await fetch("/price");

  //returns a promise so we need to convert it json
  const data = await response.json();
  console.log(data);
}