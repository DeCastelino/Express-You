const express = require('express')
const dotenv = require('dotenv')
const { render } = require('ejs')
const connection = require('./model/database')
const { connect } = require('./model/database')
const AWS = require('aws-sdk')
const path = require('path')
const WebSocket = require('ws')
const cors = require('cors')
const bodyParser = require('body-parser')
const SpotifyWebApi = require('spotify-web-api-node')

// Load config file
dotenv.config({ path: './config/.env' })

const app = express()

app.set('view engine', 'ejs')
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

//takes the url encoded data and passes that into an oject we can use with the req when doing form data stuff 
app.use(express.urlencoded({ extended: true }));

// Set DynamoDB config
const awsconfig = {
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

// Set config
AWS.config.update(awsconfig);

var docClient = new AWS.DynamoDB.DocumentClient();
const dynamoDB = new AWS.DynamoDB();

// root will rediect to login page
app.get('/', (req, res) => {
    res.redirect('app-login')
})

app.get('/app-login', (req, res) => {
    res.render('login.ejs', { error: false })
})

// checking login credentials
app.post('/app-login', async (req, res) => {
    const query = 'SELECT FirstName FROM Users WHERE `Email` = ? AND `Password` = ?'
    const values = [req.body.email, req.body.password]
    await connection.query(query, values, (error, results, fields) => {

        if (error) {
            console.error('Error while fetching data from database: ' + error.stack);
        }
        if (results != '') {
            console.log('Fetching data successful');
            res.redirect('dashboard')
        }
        else {
            res.render('login.ejs', { error: true })
        }
    })
})

// render register page
app.get('/register', (req, res) => {
    res.render('register.ejs')
})

app.post('/register', async (req, res) => {
    const query = 'INSERT INTO Users (`FirstName`, `LastName`, `Email`, `Password`) VALUES (?, ?, ?, ?)'
    const values = [req.body.firstname, req.body.surname, req.body.email, req.body.password]
    await connection.query(query, values, (error, results, fields) => {
        if (error) {
            console.error('Error while adding into table: ' + error.stack);
        }
        else {
            console.log('User data entered successfully!');
            res.redirect('app-login')
        }
    })
})

app.get('/dashboard', (req, res) => {

    // setting parameters to retreive all posts available
    var params = {
        TableName: 'user-post'
    }

    docClient.scan(params, (err, data) => {
        if (err) {
            console.error('Unable to retrieve post from database: ' + err.stack);
        }
        else {
            console.log('Post retreival successful!');
            console.log(data);
            res.render('dashboard.ejs', { posts: data })
        }
    })
})

app.post('/addPost', (req, res) => {
    // setting parameters to add post to database
    var today = new Date();
    var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' (' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds() + ')';
    var params = {
        TableName: 'user-post',
        Item: {
            title: req.body.title,
            body: req.body.body,
            timestamp: date
        }
    }

    // adding post to database
    docClient.put(params, (err, data) => {
        if (err) {
            console.log('Unable to add post to the database')
        }
        else {
            console.log('Post upload success!')
            res.redirect('dashboard')   // redirecting to dashboard to see newly added post as well
        }
    })
})

app.get('/chat', (req, res) => {
    const wsURL = process.env.WS_URL
    const ws = new WebSocket(wsURL)     // connecting to web socket
    res.render('chat.ejs', { messages: '' })

})


//----------Spotify Routes-----------
app.post("/refresh", (req, res) => {
    const refreshToken = req.body.refreshToken
    const spotifyApi = new SpotifyWebApi({
        redirectUri: process.env.REDIRECT_URI,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken,
    })

    spotifyApi
        .refreshAccessToken()
        .then(data => {
            res.json({
                accessToken: data.body.accessToken,
                expiresIn: data.body.expiresIn,
            })
        })
        .catch(err => {
            console.log(err)
            res.sendStatus(400)
        })
})

app.post("/login", (req, res) => {
    const code = req.body.code
    const spotifyApi = new SpotifyWebApi({
        redirectUri: process.env.REDIRECT_URI,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
    })

    spotifyApi
        .authorizationCodeGrant(code)
        .then(data => {
            res.json({
                accessToken: data.body.access_token,
                refreshToken: data.body.refresh_token,
                expiresIn: data.body.expires_in,
            })
        })
        .catch(err => {
            res.sendStatus(400)
        })
})

app.get("/lyrics", async (req, res) => {
    const lyrics =
        (await lyricsFinder(req.query.artist, req.query.track)) || "No Lyrics Found"
    res.json({ lyrics })
})

app.use(express.static(path.join(__dirname, 'public')))

app.listen(process.env.PORT, () => {
    console.log(`Server running on port http://localhost:${process.env.PORT}`)
})