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
* Checks if a path was provided and provides execution help
* @param {int} argLength
* @return {Boolean} false
*/
async function validateInput(argLength) {
    if (argLength != 3) {
        console.log("########\nHELP\n########\n")
        console.log("To execute this script, provide a path to an input file.\n")
        console.log("Example call:\nnode crawl_article_info.js ../data/output_crawl_articles/data.txt\n")
        return(false)
    }
}

/*
* Reads input file
* @param {String} articlePath
* @return {Array} articles
*/
async function readInput(articlePath) {
    let articles = fs.readFileSync(articlePath, 'utf8');
    articles = articles.replace(/\r/g, "")
    articles = articles.split('\n')
    return (articles)
}

// TODO: Refactoring needed!
/*
* Collects title, doi and publication info from a given article link
* @param {String} article
* @param {puppeteer page} page
* @return {Object} articleInfo
*/
async function collectData(article, page){
    await page.goto(article);

    let articleInfo = await page.evaluate((article) => {
        let articleInfo =  ""
        let title = ""
        let received = ""
        let accepted = ""
        let published = ""
        let issuedate = ""
        let doi = ""

        // New Nature layout and classes
        try {
            title = document.querySelector(".c-article-title").innerText

            let infos = document.querySelectorAll(".c-bibliographic-information div ul li.c-bibliographic-information__list-item")

            for (el of infos){
            	if(el.querySelector("h4").innerText == "Received") {
                    received = el.querySelector(".c-bibliographic-information__value time").innerHTML
                }
                else if (el.querySelector("h4").innerText == "Accepted") {
                    accepted = el.querySelector(".c-bibliographic-information__value time").innerHTML
                }
                else if (el.querySelector("h4").innerText == "Published") {
                    published = el.querySelector(".c-bibliographic-information__value time").innerHTML
                }
                else if (el.querySelector("h4").innerText == "Issue Date") {
                    issuedate = el.querySelector(".c-bibliographic-information__value time").innerHTML
                }
                else if (el.querySelector("h4").innerText == "DOI") {
                    doi = el.querySelector(".c-bibliographic-information__value a").href
                }
            }
        }
        catch {
            // Try Nature layout for older articles
            try {
                title = document.querySelector("h1[itemprop='name headline']").innerHTML

                let infos = document.querySelectorAll("#article-info-content .grid div")
                for (el of infos){
                	if(el.querySelector("h4").innerText == "Received") {
                        received = el.querySelector("p time").innerHTML
                    }
                    else if (el.querySelector("h4").innerText == "Accepted") {
                        accepted = el.querySelector("p time").innerHTML
                    }
                    else if (el.querySelector("h4").innerText == "Published") {
                        published = el.querySelector("p time").innerHTML
                    }
                    else if (el.querySelector("h4").innerText == "Issue Date") {
                        issuedate = el.querySelector("p time").innerHTML
                    }
                }
                // Check if DOI exists
                try {
                    if (document.querySelector("#article-info-content h3.strong.mb4 abbr").innerText == "DOI") {
                        doi = document.querySelector("#article-info-content p.standard-space-below.text14 a").href
                    }
                }
                catch {
                    doi = ""
                }
            }
            catch {
                throw new Error();
            }
        }


        articleInfo =  {
            title: title,
            link: article,
            doi: doi,
            time: {
                received: received,
                accepted: accepted,
                published: published,
                issuedate: issuedate
            }
        }
        return(articleInfo)
    })

    return(articleInfo)
}

/*
* Logs stats for success and failure rate
* @param {Array} data
* @param {Array} failures
* @param {Aray} articles
* @return {}
*/
function logStats(data, failures, articles) {
    console.log("\nOverview:")
    console.log("- " + (articles.length - failures.length) + "/" + articles.length + " successful.")
    console.log("- " + failures.length + "/" + articles.length + " failed.")
}

/*
* Writes collected data to file
* @param {Array} data
* @return {}
*/
function writeData(data) {
    // Check that output folder exists
    if (!fs.existsSync("../data")){
        fs.mkdirSync("../data");
    }
    if (!fs.existsSync("../data/output_crawl_article_info")){
        fs.mkdirSync("../data/output_crawl_article_info");
    }
    fs.writeFile("../data/output_crawl_article_info/data.json", JSON.stringify(data), 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing the data to file.");
            return console.log(err);
        }
        console.log("- Data file has been saved.");
    })
 }

 /*
 * Writes list of failed pages to file
 * @param {Array} failures
 * @return {}
 */
function writeErrors(failures) {
    // Check that output folder exists
    if (!fs.existsSync("../data")){
        fs.mkdirSync("../data");
    }
    if (!fs.existsSync("../data/output_crawl_article_info")){
        fs.mkdirSync("../data/output_crawl_article_info");
    }
    fs.writeFile("../data/output_crawl_article_info/errors.txt", failures.join("\n"), 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing the errors to file.");
            return console.log(err);
        }
        console.log("- Error file has been saved.");
    })
 }


 /*
 ###############################################################################
 MAIN
 ###############################################################################
 */


(async () => {

    await validateInput(process.argv.length)
    let articles = await readInput(process.argv[2])

    console.log("Launching browser...\n")
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();

    // Data stores the gathered article information.
    let data =  []
    // Failures stores the failed links from which no article information could be gathered.
    let failures = []

    console.log("Collecting article information for:")
    for (article of articles) {
        try {
            articleInfo = await collectData(article, page)
            data.push(articleInfo)
            console.log("- [SUCCESS]: " + articleInfo.title)
        }
        catch (e) {
            failures.push(article)
            console.log("- [ERROR]: " + article)
        }
    }

    logStats(data, failures, articles)

     console.log("\nWriting output files...")
     writeData(data)
     writeErrors(failures)

     await browser.close();

})()
