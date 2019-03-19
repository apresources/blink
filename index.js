const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = '/usr/src/secrets/token.json';

// Load client secrets from a local file.
fs.readFile('/usr/src/secrets/credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Calendar API.
  authorize(JSON.parse(content), mainLoop);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.googleapi.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, credentials.blink);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function mainLoop(auth, blinkCreds) {
  
  try {
    let datesToExclude = await getEvents(auth);
    await activateCamera(blinkCreds, datesToExclude);
  }
  catch(err) {
    console.log('ERROR: ' + err);
  }

}

function activateCamera(blinkCreds, datesToExclude) {
  return new Promise((resolve, reject) => {
    const Blink = require('node-blink-security');
    var blink = new Blink(blinkCreds.email, blinkCreds.password);
    blink.setupSystem()
          .then(() => {
            //var dateNow = new Date('2019-03-10 19:00:01');
            var dateNow = new Date();
            // Assume it is being turned on
            var camOn = true;
            for (var i = 0; i < datesToExclude.length; i++)
            {
                // Turn off during holidays
                if (dateNow >= datesToExclude[i].startDate && dateNow >= datesToExclude[i].startDate)
                {
                  console.log('Is holiday');
                  camOn = false;
                  break;
                }
            }
            // Turn off during weekends
            if (dateNow.getDay() == 0 || dateNow.getDay() == 6) {
              console.log('Is weekend');
              camOn = false;
            }

            // BUT we should turn it on at night
            var startTime = '07:00:00';
            var endTime = '19:00:00';

            startDate = new Date(dateNow.getTime());
            startDate.setHours(startTime.split(":")[0]);
            startDate.setMinutes(startTime.split(":")[1]);
            startDate.setSeconds(startTime.split(":")[2]);

            endDate = new Date(dateNow.getTime());
            endDate.setHours(endTime.split(":")[0]);
            endDate.setMinutes(endTime.split(":")[1]);
            endDate.setSeconds(endTime.split(":")[2]);

            var dayTime = startDate < dateNow && endDate > dateNow;
            if (dayTime) {
              console.log('Is daytime');
            }
            else {
              console.log('Is nighttime');
              camOn = true;
            }

            Object.keys(blink.idTable).forEach(cameraId => {
              let cameraName = blink.idTable[cameraId];
              if (cameraName == 'Outside') {
                let camera = blink.cameras[cameraId];
                console.log('Turning camera ' + (camOn ? 'on': 'off'));
                camera.setMotionDetect(true);
              }
            });
          }, (error) => {
            reject(error);
          });
  });
}

function getEvents(auth) {
  return new Promise((resolve, reject) => {  
    
    const calendar = google.calendar({version: 'v3', auth});
    var datesToExclude = [];

    // Get School holidays
    calendar.events.list({
      calendarId: 'ia3cdif7vr2o66n4umlo4rqj1o@group.calendar.google.com', // uk__en@holiday.calendar.google.com
      timeMin: (new Date()).toISOString(),
      singleEvents: true,
      maxResults: 10,
      orderBy: 'startTime',
    }, (err, res) => {
      if (err) reject('The API returned an error: ' + err);
      const events = res.data.items;
      if (events.length) {
        events.map((event, i) => {
          const start = event.start.dateTime || event.start.date;
          const end = event.end.dateTime || event.end.date;
          //console.log(event);
          datesToExclude.push({startDate: new Date(start), endDate: new Date(end)});
        });
      }

      // Now get UK holdays
      calendar.events.list({
        calendarId: 'uk__en@holiday.calendar.google.com',
        timeMin: (new Date()).toISOString(),
        singleEvents: true,
        maxResults: 10,
        orderBy: 'startTime',
      }, (err, res) => {
        if (err) reject('The API returned an error: ' + err);
        const events = res.data.items;
        if (events.length) {
          events.map((event, i) => {
            const start = event.start.dateTime || event.start.date;
            const end = event.end.dateTime || event.end.date;
            if (event.summary.toLowerCase().indexOf('wales') < 0
            && event.summary.toLowerCase().indexOf('scotland') < 0
            && event.summary.toLowerCase().indexOf('ireland') < 0
            && event.summary.toLowerCase().indexOf('george') < 0
            && event.summary.toLowerCase().indexOf('guy fawkes') < 0
            && event.summary.toLowerCase().indexOf('halloween') < 0
            && event.summary.toLowerCase().indexOf('birthday') < 0) {
              datesToExclude.push({startDate: new Date(start), endDate: new Date(end)});
            }
          });
        }
        resolve(datesToExclude);
      }); 
    });
  });
}