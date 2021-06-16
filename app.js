const express = require('express')
const dotenv = require('dotenv')
const { render } = require('ejs')
const connection = require('./model/database')
const { connect } = require('./model/database')
const AWS = require('aws-sdk')
const path = require('path')

// Load config file
dotenv.config({ path: './config/.env' })

const app = express()

app.set('view engine', 'ejs')

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
    res.redirect('login')
})

app.get('/login', (req, res) => {
    res.render('login.ejs', { error: false })
})

// checking login credentials
app.post('/login', async (req,res) => {
    const query = 'SELECT FirstName FROM Users WHERE `Email` = ? AND `Password` = ?'
    const values = [req.body.email, req.body.password]
    await connection.query(query, values, (error, results, fields) => {

        if (error) {
            console.error('Error while fetching data from database: ' + error.stack);
        }
        if(results != '') {
            console.log('Fetching data successful');
            res.redirect('dashboard')
        }
        else {
            res.render('login.ejs', { error: true })
        }
    })
})

// render register page
app.get('/register', (req,res) => {
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
            res.redirect('login')
        }
    })
})

app.get('/dashboard', (req, res) => {
    
    // setting parameters to retreive all posts available
    var params = {
        TableName: 'user-post',
        // FilterExpression: '#title = :title',
        // ExpressionAttributeNames: {
        //     '#title': 'title',
        // },
        // ExpressionAttributeValues: {
        //     ':title': 'title'
        // }
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
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()+' ('+today.getHours()+':'+today.getMinutes()+':'+today.getSeconds()+')';
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

app.use(express.static(path.join(__dirname, 'public')))

app.listen(process.env.PORT, () => {
    console.log(`Server running on port http://localhost:${process.env.PORT}`)
})