express = require('express');
bodyParser = require('body-parser');
mysql = require('mysql');
cors =  require('cors');
uuid = require('uuid');
logger = require('simple-node-logger').createSimpleLogger('./magnecia_logs/server.log');

userRouter = require('./routes/user');
userInfoRoutes = require('./routes/userInfo');
groups = require('./routes/groups');
configGroups = require('./routes/configGroups');
userActivities = require('./routes/activities');


logger.info("Trying to start server");

const port = 80;

conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  port: 3307,
  password: "root",
  database: "SteaDB",
  multipleStatements: true
});

conn.connect((err) => {
  if (err) throw err;
  console.log("Connected");
});

app = express();
app.use(express.json()); // Parser data as Json
app.use(express.urlencoded({extended: true}));
app.use(cors());

//ruta estatica
app.use(express.static('C:/Users/XMX5929/Desktop/stea_data'));

app.use('/user', userRouter);
app.use('/userinfo', userInfoRoutes);
app.use('/group', groups);
app.use('/groupconf', configGroups);
app.use('/activity', userActivities);



app.get('/', (req, res) => {
  res.json({mensaje : "Bienvenido al servidor Franchesco Virgoliniiiiiii!!!!!!!!! FIIIUUUM"});
  console.log("SomeOne Enter to Franchesco FIIIIIUUUUUUUUMMMMMMMMMM");
  console.log(req.body);
});

app.listen(port, ()=>{
  logger.warn("simple warn alv");
  logger.info("Server alredy up to listen any request");
});
