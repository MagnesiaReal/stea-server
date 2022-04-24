express = require('express');
bodyParser = require('body-parser');
mysql = require('mysql');
cors =  require('cors');
userRouter = require('./routes/user');
userInfoRoutes = require('./routes/userInfo');
groups = require('./routes/groups');
uuid = require('uuid');

logger = require('simple-node-logger').createSimpleLogger('./magnecia_logs/server.log');

logger.info("Trying to start server");

const port = 80;

conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1204",
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
app.use('/routes', userRouter);
app.use('/routes', userInfoRoutes);
app.use('/routes', groups);

//ruta estatica
app.use(express.static('/home/magneciareal/Desktop/stea_data'));

app.get('/', (req, res) => {
  res.json({mensaje : "Bienvenido al servidor Franchesco Virgoliniiiiiii!!!!!!!!! FIIIUUUM"});
  console.log("SomeOne Enter to Franchesco FIIIIIUUUUUUUUMMMMMMMMMM");
  console.log(req.body);
});

app.listen(port, ()=>{
  logger.warn("simple warn alv");
  logger.info("Server alredy up to listen any request");
});
