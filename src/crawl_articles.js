/*
###############################################################################
IMPORTS
###############################################################################
*/
const puppeteer = require('puppeteer')
const fs = require('fs')


/*
###############################################################################
HELPER FUNCIONS
###############################################################################
*/

/*
* Checks if a startingpage and a number of total pages was provided and provides execution help
* @param {int} argLength
* @return {Boolean} false
*/
async function validateInput(argLength) {
    if (argLength != 4) {
        console.log("########\nHELP\n########\n")
        console.log("To execute this script, provide a startingpage and the number of total pages you would like to examine.\n")
        console.log("Example call:\nnode crawl_articles.js https://www.nature.com/nature/articles?type=article 367")
        return(false)
    }
}

/*
* Evaluates the page information and return an array of all article links that can be found on the current page
* @param {String} page
* @return {Array} articleInfo
*/
async function collectData(page){
    let articleInfo = await page.evaluate(() => {
        let articleInfo = []
        let articleList = document.querySelectorAll("h3[itemprop='name headline'] a")
        for (article of articleList) {
            articleInfo.push(article.href)
        }
        return(articleInfo)
    })

    return(articleInfo)
}

/*
* Writes collected data to file
* @param {Array} data
* @return {}
*/
function writeData(data) {
    console.log("\nWriting output files...")

    // Check that output folder exists
    let path =  "../data/output_crawl_articles"
    if (!fs.existsSync(path)){
        fs.mkdirSync("path");
    }
    // Writes data to file
    fs.writeFile(path + "/data.txt", data.join('\n'), 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing the data to file.");
            return console.log(err);
        }
        console.log("Data file has been saved: " + path + "/data.txt");
    })
 }



/*
--------------------------------------------------------------------------------
MAIN
--------------------------------------------------------------------------------
*/


(async () => {

    await validateInput(process.argv.length)
    const startingpage = process.argv[2]
    const nrPages = process.argv[3]

    // Launches the Chromium browser in the background
    console.log("Launching browser...\n")
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto(startingpage);

    // Data contains the gathered article information.
    let data =  []

    for (let i = 0; i < nrPages; i++) {
        try {
            articleInfo = await collectData(page)
            data = data.concat(articleInfo)
            console.log("- [SUCCESS]: page " + (i+1))

            // Click the next button
            await page.evaluate(() => {
                document.querySelector(".inline-group-item[data-page='next'] a").click()
            })
            await page.waitForNavigation();
        }
        catch (e) {
            console.log("- [ERROR]: page " + (i+1))
        }
    }

    // Writes the gathered article data and the failures to separate files..
    writeData(data)

     // Closes the browser window which was opened by the programm.
     await browser.close();

})()
