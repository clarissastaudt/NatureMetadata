/*
###############################################################################
IMPORTS
###############################################################################
*/
const fs = require('fs')


/*
###############################################################################
HELPER FUNCIONS
###############################################################################
*/

/*
* Checks if a file path was provided and provides execution help
* @param {int} argLength
* @return {Boolean} false
*/
async function validateInput(argLength) {
    if (argLength != 3) {
        console.log("########\nHELP\n########\n")
        console.log("To execute this script, provide a path to a JSON file containing the gathered Nature data.\n")
        console.log("Example call:\nnode create_csv.js ../data/output_crawl_article_info/data_try123.json")
        return(false)
    }
}

/*
* Reads and parses info from provided file path
* @param {String} path
* @return {Object} articleInfo
*/
function readInput(path) {
    console.log("Reading input file with article information...")
    let articleInfo = fs.readFileSync(path, 'utf8');
    return(JSON.parse(articleInfo))
}

/*
* Takes input data, calculate publication time spans and creates an array containing completed article infos
* @param {Object} articleInfo
* @return {Array} data
*/
function processData(articleInfo) {
    console.log("\nProcessing data...")

    let data = []

    for (article of articleInfo) {

        let received = getMonthYear("received")
        let accepted = getMonthYear("accepted")
        let published = getMonthYear("published")
        let issued = getMonthYear("issued")

        // array containing the time distances between publishing steps
        let timeVec = calcFeatures(article)
        let infos = [article.title, article.doi, received[0], received[1], accepted[0], accepted[1], published[0], published[1], issued[0], issued[1], timeVec[0], timeVec[1], timeVec[2]]
        data.push(infos)
    }
    return(data)
}

/*
 * Calculates the difference between two dates in days.
 * If the difference is negative it is assumed that the given values were incorrect and a time difference of zero days is returned.
 * @param {Date} a
 * @param {Date} b
 * @return {int}
*/
function dateDifInDays(a, b) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())

    let diff = Math.floor((utc2 - utc1) / _MS_PER_DAY)
    // Occures when e.g. month of issuing is known
    // Published:: March 15, issued March -> diff = -15
    if (diff < 0) {
      return(0)
    }
    else {
      return(diff)
    }
}

/*
* Calculates time difference features for an article, indicating the number of days between publication steps.
* @param {article Object} article
* @return {Array}
*/
function calcFeatures(article) {
    let received = 0
    let accepted = 0
    let published = 0
    let issuedate = 0

    // Check if values were found and convert to Date if possible
    if (article.time.received != "") {
        received = new Date(article.time.received)
    }
    if (article.time.accepted != "") {
        accepted = new Date(article.time.accepted)
    }
    if (article.time.published != "") {
        published = new Date(article.time.published)
    }
    if (article.time.issuedate != ""){
        issuedate = new Date(article.time.issuedate)
    }

    let diff1 = null
    let diff2 = null
    let diff3 = null

    // Calc day differences if values exist
    if (received != 0 && accepted != 0) {
        diff1 = dateDifInDays(received, accepted)
    }
    if (accepted != 0 && published != 0) {
         diff2 = dateDifInDays(accepted, published)
    }
    if (published != 0 && issuedate != 0) {
        diff3 = dateDifInDays(published, issuedate)
    }

    return([diff1, diff2, diff3])
}

/*
* Extracts month and year from dataset for a given date type
* *@param {String} dateType
* @return {Array}
*/
function getMonthYear(dateType) {
    let date = []
    let month = ""
    let year =  ""

    if (dateType == "received") {
        date = article.time.received.split(' ')
    }
    else if (dateType == "accepted") {
        date = article.time.accepted.split(' ')
    }
    else if (dateType == "published") {
        date = article.time.published.split(' ')
    }
    else if (dateType == "issued") {
        date = article.time.issuedate.split(' ')
    }

    if (date.length == 3){
        month = date[1]
        year = date[2]
    }
    else if (date.length == 2) {
        month = date[0]
        year = date[1]
    }

    return([month, year])
}

/*
* Writes collected data to file
* @param {Array} data
* @return {}
*/
function writeData(data) {
    console.log("\nWriting processed data to output file...")
    let csvContent = "title;doi;received month;received year;accepted month;accepted year;published month;published year;issued month;issued year;received - accepted;accepted - published;published - issued\n"
    data.forEach(function(article) {
        let row = article.join(";")
        csvContent += row +  "\n"
    });


    // Check that output folder exists
    if (!fs.existsSync("../data/output_create_csv")){
        fs.mkdirSync("../data/output_create_csv");
    }
    fs.writeFile("../data/output_create_csv/data.csv",  csvContent, 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing the data to file.");
            return console.log(err);
        }
        console.log("File has been saved.");
    })
 }


/*
###############################################################################
MAIN
###############################################################################
*/

/*
* Reads data from input file, processes data and creates a csv from it.
* @param {}
* @return {}
*/
(async function () {

    await validateInput(process.argv.length)
    let articleInfo = await readInput(process.argv[2])
    let data = processData(articleInfo)
    writeData(data)

})()
