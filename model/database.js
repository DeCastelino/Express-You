const mysql = require('mysql')
const dotenv = require('dotenv')

// Load config file
dotenv.config({ path: './config/.env' })

var connection = mysql.createConnection({
    host     : process.env.RDS_HOSTNAME,
    user     : process.env.RDS_USERNAME,
    password : process.env.RDS_PASSWORD,
    port     : process.env.RDS_PORT,
    database : 'userDB'
  });
  
  connection.connect((err) => {
    if (err) {
      console.error('Database connection failed: ' + err.stack);
      return;
    }
  
    console.log('Connected to database.');
  });
  
  connection.query('CREATE TABLE IF NOT EXISTS Users (`UserID` int NOT NULL AUTO_INCREMENT, `FirstName` varchar(50) NOT NULL, `LastName` varchar(50) NOT NULL, `Email` varchar(50), `Password` varchar(50), PRIMARY KEY (`UserID`))', (error, results, fields) => {
      if (error) {
          console.error('Query Failed: ' + error.stack);
      }
      else {
          console.log('Table successfully created');
      }
  })

  //connection.end();

module.exports = connection