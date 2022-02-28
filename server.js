express = require('express');
bodyParser = require('body-parser');
mysql = require('mysql');
cors =  require('cors');
console.log("Hello to STEA server");
userRouter = require('./routes/user');

const port = 50000;

conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1204",
  database: "steadb",
  multipleStatements: true
});

conn.connect((err) => {
  if (err) throw err;
  console.log("Connected");
})

app = express();
app.use(express.json()); // Parser data as Json
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use('/routers', userRouter);

app.get('/', (req, res) => {
  res.json({mensaje : "Bienvenido al servidor Franchesco Virgoliniiiiiii!!!!!!!!! FIIIUUUM"});
  console.log("SomeOne Enter to server");
});

app.listen(port, ()=>{
  console.log("Server already up to listen any request");
});
